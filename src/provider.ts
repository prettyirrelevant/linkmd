export enum ProviderName {
  Gist = "gist",
  HackMD = "hackmd",
  PasteRs = "paste.rs"
}

export const providerLabel = (provider: ProviderName): string => {
  switch (provider) {
    case ProviderName.Gist:
      return "GitHub Gist"
    case ProviderName.HackMD:
      return "HackMD"
    case ProviderName.PasteRs:
      return "paste.rs"
  }
}
