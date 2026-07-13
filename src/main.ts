import { Command, ValidationError } from "@effect/cli"
import { FetchHttpClient, Terminal } from "@effect/platform"
import type { Runtime } from "@effect/platform"
import { BunContext, BunRuntime } from "@effect/platform-bun"
import { Cause, Console, Effect, Exit, Layer, Option } from "effect"

import { root } from "./cli.js"
import { type AppError, ExitCodeError, exitCodeFor } from "./errors.js"
import { Invocation } from "./invocation.js"

const VERSION = "0.1.0"

const FetchLive = FetchHttpClient.layer.pipe(
  Layer.provide(Layer.succeed(FetchHttpClient.RequestInit, { redirect: "manual" }))
)

const Live = Layer.mergeAll(BunContext.layer, FetchLive, Invocation.Default)

const renderError = (error: AppError) => Console.error(error.message).pipe(
  Effect.andThen(new ExitCodeError({ code: exitCodeFor(error) }))
)

const command = Command.run(root, { name: "linkmd", version: VERSION })(process.argv)

const program = command.pipe(
  Effect.catchTags({
    UsageError: (error) => renderError(error),
    InputError: (error) => renderError(error),
    ConfigError: (error) => renderError(error),
    AuthError: (error) => renderError(error),
    PublishError: (error) => renderError(error)
  }),
  Effect.catchIf(
    (error) => Terminal.isQuitException(error),
    () => new ExitCodeError({ code: 130 })
  ),
  Effect.catchIf(
    (error) => ValidationError.isValidationError(error),
    () => new ExitCodeError({ code: 2 })
  ),
  Effect.provide(Live)
)

const teardown: Runtime.Teardown = (exit, onExit) => {
  if (Exit.isSuccess(exit)) return onExit(0)
  if (Cause.isInterruptedOnly(exit.cause)) return onExit(130)
  const failure = Cause.failureOption(exit.cause)
  const error = Option.getOrUndefined(failure)
  return onExit(error instanceof ExitCodeError ? error.code : 1)
}

BunRuntime.runMain(program, { disableErrorReporting: true, teardown })
