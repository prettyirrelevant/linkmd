import { describe, expect, it } from "@effect/vitest"
import { Option } from "effect"

import { findFirstHeading, normalizeContent, normalizeTitle, slugify } from "../src/document.js"
import { renderResult, sanitizeForTerminal } from "../src/output.js"
import { ProviderName } from "../src/provider.js"

describe("Markdown domain", () => {
  it("finds the first H1 outside frontmatter and fences", () => {
    const markdown = `---
title: ignored
---

\`\`\`md
# Not this
\`\`\`

# Actual title ###
`
    expect(Option.getOrUndefined(findFirstHeading(markdown))).toBe("Actual title")
  })

  it("normalizes line endings and the trailing newline", () => {
    expect(normalizeContent("# Notes\r\n\r\n")).toBe("# Notes\n")
  })

  it("preserves significant trailing spaces on the final Markdown line", () => {
    expect(normalizeContent("hard break  \n\n")).toBe("hard break  \n")
  })

  it("creates safe stdin filenames", () => {
    expect(slugify("Crème brûlée notes")).toBe("creme-brulee-notes")
  })

  it("normalizes and caps titles", () => {
    expect(normalizeTitle(`  ${"a".repeat(205)}   title `)).toHaveLength(200)
  })

  it("renders compact JSON", () => {
    expect(renderResult({
      title: "Notes",
      provider: ProviderName.PasteRs,
      url: "https://paste.rs/example",
      copied: false
    }, true)).toBe("{\"title\":\"Notes\",\"provider\":\"paste.rs\",\"url\":\"https://paste.rs/example\",\"copied\":false}")
  })

  it("removes terminal control and bidi sequences from diagnostics", () => {
    expect(sanitizeForTerminal("safe\u001b[31m\u202edanger")).toBe("safe�[31m�danger")
  })
})
