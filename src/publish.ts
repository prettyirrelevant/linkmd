import { Console, Effect, Option } from "effect"

import { copyToClipboard } from "./clipboard.js"
import { UsageError } from "./errors.js"
import { readDocument } from "./input.js"
import { Invocation } from "./invocation.js"
import { renderResult } from "./output.js"
import { publishPaste } from "./providers/paste-rs.js"

export interface PublishOptions {
  readonly file: Option.Option<string>
  readonly title: Option.Option<string>
  readonly copy: boolean
  readonly noCopy: boolean
  readonly json: boolean
}

export const publish = Effect.fn("publish")(
  function* (options: PublishOptions) {
    if (options.copy && options.noCopy) {
      return yield* new UsageError({ message: "Use either --copy or --no-copy, not both." })
    }

    const invocation = yield* Invocation
    const document = yield* readDocument(options)
    yield* Option.match(document.warning, {
      onNone: () => Effect.void,
      onSome: (warning) => Console.warn(warning)
    })

    const url = yield* publishPaste(document)
    const shouldCopy = options.copy || (!options.noCopy && invocation.stderrIsTTY)
    const copied = shouldCopy ? yield* copyToClipboard(url) : false
    const result = { title: document.title, provider: "paste.rs" as const, url, copied }

    yield* Console.log(renderResult(result, options.json))
    if (!options.json && invocation.stderrIsTTY) {
      yield* copied
        ? Console.error(`Published "${document.title}" to paste.rs; copied link.`)
        : shouldCopy
          ? Console.error(`Published "${document.title}" to paste.rs; could not copy link.`)
          : Console.error(`Published "${document.title}" to paste.rs.`)
    }
  }
)
