import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { Cairo } from "next/font/google";
import { localeDirection, type Locale } from "@/i18n/config";
import "./globals.css";

const cairo = Cairo({
  subsets: ["latin", "arabic"],
  variable: "--font-cairo",
  display: "swap",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const dir = localeDirection[locale];
  const messages = await getMessages();

  return (
    <html lang={locale} dir={dir} className={cairo.variable}>
      <body className="bg-surface text-on-surface antialiased font-sans">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}