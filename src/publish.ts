import { Console, Effect, Option } from "effect"

import { copyToClipboard } from "./clipboard.js"
import { loadConfig, resolveToken } from "./config.js"
import { UsageError } from "./errors.js"
import { readDocument } from "./input.js"
import { Invocation } from "./invocation.js"
import { renderResult, sanitizeForTerminal } from "./output.js"
import { ProviderName, providerLabel } from "./provider.js"
import { publishGist } from "./providers/gist.js"
import { publishHackMd } from "./providers/hackmd.js"
import { publishMdShareLive } from "./providers/mdshare-live.js"
import { publishMdShareOnline } from "./providers/mdshare.js"
import { publishPaste } from "./providers/paste-rs.js"

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
    const anonymous = provider === ProviderName.PasteRs ||
      provider === ProviderName.MdShareOnline ||
      provider === ProviderName.MdShareLive
    const needsConfig = !anonymous || (
      !options.noCopy && !options.json && invocation.stderrIsTTY
    )
    const config = needsConfig ? yield* loadConfig : undefined
    const document = yield* readDocument(options)
    yield* Option.match(document.warning, {
      onNone: () => Effect.void,
      onSome: (warning) => Console.warn(sanitizeForTerminal(warning))
    })

    let url: string
    if (provider === ProviderName.PasteRs) {
      url = yield* publishPaste(document)
    } else if (provider === ProviderName.MdShareOnline) {
      url = yield* publishMdShareOnline(document)
    } else if (provider === ProviderName.MdShareLive) {
      url = yield* publishMdShareLive(document)
    } else {
      const authConfig = config ?? (yield* loadConfig)
      url = provider === ProviderName.Gist
        ? yield* publishGist(document, yield* resolveToken(ProviderName.Gist, authConfig))
        : yield* publishHackMd(document, yield* resolveToken(ProviderName.HackMD, authConfig))
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
      const label = providerLabel(provider)
      yield* copied
        ? Console.error(`Published "${title}" to ${label}; copied link.`)
        : shouldCopy
          ? Console.error(`Published "${title}" to ${label}; could not copy link.`)
          : Console.error(`Published "${title}" to ${label}.`)
    }
  }
)
