import { getTranslations } from "next-intl/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import SignInButtons from "@/components/SignInButtons";
import Wordmark from "@/components/Wordmark";

export default async function Home() {
  const t = await getTranslations("home");
  const tFooter = await getTranslations("footer");
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Wordmark />
        <LocaleSwitcher />
      </header>
      <section className="flex-1 flex flex-col items-center justify-center gap-8 px-6 text-center">
        <h1
          className="font-display font-bold text-4xl md:text-5xl uppercase max-w-2xl leading-tight"
          style={{ letterSpacing: "0.05em" }}
        >
          {t("title")}
        </h1>
        <p className="font-body text-ink/70 max-w-md">{t("tagline")}</p>
        <SignInButtons />
      </section>
      <footer className="p-6 text-center text-xs font-body text-ink/60">
        {tFooter("address")} · realitydn.com
      </footer>
    </main>
  );
}
