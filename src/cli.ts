import { Args, Command, Options } from "@effect/cli"
import { Console } from "effect"

import { publish } from "./publish.js"

const file = Args.text({ name: "file" }).pipe(
  Args.optional,
  Args.withDescription("Markdown file, or - for stdin")
)

const title = Options.text("title").pipe(
  Options.withAlias("t"),
  Options.optional,
  Options.withDescription("Override the document title")
)

const copy = Options.boolean("copy").pipe(
  Options.withDescription("Copy the published link")
)

const noCopy = Options.boolean("no-copy").pipe(
  Options.withDescription("Do not copy the published link")
)

const json = Options.boolean("json").pipe(
  Options.withDescription("Print one JSON object")
)

const paste = Command.make(
  "paste",
  { file, title, copy, noCopy, json },
  (options) => publish(options)
).pipe(Command.withDescription("Publish Markdown to paste.rs"))

export const root = Command.make("linkmd", {}, () =>
  Console.log("Usage: linkmd paste [options] [file]\n\nRun linkmd paste --help for provider options.")
).pipe(
  Command.withDescription("Publish Markdown and print a shareable URL"),
  Command.withSubcommands([paste])
)
