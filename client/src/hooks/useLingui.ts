import { i18n } from "@lingui/core"
import {
  detect,
  fromNavigator,
  fromStorage,
  fromUrl,
} from "@lingui/detect-locale"
import { useEffect } from "react"

const DEFAULT_FALLBACK = () => "en"

const dynamicActivate = async (locale: string) => {
  const { messages } = await import(`../locales/${locale}.po`)
  console.log("useLingui", locale)
  i18n.load(locale, messages)
  i18n.activate(locale)
}

export const useLingui = () => {
  useEffect(() => {
    const result = detect(
      fromUrl("lang"),
      fromStorage("lang"),
      fromNavigator(),
      DEFAULT_FALLBACK,
    )

    const userLanguage = (result ?? "").split("-")[0]
    void dynamicActivate(userLanguage)
  }, [])
}
