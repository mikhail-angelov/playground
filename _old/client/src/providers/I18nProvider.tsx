import type { ReactNode } from "react"

import { i18n } from "@lingui/core"
import { I18nProvider as LinguiProvider } from "@lingui/react"

import { useLingui } from "@/hooks/useLingui"

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  useLingui()
  return <LinguiProvider i18n={i18n}>{children}</LinguiProvider>
}
