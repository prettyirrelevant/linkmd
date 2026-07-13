import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { Effect, Redacted, Schema } from "effect"

import type { Document } from "../document.js"
import { PublishError } from "../errors.js"

const GistResponse = Schema.Struct({
  html_url: Schema.String
})

const parseUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.origin === "https://gist.github.com"
      ? Effect.succeed(url.href)
      : Effect.fail(new PublishError({
        message: "GitHub returned a link outside https://gist.github.com.",
        outcomeUnknown: false
      }))
  } catch {
    return Effect.fail(new PublishError({
      message: "GitHub returned an invalid gist link.",
      outcomeUnknown: false
    }))
  }
}

const publishGistEffect = Effect.fn("publishGist")(function* (
  document: Document,
  token: Redacted.Redacted<string>
) {
  const client = yield* HttpClient.HttpClient
  const request = HttpClientRequest.post("https://api.github.com/gists").pipe(
    HttpClientRequest.acceptJson,
    HttpClientRequest.setHeader("X-GitHub-Api-Version", "2026-03-10"),
    HttpClientRequest.bearerToken(token),
    HttpClientRequest.bodyUnsafeJson({
      description: document.title,
      public: false,
      files: {
        [document.filename]: { content: document.content }
      }
    })
  )
  const response = yield* client.execute(request).pipe(
    Effect.mapError((cause) => new PublishError({
      message: "Could not reach GitHub. The publication outcome is unknown.",
      outcomeUnknown: true,
      cause
    }))
  )

  if (response.status !== 201) {
    return yield* new PublishError({
      message: `GitHub rejected the gist with HTTP ${response.status}.`,
      outcomeUnknown: false,
      status: response.status
    })
  }

  const decoded = yield* HttpClientResponse.schemaBodyJson(GistResponse)(response).pipe(
    Effect.mapError((cause) => new PublishError({
      message: "GitHub created the gist but returned an invalid response.",
      outcomeUnknown: false,
      cause
    }))
  )
  return yield* parseUrl(decoded.html_url)
})

export const publishGist = (document: Document, token: Redacted.Redacted<string>) =>
  publishGistEffect(document, token).pipe(
    Effect.timeoutFail({
      duration: "15 seconds",
      onTimeout: () => new PublishError({
        message: "GitHub timed out. The publication outcome is unknown.",
        outcomeUnknown: true
      })
    })
  )
