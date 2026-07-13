import { FileSystem, Path } from "@effect/platform"
import { Effect, Option } from "effect"

import {
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENT_MEBIBYTES,
  type Document,
  findFirstHeading,
  normalizeContent,
  normalizeTitle,
  slugify
} from "./document.js"
import { InputError, UsageError } from "./errors.js"
import { Invocation } from "./invocation.js"

export interface InputOptions {
  readonly file: Option.Option<string>
  readonly title: Option.Option<string>
}

const validate = (raw: string): Effect.Effect<string, InputError> => {
  if (raw.trim().length === 0) {
    return Effect.fail(new InputError({ message: "Nothing to publish. The Markdown input is empty." }))
  }
  if (raw.slice(0, 8192).includes("\0")) {
    return Effect.fail(new InputError({ message: "The input looks like a binary file, not Markdown." }))
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_DOCUMENT_BYTES) {
    return Effect.fail(new InputError({
      message: `The Markdown input exceeds the ${MAX_DOCUMENT_MEBIBYTES} MiB safety limit.`
    }))
  }
  return Effect.succeed(normalizeContent(raw))
}

export const readDocument = (
  options: InputOptions
): Effect.Effect<Document, UsageError | InputError, FileSystem.FileSystem | Invocation | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const invocation = yield* Invocation
    const source = Option.getOrUndefined(options.file)

    if (source !== undefined && source !== "-" && source.startsWith("-")) {
      return yield* new UsageError({
        message: `Unknown option or ambiguous filename: ${source}. Prefix dash-leading files with ./`
      })
    }

    const raw = source === undefined || source === "-"
      ? source === undefined && invocation.stdinIsTTY
        ? yield* new UsageError({ message: "Markdown input required. Pass a file or pipe content to stdin." })
        : yield* invocation.readStdin
      : yield* Effect.gen(function* () {
        const info = yield* fs.stat(source).pipe(
          Effect.mapError((cause) => new InputError({ message: `Could not inspect file: ${source}`, cause }))
        )
        if (info.type !== "File") {
          return yield* new InputError({ message: `Markdown input must be a regular file: ${source}` })
        }
        if (Number(info.size) > MAX_DOCUMENT_BYTES) {
          return yield* new InputError({
            message: `The Markdown input exceeds the ${MAX_DOCUMENT_MEBIBYTES} MiB safety limit.`
          })
        }
        return yield* fs.readFileString(source).pipe(
          Effect.mapError((cause) => new InputError({ message: `Could not read file: ${source}`, cause }))
        )
      })

    const content = yield* validate(raw)
    const sourceName = source === undefined || source === "-" ? undefined : path.basename(source)
    const heading = findFirstHeading(content)
    const explicitTitle = Option.map(options.title, (title) => normalizeTitle(title)).pipe(
      Option.filter((title) => title.length > 0)
    )
    const title = Option.getOrElse(Option.firstSomeOf([
      explicitTitle,
      heading,
      Option.map(Option.fromNullable(
        sourceName === undefined ? undefined : path.basename(sourceName, path.extname(sourceName))
      ), (title) => normalizeTitle(title))
    ]),
      () => "Untitled"
    )
    const filename = sourceName ?? `${slugify(title)}.md`
    const extension = sourceName === undefined ? "" : path.extname(sourceName).toLowerCase()
    const warning = sourceName !== undefined && extension !== ".md" && extension !== ".markdown"
      ? Option.some(`Input file does not use a Markdown extension: ${sourceName}`)
      : Option.none<string>()

    return { content, title, filename, warning }
  })
