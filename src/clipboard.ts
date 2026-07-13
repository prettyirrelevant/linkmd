import { Command } from "@effect/platform"
import { Effect } from "effect"

import { Invocation } from "./invocation.js"

interface ClipboardCommand {
  readonly command: string
  readonly args: ReadonlyArray<string>
}

export const copyToClipboard = Effect.fn("copyToClipboard")(
  function* (value: string) {
    const invocation = yield* Invocation
    const candidates: ReadonlyArray<ClipboardCommand> = invocation.platform === "darwin"
      ? [{ command: "/usr/bin/pbcopy", args: [] }]
      : invocation.platform === "linux"
        ? [
          ...(invocation.env.WAYLAND_DISPLAY === undefined
            ? []
            : [{ command: "/usr/bin/wl-copy", args: [] }]),
          ...(invocation.env.DISPLAY === undefined
            ? []
            : [{ command: "/usr/bin/xsel", args: ["--clipboard", "--input"] }])
        ]
        : []

    const allowedEnvironment = [
      "PATH=/usr/bin:/bin",
      ...["DISPLAY", "WAYLAND_DISPLAY", "XDG_RUNTIME_DIR", "XAUTHORITY", "HOME", "DBUS_SESSION_BUS_ADDRESS"]
        .flatMap((name) => invocation.env[name] === undefined ? [] : [`${name}=${invocation.env[name]}`])
    ]

    for (const candidate of candidates) {
      const copied = yield* Command.make(
        "/usr/bin/env",
        "-i",
        ...allowedEnvironment,
        candidate.command,
        ...candidate.args
      ).pipe(
        Command.feed(value),
        Command.exitCode,
        Effect.map((code) => Number(code) === 0),
        Effect.timeout("2 seconds"),
        Effect.catchAll(() => Effect.succeed(false))
      )
      if (copied) return true
    }

    return false
  }
)
