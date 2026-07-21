import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { Effect, Schema } from "effect"

import type { Document } from "../document.js"
import { isAmbiguousStatus, PublishError } from "../errors.js"

const ORIGIN = "https://www.mdshare.online"

const MdShareResponse = Schema.Struct({
  slug: Schema.String,
  url: Schema.String
})

const parseUrl = (value: string) => {
  try {
    const url = new URL(value, ORIGIN)
    return url.protocol === "https:" && url.origin === ORIGIN && url.pathname.startsWith("/s/")
      ? Effect.succeed(url.href)
      : Effect.fail(new PublishError({
        message: `mdshare.online returned a link outside ${ORIGIN}/s/.`,
        outcomeUnknown: false
      }))
  } catch {
    return Effect.fail(new PublishError({
      message: "mdshare.online returned an invalid share link.",
      outcomeUnknown: false
    }))
  }
}

const publishMdShareOnlineEffect = Effect.fn("publishMdShareOnline")(function* (document: Document) {
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.withScope)
  const bundle = JSON.stringify({
    files: [{ name: document.filename, content: document.content, order: 0 }],
    version: "1.0"
  })
  const request = HttpClientRequest.post(`${ORIGIN}/api/shares`).pipe(
    HttpClientRequest.acceptJson,
    HttpClientRequest.bodyUnsafeJson({
      content: bundle,
      fileName: document.filename,
      fileCount: 1,
      passwordProtected: false,
      burnAfterReading: false
    })
  )
  const response = yield* client.execute(request).pipe(
    Effect.mapError((cause) => new PublishError({
      message: "Could not reach mdshare.online. The publication outcome is unknown.",
      outcomeUnknown: true,
      cause
    }))
  )

  if (response.status !== 201) {
    const outcomeUnknown = isAmbiguousStatus(response.status)
    return yield* new PublishError({
      message: outcomeUnknown
        ? `mdshare.online returned HTTP ${response.status} after submission; the outcome is unknown. Do not retry blindly.`
        : `mdshare.online rejected the document with HTTP ${response.status}.`,
      outcomeUnknown,
      status: response.status
    })
  }

  const decoded = yield* HttpClientResponse.schemaBodyJson(MdShareResponse)(response).pipe(
    Effect.mapError((cause) => new PublishError({
      message: "mdshare.online created the share but returned an invalid response.",
      outcomeUnknown: false,
      cause
    }))
  )
  return yield* parseUrl(decoded.url)
})

export const publishMdShareOnline = (document: Document) =>
  publishMdShareOnlineEffect(document).pipe(
    Effect.scoped,
    Effect.timeoutFail({
      duration: "15 seconds",
      onTimeout: () => new PublishError({
        message: "mdshare.online timed out. The publication outcome is unknown.",
        outcomeUnknown: true
      })
    })
  )
