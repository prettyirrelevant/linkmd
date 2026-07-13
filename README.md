# linkmd

Publish Markdown and print a shareable URL.

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

paste.rs is anonymous and URL-accessible. It does not document privacy or retention guarantees; do not publish secrets.

GitHub Gists are created with `public: false`. GitHub calls these secret gists: they are unlisted, but anyone with the URL can view them.

Set `GITHUB_TOKEN` to a classic token with `gist` scope, or run `linkmd init` to store it in plain text under `${XDG_CONFIG_HOME:-$HOME/.config}/linkmd/config.toml`.

HackMD notes are tagged `linkmd` and created with `readPermission: "guest"` and `writePermission: "owner"`. Set `HACKMD_TOKEN`, or save one with `linkmd init`.

## Development

```bash
mise install
mise exec -- bun install --frozen-lockfile
mise exec -- bun run typecheck
mise exec -- bun run test
mise exec -- bun run build
```
