import { Console, Effect, Option } from "effect"

import { copyToClipboard } from "./clipboard.js"
import { loadConfig, resolveToken } from "./config.js"
import { UsageError } from "./errors.js"
import { readDocument } from "./input.js"
import { Invocation } from "./invocation.js"
import { renderResult } from "./output.js"
import { publishGist } from "./providers/gist.js"
import { publishPaste } from "./providers/paste-rs.js"

export type ProviderName = "gist" | "paste.rs"

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
    const config = yield* loadConfig
    const document = yield* readDocument(options)
    yield* Option.match(document.warning, {
      onNone: () => Effect.void,
      onSome: (warning) => Console.warn(warning)
    })

    const url = provider === "paste.rs"
      ? yield* publishPaste(document)
      : yield* publishGist(document, yield* resolveToken("gist", config))
    const shouldCopy = options.copy || (!options.noCopy && (config.copy || invocation.stderrIsTTY))
    const copied = shouldCopy ? yield* copyToClipboard(url) : false
    const result = { title: document.title, provider, url, copied }

    yield* Console.log(renderResult(result, options.json))
    if (!options.json && invocation.stderrIsTTY) {
      yield* copied
        ? Console.error(`Published "${document.title}" to ${provider}; copied link.`)
        : shouldCopy
          ? Console.error(`Published "${document.title}" to ${provider}; could not copy link.`)
          : Console.error(`Published "${document.title}" to ${provider}.`)
    }
  }
)
