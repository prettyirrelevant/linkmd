import { expect, it } from "@effect/vitest"
import { Effect } from "effect"

it.effect("runs Effect programs", () =>
  Effect.sync(() => {
    expect(1 + 1).toBe(2)
  })
)
