import { Console, Effect, Option } from "effect"

import { copyToClipboard } from "./clipboard.js"
import { loadConfig, resolveToken } from "./config.js"
import { UsageError } from "./errors.js"
import { readDocument } from "./input.js"
import { Invocation } from "./invocation.js"
import { renderResult, sanitizeForTerminal } from "./output.js"
import { publishGist } from "./providers/gist.js"
import { publishHackMd } from "./providers/hackmd.js"
import { publishPaste } from "./providers/paste-rs.js"

export type ProviderName = "gist" | "hackmd" | "paste.rs"

export interface PublishOptions {
  readonly file: Option.Option<string>
  readonly title: Option.Option<string>
  readonly copy: boolean
  readonly noCopy: boolean
  readonly json: boolean
}

export const publish = Effect.fn("publish")(
  function* (provider: ProviderName, options: PublishOptions) {
    if (options.copy && options.noCopy) {
      return yield* new UsageError({ message: "Use either --copy or --no-copy, not both." })
    }

    const invocation = yield* Invocation
    const needsConfig = provider !== "paste.rs" || (
      !options.noCopy && !options.json && invocation.stderrIsTTY
    )
    const config = needsConfig ? yield* loadConfig : undefined
    const document = yield* readDocument(options)
    yield* Option.match(document.warning, {
      onNone: () => Effect.void,
      onSome: (warning) => Console.warn(sanitizeForTerminal(warning))
    })

    let url: string
    if (provider === "paste.rs") {
      url = yield* publishPaste(document)
    } else {
      const authConfig = config ?? (yield* loadConfig)
      url = provider === "gist"
        ? yield* publishGist(document, yield* resolveToken("gist", authConfig))
        : yield* publishHackMd(document, yield* resolveToken("hackmd", authConfig))
    }
    const shouldCopy = options.copy || (
      !options.noCopy && !options.json && invocation.stderrIsTTY && (config?.copy ?? true)
    )

    if (!options.json) yield* Console.log(url)
    const copied = shouldCopy ? yield* copyToClipboard(url) : false
    if (options.json) {
      yield* Console.log(renderResult({ title: document.title, provider, url, copied }, true))
    } else if (invocation.stderrIsTTY) {
      const title = sanitizeForTerminal(document.title)
      yield* copied
        ? Console.error(`Published "${title}" to ${provider}; copied link.`)
        : shouldCopy
          ? Console.error(`Published "${title}" to ${provider}; could not copy link.`)
          : Console.error(`Published "${title}" to ${provider}.`)
    }
  }
)
