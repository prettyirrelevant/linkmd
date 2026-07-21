import { HttpClient, HttpClientResponse } from "@effect/platform"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Option } from "effect"

import type { Document } from "../src/document.js"
import { publishMdShareLive } from "../src/providers/mdshare-live.js"

const document: Document = {
  title: "Notes",
  filename: "notes.md",
  content: "# Notes\n",
  warning: Option.none()
}

const DOC_ID = "cvUk8MAP4h"
const ADMIN_KEY = "adm_secret"

// Answers the create request, then the view-link request, in order.
const twoStepClient = (
  create: { status: number; body: string },
  link: { status: number; body: string }
) => HttpClient.make((request) => {
  expect(request.method).toBe("POST")
  if (request.url === "https://mdshare.live/api/documents") {
    if (request.body._tag === "Uint8Array") {
      expect(new TextDecoder().decode(request.body.body)).toBe(document.content)
      expect(request.body.contentType).toBe("text/markdown; charset=utf-8")
    }
    return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(create.body, { status: create.status })))
  }
  expect(request.url).toBe(`https://mdshare.live/api/d/${DOC_ID}/links?key=${ADMIN_KEY}`)
  if (request.body._tag === "Uint8Array") {
    expect(JSON.parse(new TextDecoder().decode(request.body.body))).toEqual({
      permission: "view",
      label: "linkmd"
    })
  }
  return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(link.body, { status: link.status })))
})

const createBody = JSON.stringify({ document_id: DOC_ID, admin_key: ADMIN_KEY })

describe("mdshare.live provider", () => {
  it.effect("creates a document then returns the minted view link", () =>
    publishMdShareLive(document).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        twoStepClient(
          { status: 201, body: createBody },
          {
            status: 201,
            body: JSON.stringify({
              permission: "view",
              url: `https://mdshare.live/d/${DOC_ID}?key=viw_readonly`
            })
          }
        )
      ),
      Effect.map((url) => expect(url).toBe(`https://mdshare.live/d/${DOC_ID}?key=viw_readonly`))
    ))

  it.effect("fails without retry when the view link request rejects", () =>
    publishMdShareLive(document).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        twoStepClient({ status: 201, body: createBody }, { status: 403, body: "forbidden" })
      ),
      Effect.flip,
      Effect.map((error) => {
        expect(error.status).toBe(403)
        expect(error.outcomeUnknown).toBe(false)
        expect(error.message).toContain("Do not retry blindly")
      })
    ))

  it.effect("marks a 503 create outcome as unknown", () =>
    publishMdShareLive(document).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        twoStepClient({ status: 503, body: "unavailable" }, { status: 201, body: "{}" })
      ),
      Effect.flip,
      Effect.map((error) => {
        expect(error.status).toBe(503)
        expect(error.outcomeUnknown).toBe(true)
      })
    ))
})
