import { Effect } from "effect"

import { MAX_DOCUMENT_BYTES, MAX_DOCUMENT_MEBIBYTES } from "./document.js"
import { InputError } from "./errors.js"

const readStdin = Effect.tryPromise({
  try: async () => {
    const reader = Bun.stdin.stream().getReader()
    const chunks: Array<Uint8Array> = []
    let length = 0

    try {
      while (true) {
        const next = await reader.read()
        if (next.done) break
        length += next.value.byteLength
        if (length > MAX_DOCUMENT_BYTES) {
          await reader.cancel()
          throw new InputError({
            message: `The Markdown input exceeds the ${MAX_DOCUMENT_MEBIBYTES} MiB safety limit.`
          })
        }
        chunks.push(next.value)
      }
    } finally {
      reader.releaseLock()
    }

    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return new TextDecoder().decode(bytes)
  },
  catch: (cause) => cause instanceof InputError
    ? cause
    : new InputError({ message: "Could not read Markdown from stdin.", cause })
})

export class Invocation extends Effect.Service<Invocation>()("linkmd/Invocation", {
  sync: () => ({
    stdinIsTTY: Boolean(process.stdin.isTTY),
    stderrIsTTY: Boolean(process.stderr.isTTY),
    platform: process.platform,
    env: process.env as Readonly<Record<string, string | undefined>>,
    readStdin
  })
}) {}
