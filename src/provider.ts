export enum ProviderName {
  Gist = "gist",
  HackMD = "hackmd",
  PasteRs = "paste.rs",
  MdShareOnline = "mdshare.online",
  MdShareLive = "mdshare.live"
}

export const providerLabel = (provider: ProviderName): string => {
  switch (provider) {
    case ProviderName.Gist:
      return "GitHub Gist"
    case ProviderName.HackMD:
      return "HackMD"
    case ProviderName.PasteRs:
      return "paste.rs"
    case ProviderName.MdShareOnline:
      return "mdshare.online"
    case ProviderName.MdShareLive:
      return "mdshare.live"
  }
}
