import { HttpClient, HttpClientRequest } from "@effect/platform"
import { Effect } from "effect"

import type { Document } from "../document.js"
import { isAmbiguousStatus, PublishError } from "../errors.js"

const parseUrl = (value: string): Effect.Effect<string, PublishError> => {
  try {
    const url = new URL(value.trim())
    return url.protocol === "https:" && url.origin === "https://paste.rs"
      ? Effect.succeed(url.href)
      : Effect.fail(new PublishError({
        message: "paste.rs returned a link outside https://paste.rs.",
        outcomeUnknown: false
      }))
  } catch {
    return Effect.fail(new PublishError({
      message: "paste.rs returned an invalid link.",
      outcomeUnknown: false
    }))
  }
}

const publishPasteEffect = Effect.fn("publishPaste")(
  function* (document: Document) {
    const client = (yield* HttpClient.HttpClient).pipe(HttpClient.withScope)
    const request = HttpClientRequest.post("https://paste.rs/").pipe(
      HttpClientRequest.bodyText(document.content, "text/plain; charset=utf-8")
    )
    const response = yield* client.execute(request).pipe(
      Effect.mapError((cause) => new PublishError({
        message: "Could not reach paste.rs. The publication outcome is unknown.",
        outcomeUnknown: true,
        cause
      }))
    )

    if (response.status === 206) {
      return yield* new PublishError({
        message: "paste.rs stored only part of the document; the truncated paste was not accepted as success.",
        outcomeUnknown: false,
        status: 206
      })
    }
    if (response.status !== 201) {
      const outcomeUnknown = isAmbiguousStatus(response.status)
      return yield* new PublishError({
        message: outcomeUnknown
          ? `paste.rs returned HTTP ${response.status} after submission; the outcome is unknown. Do not retry blindly.`
          : `paste.rs rejected the document with HTTP ${response.status}.`,
        outcomeUnknown,
        status: response.status
      })
    }

    return yield* response.text.pipe(
      Effect.mapError((cause) => new PublishError({
        message: "Could not read the link returned by paste.rs.",
        outcomeUnknown: false,
        cause
      })),
      Effect.flatMap((body) => parseUrl(body))
    )
  }
)

export const publishPaste = (document: Document) =>
  publishPasteEffect(document).pipe(
    Effect.scoped,
    Effect.timeoutFail({
      duration: "15 seconds",
      onTimeout: () => new PublishError({
        message: "paste.rs timed out. The publication outcome is unknown.",
        outcomeUnknown: true
      })
    })
  )
