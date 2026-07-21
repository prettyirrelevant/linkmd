import { Args, Command, Options } from "@effect/cli"
import { Console, Effect } from "effect"

import { UsageError } from "./errors.js"
import { initialize } from "./init.js"
import { ProviderName } from "./provider.js"
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

const makePublishCommand = (
  name: "gist" | "hackmd" | "paste" | "mdshareonline" | "mdsharelive",
  provider: ProviderName,
  description: string
) => Command.make(
  name,
  { file, title, copy, noCopy, json },
  (options) => publish(provider, options)
).pipe(Command.withDescription(description))

const paste = makePublishCommand("paste", ProviderName.PasteRs, "Publish Markdown to paste.rs")
const mdshareonline = makePublishCommand(
  "mdshareonline",
  ProviderName.MdShareOnline,
  "Publish Markdown to mdshare.online"
)
const mdsharelive = makePublishCommand(
  "mdsharelive",
  ProviderName.MdShareLive,
  "Publish Markdown to mdshare.live with a view-only link"
)
const gist = makePublishCommand("gist", ProviderName.Gist, "Publish Markdown as a secret GitHub Gist")
const hackmd = makePublishCommand(
  "hackmd",
  ProviderName.HackMD,
  "Publish Markdown as a guest-readable HackMD note"
)
const init = Command.make("init", {}, () => initialize()).pipe(
  Command.withDescription("Configure provider credentials")
)

export const root = Command.make("linkmd", {}, () =>
  Console.log(
    "Usage: linkmd <gist|hackmd|paste|mdshareonline|mdsharelive> [options] [file]\n       linkmd init"
  )
).pipe(
  Command.withDescription("Publish Markdown and print a shareable URL"),
  Command.withSubcommands([gist, hackmd, paste, mdshareonline, mdsharelive, init])
)
