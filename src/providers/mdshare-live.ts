import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { Effect, Schema } from "effect"

import type { Document } from "../document.js"
import { isAmbiguousStatus, PublishError } from "../errors.js"

const ORIGIN = "https://mdshare.live"

const CreateResponse = Schema.Struct({
  document_id: Schema.String,
  admin_key: Schema.String
})

const LinkResponse = Schema.Struct({
  url: Schema.String,
  permission: Schema.Literal("view")
})

const parseUrl = (value: string) => {
  try {
    const url = new URL(value, ORIGIN)
    return url.protocol === "https:" && url.origin === ORIGIN && url.pathname.startsWith("/d/")
      ? Effect.succeed(url.href)
      : Effect.fail(new PublishError({
        message: `mdshare.live returned a link outside ${ORIGIN}/d/.`,
        outcomeUnknown: false
      }))
  } catch {
    return Effect.fail(new PublishError({
      message: "mdshare.live returned an invalid share link.",
      outcomeUnknown: false
    }))
  }
}

const publishMdShareLiveEffect = Effect.fn("publishMdShareLive")(function* (document: Document) {
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.withScope)

  const createRequest = HttpClientRequest.post(`${ORIGIN}/api/documents`).pipe(
    HttpClientRequest.acceptJson,
    HttpClientRequest.bodyText(document.content, "text/markdown; charset=utf-8")
  )
  const createResponse = yield* client.execute(createRequest).pipe(
    Effect.mapError((cause) => new PublishError({
      message: "Could not reach mdshare.live. The publication outcome is unknown.",
      outcomeUnknown: true,
      cause
    }))
  )

  if (createResponse.status !== 201) {
    const outcomeUnknown = isAmbiguousStatus(createResponse.status)
    return yield* new PublishError({
      message: outcomeUnknown
        ? `mdshare.live returned HTTP ${createResponse.status} after submission; the outcome is unknown. Do not retry blindly.`
        : `mdshare.live rejected the document with HTTP ${createResponse.status}.`,
      outcomeUnknown,
      status: createResponse.status
    })
  }

  const created = yield* HttpClientResponse.schemaBodyJson(CreateResponse)(createResponse).pipe(
    Effect.mapError((cause) => new PublishError({
      message: "mdshare.live created the document but returned an invalid response.",
      outcomeUnknown: false,
      cause
    }))
  )

  // The document exists at this point. Mint a view-only link so the shared URL
  // does not carry the admin key. A failure here leaves an orphaned document,
  // so never retry the whole publish blindly.
  const linkUrl = `${ORIGIN}/api/d/${encodeURIComponent(created.document_id)}/links?key=${
    encodeURIComponent(created.admin_key)
  }`
  const linkRequest = HttpClientRequest.post(linkUrl).pipe(
    HttpClientRequest.acceptJson,
    HttpClientRequest.bodyUnsafeJson({ permission: "view", label: "linkmd" })
  )
  const linkResponse = yield* client.execute(linkRequest).pipe(
    Effect.mapError((cause) => new PublishError({
      message: "mdshare.live created the document but the view link request failed. Do not retry blindly.",
      outcomeUnknown: false,
      cause
    }))
  )

  if (linkResponse.status !== 201) {
    return yield* new PublishError({
      message: `mdshare.live created the document but returned HTTP ${linkResponse.status} for the view link. Do not retry blindly.`,
      outcomeUnknown: false,
      status: linkResponse.status
    })
  }

  const link = yield* HttpClientResponse.schemaBodyJson(LinkResponse)(linkResponse).pipe(
    Effect.mapError((cause) => new PublishError({
      message: "mdshare.live created the document but returned an invalid view link.",
      outcomeUnknown: false,
      cause
    }))
  )
  return yield* parseUrl(link.url)
})

export const publishMdShareLive = (document: Document) =>
  publishMdShareLiveEffect(document).pipe(
    Effect.scoped,
    Effect.timeoutFail({
      duration: "15 seconds",
      onTimeout: () => new PublishError({
        message: "mdshare.live timed out. The publication outcome is unknown.",
        outcomeUnknown: true
      })
    })
  )
