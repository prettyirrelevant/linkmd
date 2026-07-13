import type { ProviderName } from "./provider.js"

export interface PublishResult {
  readonly title: string
  readonly provider: ProviderName
  readonly url: string
  readonly copied: boolean
}

export const renderResult = (result: PublishResult, json: boolean): string =>
  json ? JSON.stringify(result) : result.url

export const sanitizeForTerminal = (value: string): string =>
  value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "�")
