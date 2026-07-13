# linkmd

Publish Markdown and print a shareable URL.

## Install

```bash
mise install
mise exec -- bun install --frozen-lockfile
mise exec -- bun run build
install -m 0755 dist/linkmd ~/.local/bin/linkmd
```

## Usage

```bash
linkmd hackmd notes.md
linkmd gist notes.md
linkmd paste notes.md
pbpaste | linkmd paste --no-copy
linkmd paste --json notes.md
linkmd init
```

Provider options precede the optional file argument. Run `linkmd paste --help` for details.

Pass a Markdown path, use `-` explicitly for stdin, or omit the path when stdin is piped. Successful publication prints only the URL to stdout. `--json` prints one compact object and does not copy unless `--copy` is also passed.

In an interactive terminal, links are copied by default when config `copy` is true. `--copy` and `--no-copy` override that preference. Clipboard support uses `pbcopy` on macOS, `wl-copy` on Wayland, or `xsel` on X11; publication still succeeds when copying is unavailable.

## Providers

paste.rs is anonymous and URL-accessible. It does not document privacy or retention guarantees; do not publish secrets.

`linkmd` rejects documents over 10 MiB as a local memory-safety policy. This is not a claimed provider upload limit. GitHub and HackMD do not document create limits, while paste.rs reports truncation with HTTP `206`, which `linkmd` treats as failure.

GitHub Gists are created with `public: false`. GitHub calls these secret gists: they are unlisted, but anyone with the URL can view them.

Set `GITHUB_TOKEN` to a classic token with `gist` scope, or run `linkmd init` to store it in plain text under `${XDG_CONFIG_HOME:-$HOME/.config}/linkmd/config.toml`.

HackMD notes are tagged `linkmd` and created with `readPermission: "guest"` and `writePermission: "owner"`. Set `HACKMD_TOKEN`, or save one with `linkmd init`.

## Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | Published successfully |
| `2` | Invalid command usage |
| `3` | Input failure |
| `4` | Config or authentication failure |
| `5` | Definite provider rejection |
| `6` | Network, timeout, ambiguous outcome, or invalid response |
| `130` | Cancelled or interrupted |

## Development

```bash
mise install
mise exec -- bun install --frozen-lockfile
mise exec -- bun run typecheck
mise exec -- bun run test
mise exec -- bun run build
mise exec -- bun run check
```
