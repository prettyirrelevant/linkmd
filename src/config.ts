import { FileSystem, Path } from "@effect/platform"
import { Effect, Redacted, Schema } from "effect"
import { parse, stringify } from "smol-toml"

import { AuthError, ConfigError } from "./errors.js"
import { Invocation } from "./invocation.js"
import { ProviderName, providerLabel } from "./provider.js"

const TokenConfig = Schema.Struct({
  token_env: Schema.String,
  token: Schema.String
})

export const AppConfigSchema = Schema.Struct({
  version: Schema.Literal(1),
  copy: Schema.Boolean,
  providers: Schema.Struct({
    hackmd: TokenConfig,
    gist: TokenConfig
  })
})

export type AppConfig = typeof AppConfigSchema.Type
export type AuthenticatedProvider = ProviderName.Gist | ProviderName.HackMD

export const defaultConfig: AppConfig = {
  version: 1,
  copy: true,
  providers: {
    hackmd: { token_env: "HACKMD_TOKEN", token: "" },
    gist: { token_env: "GITHUB_TOKEN", token: "" }
  }
}

export const decodeConfig = (input: unknown) => Schema.decodeUnknown(AppConfigSchema, {
  errors: "all",
  onExcessProperty: "error"
})(input).pipe(
  Effect.mapError((cause) => new ConfigError({
    message: "The linkmd config file is invalid or uses an unsupported version.",
    cause
  }))
)

export const configPath = Effect.gen(function* () {
  const path = yield* Path.Path
  const invocation = yield* Invocation
  const home = invocation.env.HOME
  if (home === undefined || !path.isAbsolute(home)) {
    return yield* new ConfigError({ message: "HOME must be set to an absolute path." })
  }
  const configured = invocation.env.XDG_CONFIG_HOME
  const base = configured !== undefined && path.isAbsolute(configured)
    ? configured
    : path.join(home, ".config")
  return path.join(base, "linkmd", "config.toml")
})

export const loadConfig = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const file = yield* configPath
  const exists = yield* fs.exists(file).pipe(
    Effect.mapError((cause) => new ConfigError({ message: `Could not inspect config: ${file}`, cause }))
  )
  if (!exists) return defaultConfig

  const text = yield* fs.readFileString(file).pipe(
    Effect.mapError((cause) => new ConfigError({ message: `Could not read config: ${file}`, cause }))
  )
  const parsed = yield* Effect.try({
    try: () => parse(text),
    catch: (cause) => new ConfigError({ message: `Could not parse config: ${file}`, cause })
  })
  return yield* decodeConfig(parsed)
})

export const saveConfig = (config: AppConfig) => Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const file = yield* configPath
  const directory = path.dirname(file)
  const temporary = path.join(directory, `.config.${crypto.randomUUID()}.tmp`)
  const text = stringify(config)

  yield* fs.makeDirectory(directory, { recursive: true, mode: 0o700 }).pipe(
    Effect.mapError((cause) => new ConfigError({ message: `Could not create config directory: ${directory}`, cause }))
  )

  yield* fs.writeFileString(temporary, text, { mode: 0o600 }).pipe(
    Effect.andThen(fs.chmod(temporary, 0o600)),
    Effect.andThen(fs.rename(temporary, file)),
    Effect.ensuring(fs.remove(temporary, { force: true }).pipe(Effect.catchAll(() => Effect.void))),
    Effect.mapError((cause) => new ConfigError({ message: `Could not write config: ${file}`, cause }))
  )
})

export const resolveToken = (
  provider: AuthenticatedProvider,
  config: AppConfig
) => Effect.gen(function* () {
  const invocation = yield* Invocation
  const providerConfig = config.providers[provider]
  const environmentToken = invocation.env[providerConfig.token_env]?.trim()
  const savedToken = providerConfig.token.trim()
  const token = environmentToken !== undefined && environmentToken.length > 0
    ? environmentToken
    : savedToken

  if (token.length === 0) {
    return yield* new AuthError({
      message: `${providerLabel(provider)} needs an API token. Run linkmd init or set ${providerConfig.token_env}.`
    })
  }

  return Redacted.make(token)
})
