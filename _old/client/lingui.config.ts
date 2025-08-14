import type { LinguiConfig } from "@lingui/conf"

const config: LinguiConfig = {
  catalogs: [
    {
      include: ["src"],
      path: "<rootDir>/src/locales/{locale}",
    },
  ],
  locales: ["en","ru"],
  sourceLocale: "en",
}

export default config
