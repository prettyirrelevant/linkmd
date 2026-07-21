# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Commit hashes link to [the repository](https://github.com/prettyirrelevant/linkmd).

## [Unreleased]

### Added

- `mdshareonline` command publishes an anonymous share to mdshare.online.
- `mdsharelive` command publishes to mdshare.live and returns a view-only link that never carries the admin key.

## [0.2.1] - 2026-07-14

### Fixed

- [`46e14f1`](https://github.com/prettyirrelevant/linkmd/commit/46e14f1) fix: build Windows releases natively

### Changed

- [`d135764`](https://github.com/prettyirrelevant/linkmd/commit/d135764) chore: prepare v0.2.1 release
- [`a28dda3`](https://github.com/prettyirrelevant/linkmd/commit/a28dda3) ci: add Windows ARM64 releases

## [0.2.0] - 2026-07-14

### Added

- [`edcb5e8`](https://github.com/prettyirrelevant/linkmd/commit/edcb5e8) feat: add Windows support

### Changed

- [`ff2bed7`](https://github.com/prettyirrelevant/linkmd/commit/ff2bed7) chore: prepare v0.2.0 release
- [`23be0e9`](https://github.com/prettyirrelevant/linkmd/commit/23be0e9) docs: streamline command reference

### Fixed

- [`58caa6f`](https://github.com/prettyirrelevant/linkmd/commit/58caa6f) test: account for Windows file modes

## [0.1.0] - 2026-07-14

### Added

- [`fcb7074`](https://github.com/prettyirrelevant/linkmd/commit/fcb7074) feat: publish Markdown to paste.rs
- [`03dac7b`](https://github.com/prettyirrelevant/linkmd/commit/03dac7b) feat: add GitHub Gist publishing
- [`c3245ce`](https://github.com/prettyirrelevant/linkmd/commit/c3245ce) feat: add HackMD publishing
- [`bed8deb`](https://github.com/prettyirrelevant/linkmd/commit/bed8deb) docs: add installation instructions
- [`0afc8fc`](https://github.com/prettyirrelevant/linkmd/commit/0afc8fc) ci: add test and release workflows

### Changed

- [`b451dcb`](https://github.com/prettyirrelevant/linkmd/commit/b451dcb) chore: scaffold Effect CLI project
- [`6d9b8e9`](https://github.com/prettyirrelevant/linkmd/commit/6d9b8e9) refactor: polish provider model and docs

### Fixed

- [`ffc1be3`](https://github.com/prettyirrelevant/linkmd/commit/ffc1be3) fix: identify repository when publishing releases
- [`66c9256`](https://github.com/prettyirrelevant/linkmd/commit/66c9256) fix: harden CLI and provider boundaries

[Unreleased]: https://github.com/prettyirrelevant/linkmd/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/prettyirrelevant/linkmd/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/prettyirrelevant/linkmd/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/prettyirrelevant/linkmd/releases/tag/v0.1.0
