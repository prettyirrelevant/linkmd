# linkmd

Publish Markdown and print a shareable URL.

## Installation

```bash
mise use -g github:prettyirrelevant/linkmd
```

Or download the archive for your platform from [GitHub Releases](https://github.com/prettyirrelevant/linkmd/releases), extract `linkmd`, and place it on your `PATH`.

## Usage

```bash
linkmd hackmd notes.md
linkmd gist notes.md
linkmd paste notes.md
pbpaste | linkmd paste --no-copy
linkmd paste --json notes.md
```

Use a file path, `-` for stdin, or omit the path when stdin is piped. Options precede the optional file.

| Option | Description |
| --- | --- |
| `-t, --title <title>` | Override the document title |
| `--copy` | Copy the URL |
| `--no-copy` | Do not copy the URL |
| `--json` | Print one compact JSON object |

Successful publication prints the URL to stdout. JSON mode does not copy unless `--copy` is explicit.

Interactive runs copy by default. Clipboard failure is non-fatal. Documents over 10 MiB are rejected as a local memory-safety policy, not a provider limit.

## Providers

| Command | Publication | Authentication |
| --- | --- | --- |
| `hackmd` | Guest-readable, owner-writable, tagged `linkmd` | `HACKMD_TOKEN` |
| `gist` | Secret/unlisted Gist with `public: false` | `GITHUB_TOKEN` with `gist` scope |
| `paste` | Anonymous, URL-accessible paste | None |

These links are not private. Anyone with the URL may be able to read them. paste.rs does not document retention guarantees.

## Setup

```bash
linkmd init
```

`init` optionally stores tokens as plain text in:

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
