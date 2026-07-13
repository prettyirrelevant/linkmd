import { Prompt } from "@effect/cli"
import { Console, Effect, Redacted } from "effect"

import { loadConfig, saveConfig } from "./config.js"
import { Invocation } from "./invocation.js"

export const initialize = Effect.fn("initialize")(function* () {
  const invocation = yield* Invocation
  const config = yield* loadConfig

  yield* Console.log("linkmd can save API tokens as plain text in its user config.")

  let gistToken = config.providers.gist.token
  const envName = config.providers.gist.token_env
  if ((invocation.env[envName]?.trim().length ?? 0) > 0) {
    yield* Console.log(`${envName} is already set; no GitHub token will be saved.`)
  } else {
    const hasSavedToken = gistToken.trim().length > 0
    const replace = !hasSavedToken || (yield* Prompt.confirm({
      message: "Replace the saved GitHub token?",
      initial: false
    }))
    if (replace) {
      const entered = yield* Prompt.password({
        message: hasSavedToken
          ? "GitHub token with gist scope (leave blank to keep current)"
          : "GitHub token with gist scope (leave blank to skip)"
      })
      const value = Redacted.value(entered).trim()
      if (value.length > 0 || !hasSavedToken) gistToken = value
    }
  }

  const next = {
    ...config,
    providers: {
      ...config.providers,
      gist: { ...config.providers.gist, token: gistToken }
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
