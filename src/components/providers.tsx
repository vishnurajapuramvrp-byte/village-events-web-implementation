"use client";

import { Children, cloneElement, createContext, isValidElement, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { translate, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({
  locale: "en",
  setLocale: () => {},
});

const translatableAttributes = new Set(["aria-label", "aria-description", "alt", "placeholder", "title"]);

function localizeNode(node: ReactNode, locale: Locale): ReactNode {
  if (typeof node === "string") return translate(node, locale);
  if (Array.isArray(node)) return Children.map(node, (child) => localizeNode(child, locale));
  if (!isValidElement(node)) return node;

  const props = node.props as Record<string, unknown>;
  const localizedProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "children") {
      localizedProps.children = localizeNode(value as ReactNode, locale);
    } else if (translatableAttributes.has(key) && typeof value === "string") {
      localizedProps[key] = translate(value, locale);
    }
  }
  return cloneElement(node, localizedProps);
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function LocalizedContent({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const localizedChildren = useMemo(() => localizeNode(children, locale), [children, locale]);
  return localizedChildren;
}

export function Providers({ children, initialLocale }: { children: React.ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState(initialLocale);
  const value = useMemo(
    () => ({
      locale,
      setLocale(nextLocale: Locale) {
        document.cookie = `app-locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = nextLocale;
        setLocaleState(nextLocale);
      },
    }),
    [locale],
  );
  return (
    <SessionProvider>
      <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    </SessionProvider>
  );
}
