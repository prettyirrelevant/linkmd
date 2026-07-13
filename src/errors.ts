import { Data } from "effect"

export class UsageError extends Data.TaggedError("UsageError")<{
  readonly message: string
}> {}

export class InputError extends Data.TaggedError("InputError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class PublishError extends Data.TaggedError("PublishError")<{
  readonly message: string
  readonly outcomeUnknown: boolean
  readonly status?: number
  readonly cause?: unknown
}> {}

export type AppError = UsageError | InputError | PublishError

export class ExitCodeError extends Data.TaggedError("ExitCodeError")<{
  readonly code: number
}> {}

export const exitCodeFor = (error: AppError): number => {
  switch (error._tag) {
    case "UsageError":
      return 2
    case "InputError":
      return 3
    case "PublishError":
      return error.status === undefined ? 6 : 5
  }
}
