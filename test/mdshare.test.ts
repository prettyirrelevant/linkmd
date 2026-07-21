import { HttpClient, HttpClientResponse } from "@effect/platform"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Option } from "effect"

import type { Document } from "../src/document.js"
import { publishMdShareOnline } from "../src/providers/mdshare.js"

const document: Document = {
  title: "Notes",
  filename: "notes.md",
  content: "# Notes\n",
  warning: Option.none()
}

const clientReturning = (status: number, body: string) => HttpClient.make((request) => {
  expect(request.method).toBe("POST")
  expect(request.url).toBe("https://www.mdshare.online/api/shares")
  expect(request.body._tag).toBe("Uint8Array")
  if (request.body._tag === "Uint8Array") {
    const payload = JSON.parse(new TextDecoder().decode(request.body.body))
    expect(payload.fileName).toBe("notes.md")
    expect(payload.fileCount).toBe(1)
    expect(payload.passwordProtected).toBe(false)
    expect(payload.burnAfterReading).toBe(false)
    const bundle = JSON.parse(payload.content)
    expect(bundle.version).toBe("1.0")
    expect(bundle.files).toEqual([{ name: "notes.md", content: "# Notes\n", order: 0 }])
  }
  return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(body, { status })))
})

describe("mdshare.online provider", () => {
  it.effect("returns the absolute share link from a 201 response", () =>
    publishMdShareOnline(document).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        clientReturning(201, JSON.stringify({ slug: "abc123", url: "/s/abc123" }))
      ),
      Effect.map((url) => expect(url).toBe("https://www.mdshare.online/s/abc123"))
    ))

  it.effect("rejects a link outside the mdshare.online origin", () =>
    publishMdShareOnline(document).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        clientReturning(201, JSON.stringify({ slug: "x", url: "https://evil.example/s/x" }))
      ),
      Effect.flip,
      Effect.map((error) => {
        expect(error.outcomeUnknown).toBe(false)
        expect(error.message).toContain("outside")
      })
    ))

  it.effect("marks a 503 outcome as unknown", () =>
    publishMdShareOnline(document).pipe(
      Effect.provideService(HttpClient.HttpClient, clientReturning(503, "unavailable")),
      Effect.flip,
      Effect.map((error) => {
        expect(error.status).toBe(503)
        expect(error.outcomeUnknown).toBe(true)
      })
    ))

  it.effect("rejects a 400 as a known failure", () =>
    publishMdShareOnline(document).pipe(
      Effect.provideService(
        HttpClient.HttpClient,
        clientReturning(400, JSON.stringify({ error: "Content is required" }))
      ),
      Effect.flip,
      Effect.map((error) => {
        expect(error.status).toBe(400)
        expect(error.outcomeUnknown).toBe(false)
      })
    ))
})
