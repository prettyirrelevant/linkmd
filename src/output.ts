export interface PublishResult {
  readonly title: string
  readonly provider: "gist" | "hackmd" | "paste.rs"
  readonly url: string
  readonly copied: boolean
}

export const renderResult = (result: PublishResult, json: boolean): string =>
  json ? JSON.stringify(result) : result.url
