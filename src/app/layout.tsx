import type { Metadata } from "next";
import { Montserrat, Montserrat_Alternates, Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "latin-ext", "vietnamese", "cyrillic"],
  weight: ["100", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});
const montserratAlt = Montserrat_Alternates({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["600"],
  variable: "--font-montserrat-alt",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "REALITY Social Game",
  description: "A party game played in person at REALITY.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      className={`${montserrat.variable} ${montserratAlt.variable} ${spaceGrotesk.variable}`}
    >
      <body className="bg-cream text-ink min-h-dvh antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
