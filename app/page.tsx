import { getTranslations } from "next-intl/server";
import { setLocale } from "./actions";
import { locales, localeNames, type Locale } from "@/i18n/config";

export default async function HomePage() {
  const t = await getTranslations("common");

  return (
    <main className="p-margin-mobile md:p-margin-desktop">
      <h1 className="text-hero-title text-primary">{t("appName")}</h1>
      <p className="text-body-main text-on-surface-variant mt-4">
        Phase 0 — Foundation verified.
      </p>

      <div className="mt-stack-lg flex gap-3">
        {locales.map((loc: Locale) => (
          <form key={loc} action={setLocale.bind(null, loc)}>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors"
            >
              {localeNames[loc]}
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}