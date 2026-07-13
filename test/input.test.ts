import { FileSystem } from "@effect/platform"
import { BunContext } from "@effect/platform-bun"
import { expect, it } from "@effect/vitest"
import { Effect, Option } from "effect"

import { MAX_DOCUMENT_BYTES } from "../src/document.js"
import { readDocument } from "../src/input.js"
import { Invocation } from "../src/invocation.js"

const invocation = Invocation.make({
  stdinIsTTY: true,
  stderrIsTTY: true,
  platform: "darwin",
  env: { HOME: "/tmp" },
  readStdin: Effect.succeed("")
})

const readFile = (file: string) => readDocument({
  file: Option.some(file),
  title: Option.none()
}).pipe(Effect.provideService(Invocation, invocation))

it.scoped("rejects oversized files before reading them", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const directory = yield* fs.makeTempDirectoryScoped({ prefix: "linkmd-input-" })
    const file = `${directory}/large.md`
    yield* fs.writeFile(file, new Uint8Array(MAX_DOCUMENT_BYTES + 1))
    const error = yield* readFile(file).pipe(Effect.flip)
    expect(error._tag).toBe("InputError")
    expect(error.message).toContain("10 MiB")
  }).pipe(Effect.provide(BunContext.layer)))

it.effect("rejects dash-prefixed option typos as usage errors", () =>
  readFile("--josn").pipe(
    Effect.provide(BunContext.layer),
    Effect.flip,
    Effect.map((error) => expect(error._tag).toBe("UsageError"))
  ))

it.effect("reads explicit stdin even when stdin is a TTY", () => {
  const interactive = Invocation.make({
    ...invocation,
    readStdin: Effect.succeed("# Explicit stdin\n")
  })
  return readDocument({ file: Option.some("-"), title: Option.none() }).pipe(
    Effect.provide(BunContext.layer),
    Effect.provideService(Invocation, interactive),
    Effect.map((document) => expect(document.title).toBe("Explicit stdin"))
  )
})
