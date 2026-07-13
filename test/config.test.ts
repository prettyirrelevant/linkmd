import { FileSystem } from "@effect/platform"
import { BunContext } from "@effect/platform-bun"
import { expect, it } from "@effect/vitest"
import { Effect, Exit, Redacted } from "effect"

import { decodeConfig, defaultConfig, resolveToken, saveConfig } from "../src/config.js"
import { Invocation } from "../src/invocation.js"
import { ProviderName } from "../src/provider.js"

const invocationWith = (env: Readonly<Record<string, string | undefined>>) => ({
  stdinIsTTY: false,
  stderrIsTTY: false,
  platform: "linux" as const,
  env,
  readStdin: Effect.succeed("")
})

it.effect("decodes the versioned config", () =>
  decodeConfig(defaultConfig).pipe(
    Effect.map((config) => expect(config).toEqual(defaultConfig))
  ))

it.effect("rejects unsupported config versions", () =>
  decodeConfig({ ...defaultConfig, version: 2 }).pipe(
    Effect.exit,
    Effect.map((exit) => expect(Exit.isFailure(exit)).toBe(true))
  ))

it.effect("rejects unknown config fields", () =>
  decodeConfig({ ...defaultConfig, unexpected: true }).pipe(
    Effect.exit,
    Effect.map((exit) => expect(Exit.isFailure(exit)).toBe(true))
  ))

it.effect("prefers an environment token to a saved token", () =>
  resolveToken(ProviderName.Gist, {
    ...defaultConfig,
    providers: {
      ...defaultConfig.providers,
      gist: { ...defaultConfig.providers.gist, token: "saved" }
    }
  }).pipe(
    Effect.provideService(Invocation, Invocation.make(invocationWith({ GITHUB_TOKEN: "environment" }))),
    Effect.map((token) => expect(Redacted.value(token)).toBe("environment"))
  ))

it.scoped("writes config with restricted permissions", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const home = yield* fs.makeTempDirectoryScoped({ prefix: "linkmd-test-" })
    const invocation = Invocation.make(invocationWith({ HOME: home }))

    yield* saveConfig(defaultConfig).pipe(Effect.provideService(Invocation, invocation))

    const file = `${home}/.config/linkmd/config.toml`
    const contents = yield* fs.readFileString(file)
    const info = yield* fs.stat(file)
    expect(contents).toContain("version = 1")
    expect(info.mode & 0o777).toBe(0o600)
  }).pipe(
    Effect.provide(BunContext.layer)
  ))
