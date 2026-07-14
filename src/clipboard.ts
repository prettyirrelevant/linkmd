import { Command } from "@effect/platform"
import { Effect } from "effect"
import { Buffer } from "node:buffer"

import { Invocation } from "./invocation.js"

interface ClipboardCommand {
  readonly command: string
  readonly args: ReadonlyArray<string>
}

interface WindowsClipboardProcess {
  readonly exited: Promise<number>
  readonly exitCode: number | null
  readonly kill: () => void
}

export type WindowsClipboardSpawner = (
  command: ReadonlyArray<string>,
  input: Uint8Array
) => WindowsClipboardProcess

const windowsClipboardScript = `
$ErrorActionPreference = 'Stop'
try {
  $inputStream = [Console]::OpenStandardInput()
  $memoryStream = [System.IO.MemoryStream]::new()
  $inputStream.CopyTo($memoryStream)
  $utf8 = [System.Text.UTF8Encoding]::new($false, $true)
  $text = $utf8.GetString($memoryStream.ToArray())
  Set-Clipboard -Value $text -ErrorAction Stop
} catch {
  [Console]::Error.WriteLine('Failed to set clipboard: {0}', $_.Exception.Message)
  exit 1
}
`.trim()

const encodedWindowsClipboardScript = Buffer.from(windowsClipboardScript, "utf16le").toString("base64")

const spawnWindowsClipboard: WindowsClipboardSpawner = (command, input) => Bun.spawn([...command], {
  stdin: input,
  stdout: "ignore",
  stderr: "ignore",
  windowsHide: true
})

export const copyToWindowsClipboard = (
  value: string,
  systemRoot: string,
  spawn: WindowsClipboardSpawner = spawnWindowsClipboard
) => {
  if (value.includes("\0")) return Effect.succeed(false)

  const executable = `${systemRoot.replace(/[\\/]+$/, "")}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
  const command = [
    executable,
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-STA",
    "-EncodedCommand",
    encodedWindowsClipboardScript
  ]

  return Effect.acquireUseRelease(
    Effect.try(() => spawn(command, new TextEncoder().encode(value))),
    (process) => Effect.tryPromise(() => process.exited).pipe(
      Effect.map((code) => code === 0)
    ),
    (process) => Effect.try(() => {
      if (process.exitCode === null) process.kill()
    }).pipe(Effect.catchAll(() => Effect.void))
  ).pipe(
    Effect.timeout("2 seconds"),
    Effect.catchAll(() => Effect.succeed(false))
  )
}

export const copyToClipboard = Effect.fn("copyToClipboard")(
  function* (value: string) {
    const invocation = yield* Invocation
    if (invocation.platform === "win32") {
      const systemRoot = invocation.env.SystemRoot ?? invocation.env.SYSTEMROOT
      return systemRoot === undefined
        ? false
        : yield* copyToWindowsClipboard(value, systemRoot)
    }

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
