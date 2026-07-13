import { Effect } from "effect"

import { InputError } from "./errors.js"

export class Invocation extends Effect.Service<Invocation>()("linkmd/Invocation", {
  sync: () => ({
    stdinIsTTY: Boolean(process.stdin.isTTY),
    stderrIsTTY: Boolean(process.stderr.isTTY),
    platform: process.platform,
    env: process.env as Readonly<Record<string, string | undefined>>,
    readStdin: Effect.tryPromise({
      try: () => Bun.stdin.text(),
      catch: (cause) => new InputError({
        message: "Could not read Markdown from stdin.",
        cause
      })
    })
  })
}) {}
