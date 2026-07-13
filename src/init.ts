import { Prompt } from "@effect/cli"
import { Console, Effect, Redacted } from "effect"

import { loadConfig, saveConfig } from "./config.js"
import { Invocation } from "./invocation.js"

const promptForToken = Effect.fn("promptForToken")(function* (
  label: string,
  envName: string,
  savedToken: string,
  environmentToken: string | undefined
) {
  if ((environmentToken?.trim().length ?? 0) > 0) {
    yield* Console.log(`${envName} is already set; the saved ${label} credential will be left unchanged.`)
    return savedToken
  }

  const hasSavedToken = savedToken.trim().length > 0
  const replace = !hasSavedToken || (yield* Prompt.confirm({
    message: `Replace the saved ${label} token?`,
    initial: false
  }))
  if (!replace) return savedToken

  const entered = yield* Prompt.password({
    message: hasSavedToken
      ? `${label} token (leave blank to keep current)`
      : `${label} token (leave blank to skip)`
  })
  const value = Redacted.value(entered).trim()
  return value.length > 0 || !hasSavedToken ? value : savedToken
})

export const initialize = Effect.fn("initialize")(function* () {
  const invocation = yield* Invocation
  const config = yield* loadConfig

  yield* Console.log("linkmd can save API tokens as plain text in its user config.")

  const gist = config.providers.gist
  const hackmd = config.providers.hackmd
  const gistToken = yield* promptForToken(
    "GitHub",
    gist.token_env,
    gist.token,
    invocation.env[gist.token_env]
  )
  const hackmdToken = yield* promptForToken(
    "HackMD",
    hackmd.token_env,
    hackmd.token,
    invocation.env[hackmd.token_env]
  )

  const next = {
    ...config,
    providers: {
      ...config.providers,
      gist: { ...gist, token: gistToken },
      hackmd: { ...hackmd, token: hackmdToken }
    }
  }
  const confirmed = yield* Prompt.confirm({
    message: "Write linkmd config?",
    initial: true
  })
  if (!confirmed) {
    yield* Console.log("Config unchanged.")
    return
  }

  yield* saveConfig(next)
  yield* Console.log("Config saved.")
})
