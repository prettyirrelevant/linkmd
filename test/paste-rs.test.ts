import { HttpClient, HttpClientResponse } from "@effect/platform"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Exit, Option } from "effect"

import type { Document } from "../src/document.js"
import { publishPaste } from "../src/providers/paste-rs.js"

const document: Document = {
  title: "Notes",
  filename: "notes.md",
  content: "# Notes\n",
  warning: Option.none()
}

const clientReturning = (status: number, body: string) => HttpClient.make((request) => {
  expect(request.method).toBe("POST")
  expect(request.url).toBe("https://paste.rs/")
  expect(request.body._tag).toBe("Uint8Array")
  if (request.body._tag === "Uint8Array") {
    expect(new TextDecoder().decode(request.body.body)).toBe(document.content)
    expect(request.body.contentType).toBe("text/plain; charset=utf-8")
  }
  return Effect.succeed(HttpClientResponse.fromWeb(
    request,
    new Response(body, { status })
  ))
})

describe("paste.rs provider", () => {
  it.effect("returns the validated HTTPS link from a 201 response", () =>
    publishPaste(document).pipe(
      Effect.provideService(HttpClient.HttpClient, clientReturning(201, "https://paste.rs/example\n")),
      Effect.map((url) => expect(url).toBe("https://paste.rs/example"))
    ))

  it.effect("rejects a truncated 206 response", () =>
    publishPaste(document).pipe(
      Effect.provideService(HttpClient.HttpClient, clientReturning(206, "https://paste.rs/truncated")),
      Effect.exit,
      Effect.map((exit) => {
        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
          expect(String(exit.cause)).toContain("stored only part")
        }
      })
    ))
})
