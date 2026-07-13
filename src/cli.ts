import { Args, Command, Options } from "@effect/cli"
import { Console } from "effect"

import { initialize } from "./init.js"
import { type ProviderName, publish } from "./publish.js"

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

const makePublishCommand = (
  name: "gist" | "hackmd" | "paste",
  provider: ProviderName,
  description: string
) => Command.make(
  name,
  { file, title, copy, noCopy, json },
  (options) => publish(provider, options)
).pipe(Command.withDescription(description))

const paste = makePublishCommand("paste", "paste.rs", "Publish Markdown to paste.rs")
const gist = makePublishCommand("gist", "gist", "Publish Markdown as a secret GitHub Gist")
const hackmd = makePublishCommand("hackmd", "hackmd", "Publish Markdown as a guest-readable HackMD note")
const init = Command.make("init", {}, () => initialize()).pipe(
  Command.withDescription("Configure provider credentials")
)

export const root = Command.make("linkmd", {}, () =>
  Console.log("Usage: linkmd <gist|hackmd|paste> [options] [file]\n       linkmd init")
).pipe(
  Command.withDescription("Publish Markdown and print a shareable URL"),
  Command.withSubcommands([gist, hackmd, paste, init])
)
