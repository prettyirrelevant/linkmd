import { Option } from "effect"

export const MAX_DOCUMENT_MEBIBYTES = 10
export const MAX_DOCUMENT_BYTES = MAX_DOCUMENT_MEBIBYTES * 1024 * 1024

export interface Document {
  readonly content: string
  readonly title: string
  readonly filename: string
  readonly warning: Option.Option<string>
}

export const normalizeTitle = (value: string): string =>
  [...value.trim().replace(/\s+/g, " ")].slice(0, 200).join("")

export const findFirstHeading = (content: string): Option.Option<string> => {
  const lines = content.split("\n")
  let inFrontmatter = lines[0]?.trim() === "---"
  let fence: "`" | "~" | undefined

  for (let index = inFrontmatter ? 1 : 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ""
    const trimmed = line.trim()

    if (inFrontmatter) {
      if (trimmed === "---" || trimmed === "...") inFrontmatter = false
      continue
    }

    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line)
    if (fenceMatch !== null) {
      const marker = fenceMatch[1]?.[0]
      if (marker === "`" || marker === "~") {
        fence = fence === undefined ? marker : fence === marker ? undefined : fence
      }
      continue
    }

    if (fence !== undefined) continue

    const heading = /^#(?!#)\s+(.+)$/.exec(line)
    if (heading?.[1] !== undefined) {
      const normalized = normalizeTitle(heading[1].replace(/\s+#+\s*$/, ""))
      if (normalized.length > 0) return Option.some(normalized)
    }
  }

  return Option.none()
}

export const normalizeContent = (content: string): string =>
  `${content.replace(/\r\n?/g, "\n").replace(/\n+$/, "")}\n`

export const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return slug.length > 0 ? slug : "untitled"
}
