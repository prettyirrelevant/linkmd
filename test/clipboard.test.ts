import { expect, it } from "@effect/vitest"
import { Effect } from "effect"

import { copyToWindowsClipboard, type WindowsClipboardSpawner } from "../src/clipboard.js"

it.effect("copies UTF-8 text through Windows PowerShell", () => {
  let capturedCommand: ReadonlyArray<string> = []
  let capturedInput: Uint8Array<ArrayBufferLike> = new Uint8Array()
  const spawn: WindowsClipboardSpawner = (command, input) => {
    capturedCommand = command
    capturedInput = input
    return { exited: Promise.resolve(0), exitCode: 0, kill: () => undefined }
  }

  return copyToWindowsClipboard("notes: café 中 🚀\n", "C:\\Windows\\", spawn).pipe(
    Effect.map((copied) => {
      expect(copied).toBe(true)
      expect(capturedCommand[0]).toBe("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe")
      expect(capturedCommand).toContain("-EncodedCommand")
      expect(new TextDecoder().decode(capturedInput)).toBe("notes: café 中 🚀\n")
    })
  )
})

it.effect("does not copy text containing a null character", () => {
  let spawned = false
  const spawn: WindowsClipboardSpawner = () => {
    spawned = true
    return { exited: Promise.resolve(0), exitCode: 0, kill: () => undefined }
  }

  return copyToWindowsClipboard("before\0after", "C:\\Windows", spawn).pipe(
    Effect.map((copied) => {
      expect(copied).toBe(false)
      expect(spawned).toBe(false)
    })
  )
})

it.effect("reports a failed Windows clipboard process", () => {
  const spawn: WindowsClipboardSpawner = () => ({
    exited: Promise.resolve(1),
    exitCode: 1,
    kill: () => undefined
  })

  return copyToWindowsClipboard("notes", "C:\\Windows", spawn).pipe(
    Effect.map((copied) => expect(copied).toBe(false))
  )
})
