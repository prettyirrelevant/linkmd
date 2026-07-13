import { expect, it } from "@effect/vitest"

import { PublishError, exitCodeFor } from "../src/errors.js"

it("maps definite provider rejection to exit 5", () => {
  expect(exitCodeFor(new PublishError({
    message: "rejected",
    outcomeUnknown: false,
    status: 422
  }))).toBe(5)
})

it("maps ambiguous HTTP outcomes to exit 6", () => {
  expect(exitCodeFor(new PublishError({
    message: "unknown",
    outcomeUnknown: true,
    status: 503
  }))).toBe(6)
})

it("maps invalid success responses to exit 6", () => {
  expect(exitCodeFor(new PublishError({
    message: "invalid response",
    outcomeUnknown: false
  }))).toBe(6)
})
