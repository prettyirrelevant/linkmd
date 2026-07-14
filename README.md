# linkmd

Publish Markdown and print a shareable URL.

## Install

```bash
mise use -g github:prettyirrelevant/linkmd
```

Or download the archive for your platform from [GitHub Releases](https://github.com/prettyirrelevant/linkmd/releases), extract `linkmd`, and place it on your `PATH`.

## Commands

- `linkmd hackmd [file]` publishes a guest-readable HackMD note.
- `linkmd gist [file]` publishes a secret GitHub Gist.
- `linkmd paste [file]` publishes an anonymous paste to paste.rs.
- `linkmd init` configures provider credentials.

Pass a file, use `-` for stdin, or omit the file when stdin is piped. Options must precede the file.

```bash
linkmd hackmd notes.md
linkmd gist notes.md
linkmd paste notes.md
pbpaste | linkmd paste --no-copy
linkmd paste --json notes.md
```

| Option | Description |
| --- | --- |
| `-t, --title <title>` | Override the document title |
| `--copy` | Copy the URL |
| `--no-copy` | Do not copy the URL |
| `--json` | Print one compact JSON object |

> [!NOTE]
> Success prints the URL to stdout. Interactive runs copy it by default; JSON mode only copies with `--copy`. Clipboard failure is non-fatal. Documents over 10 MiB are rejected locally.

> [!WARNING]
> Published links are not private. Anyone with the URL may be able to read them, and paste.rs does not document retention guarantees.

## Configuration

```bash
linkmd init
```

- `HACKMD_TOKEN` authenticates HackMD requests.
- `GITHUB_TOKEN` with the `gist` scope authenticates GitHub requests.

`init` can store these tokens as plain text in:

```text
${XDG_CONFIG_HOME:-$HOME/.config}/linkmd/config.toml
```

Environment variables override saved tokens.

## Development

```bash
mise install
mise exec -- bun install --frozen-lockfile
mise exec -- bun run check
```

The compiled binary is written to `dist/linkmd`.
