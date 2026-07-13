import { HttpClient, HttpClientResponse } from "@effect/platform"
import { describe, expect, it } from "@effect/vitest"
import { Effect, Exit, Option, Redacted } from "effect"

import type { Document } from "../src/document.js"
import { publishHackMd } from "../src/providers/hackmd.js"

const document: Document = {
  title: "Notes",
  filename: "notes.md",
  content: "# Notes\n",
  warning: Option.none()
}

const token = Redacted.make("test-token")

const clientReturning = (status: number, body: unknown) => HttpClient.make((request) => {
  expect(request.method).toBe("POST")
  expect(request.url).toBe("https://api.hackmd.io/v1/notes")
  expect(request.headers.authorization).toBe("Bearer test-token")
  if (request.body._tag === "Uint8Array") {
    expect(JSON.parse(new TextDecoder().decode(request.body.body))).toEqual({
      title: "Notes",
      content: "# Notes\n",
      tags: ["linkmd"],
      readPermission: "guest",
      writePermission: "owner"
    })
  } else {
    throw new Error("Expected a JSON request body")
  }
  return Effect.succeed(HttpClientResponse.fromWeb(
    request,
    Response.json(body, { status })
  ))
})

describe("HackMD provider", () => {
  it.effect("returns publishLink and verifies permissions", () =>
    publishHackMd(document, token).pipe(
      Effect.provideService(HttpClient.HttpClient, clientReturning(201, {
        id: "note-id",
        publishLink: "https://hackmd.io/@user/note",
        readPermission: "guest",
        writePermission: "owner"
      })),
      Effect.map((url) => expect(url).toBe("https://hackmd.io/@user/note"))
    ))

  it.effect("rejects unexpected returned permissions", () =>
    publishHackMd(document, token).pipe(
      Effect.provideService(HttpClient.HttpClient, clientReturning(201, {
        id: "note-id",
        publishLink: "https://hackmd.io/@user/note",
        readPermission: "guest",
        writePermission: "guest"
      })),
      Effect.exit,
      Effect.map((exit) => expect(Exit.isFailure(exit)).toBe(true))
    ))

  it.effect("does not accept 207 as success", () =>
    publishHackMd(document, token).pipe(
      Effect.provideService(HttpClient.HttpClient, clientReturning(207, {})),
      Effect.exit,
      Effect.map((exit) => expect(Exit.isFailure(exit)).toBe(true))
    ))
})
