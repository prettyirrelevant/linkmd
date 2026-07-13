import { HttpClient, HttpClientResponse } from "@effect/platform"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Exit, Option, Redacted } from "effect"

import type { Document } from "../src/document.js"
import { publishGist } from "../src/providers/gist.js"

const document: Document = {
  title: "Notes",
  filename: "notes.md",
  content: "# Notes\n",
  warning: Option.none()
}

const token = Redacted.make("test-token")

const clientReturning = (status: number, body: unknown) => HttpClient.make((request) => {
  expect(request.method).toBe("POST")
  expect(request.url).toBe("https://api.github.com/gists")
  expect(request.headers.authorization).toBe("Bearer test-token")
  expect(request.headers.accept).toBe("application/json")
  expect(request.headers["content-type"]).toBe("application/json")
  expect(request.headers["x-github-api-version"]).toBe("2026-03-10")
  if (request.body._tag === "Uint8Array") {
    expect(JSON.parse(new TextDecoder().decode(request.body.body))).toEqual({
      description: "Notes",
      public: false,
      files: { "notes.md": { content: "# Notes\n" } }
    })
  } else {
    throw new Error("Expected a JSON request body")
  }
  return Effect.succeed(HttpClientResponse.fromWeb(
    request,
    Response.json(body, { status })
  ))
})

describe("GitHub Gist provider", () => {
  it.effect("returns html_url from a 201 response", () =>
    publishGist(document, token).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        clientReturning(201, { html_url: "https://gist.github.com/user/id" })
      ),
      Effect.map((url) => expect(url).toBe("https://gist.github.com/user/id"))
    ))

  it.effect("rejects malformed success responses", () =>
    publishGist(document, token).pipe(
      Effect.provideService(HttpClient.HttpClient, clientReturning(201, { url: "missing html_url" })),
      Effect.exit,
      Effect.map((exit) => expect(Exit.isFailure(exit)).toBe(true))
    ))

  it.effect("marks a 503 outcome as unknown", () =>
    publishGist(document, token).pipe(
      Effect.provideService(HttpClient.HttpClient, clientReturning(503, { message: "unavailable" })),
      Effect.flip,
      Effect.map((error) => {
        expect(error.status).toBe(503)
        expect(error.outcomeUnknown).toBe(true)
      })
    ))
})
