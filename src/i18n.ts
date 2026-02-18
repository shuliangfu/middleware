/**
 * @module @dreamer/middleware/i18n
 *
 * i18n for @dreamer/middleware: error messages.
 * Uses $tr + module instance, no install(); locale auto-detected from env.
 */

import {
  createI18n,
  type I18n,
  type TranslationData,
  type TranslationParams,
} from "@dreamer/i18n";
import { getEnv } from "@dreamer/runtime-adapter";
import enUS from "./locales/en-US.json" with { type: "json" };
import zhCN from "./locales/zh-CN.json" with { type: "json" };

export type Locale = "en-US" | "zh-CN";

export const DEFAULT_LOCALE: Locale = "en-US";

const MIDDLEWARE_LOCALES: Locale[] = ["en-US", "zh-CN"];

const LOCALE_DATA: Record<string, TranslationData> = {
  "en-US": enUS as TranslationData,
  "zh-CN": zhCN as TranslationData,
};

let middlewareI18n: I18n | null = null;

export function detectLocale(): Locale {
  const langEnv = getEnv("LANGUAGE") || getEnv("LC_ALL") || getEnv("LANG");
  if (!langEnv) return DEFAULT_LOCALE;
  const first = langEnv.split(/[:\s]/)[0]?.trim();
  if (!first) return DEFAULT_LOCALE;
  const match = first.match(/^([a-z]{2})[-_]([A-Z]{2})/i);
  if (match) {
    const normalized = `${match[1].toLowerCase()}-${
      match[2].toUpperCase()
    }` as Locale;
    if (MIDDLEWARE_LOCALES.includes(normalized)) return normalized;
  }
  const primary = first.substring(0, 2).toLowerCase();
  if (primary === "zh") return "zh-CN";
  if (primary === "en") return "en-US";
  return DEFAULT_LOCALE;
}

export function initMiddlewareI18n(): void {
  if (middlewareI18n) return;
  const i18n = createI18n({
    defaultLocale: DEFAULT_LOCALE,
    fallbackBehavior: "default",
    locales: [...MIDDLEWARE_LOCALES],
    translations: LOCALE_DATA as Record<string, TranslationData>,
  });
  i18n.setLocale(detectLocale());
  middlewareI18n = i18n;
}

/** Set locale for middleware error messages. Initializes i18n if not yet called. */
export function setMiddlewareLocale(locale: Locale): void {
  if (!middlewareI18n) initMiddlewareI18n();
  middlewareI18n!.setLocale(locale);
}

export function $tr(
  key: string,
  params?: Record<string, string | number>,
  lang?: Locale,
): string {
  if (!middlewareI18n) return key;
  if (lang !== undefined) {
    const prev = middlewareI18n.getLocale();
    middlewareI18n.setLocale(lang);
    try {
      return middlewareI18n.t(key, params as TranslationParams);
    } finally {
      middlewareI18n.setLocale(prev);
    }
  }
  return middlewareI18n.t(key, params as TranslationParams);
}
