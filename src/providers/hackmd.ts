import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { Effect, Redacted, Schema } from "effect"

import type { Document } from "../document.js"
import { isAmbiguousStatus, PublishError } from "../errors.js"

const HackMdResponse = Schema.Struct({
  id: Schema.String,
  publishLink: Schema.String,
  readPermission: Schema.Literal("guest"),
  writePermission: Schema.Literal("owner")
})

const parseUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.origin === "https://hackmd.io"
      ? Effect.succeed(url.href)
      : Effect.fail(new PublishError({
        message: "HackMD returned a link outside https://hackmd.io.",
        outcomeUnknown: false
      }))
  } catch {
    return Effect.fail(new PublishError({
      message: "HackMD returned an invalid note link.",
      outcomeUnknown: false
    }))
  }
}

const publishHackMdEffect = Effect.fn("publishHackMd")(function* (
  document: Document,
  token: Redacted.Redacted<string>
) {
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.withScope)
  const request = HttpClientRequest.post("https://api.hackmd.io/v1/notes").pipe(
    HttpClientRequest.acceptJson,
    HttpClientRequest.bearerToken(token),
    HttpClientRequest.bodyUnsafeJson({
      title: document.title,
      content: document.content,
      tags: ["linkmd"],
      readPermission: "guest",
      writePermission: "owner"
    })
  )
  const response = yield* client.execute(request).pipe(
    Effect.mapError((cause) => new PublishError({
      message: "Could not reach HackMD. The publication outcome is unknown.",
      outcomeUnknown: true,
      cause
    }))
  )

  if (response.status !== 201) {
    const outcomeUnknown = response.status === 207 || isAmbiguousStatus(response.status)
    return yield* new PublishError({
      message: response.status === 207
        ? "HackMD returned a partial-success response; no link was accepted."
        : outcomeUnknown
          ? `HackMD returned HTTP ${response.status} after submission; the outcome is unknown. Do not retry blindly.`
          : `HackMD rejected the note with HTTP ${response.status}.`,
      outcomeUnknown,
      status: response.status
    })
  }

  const decoded = yield* HttpClientResponse.schemaBodyJson(HackMdResponse)(response).pipe(
    Effect.mapError((cause) => new PublishError({
      message: "HackMD created the note but returned an invalid response or unexpected permissions.",
      outcomeUnknown: false,
      cause
    }))
  )
  return yield* parseUrl(decoded.publishLink)
})

export const publishHackMd = (document: Document, token: Redacted.Redacted<string>) =>
  publishHackMdEffect(document, token).pipe(
    Effect.scoped,
    Effect.timeoutFail({
      duration: "15 seconds",
      onTimeout: () => new PublishError({
        message: "HackMD timed out. The publication outcome is unknown.",
        outcomeUnknown: true
      })
    })
  )
