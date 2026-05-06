import { redirect } from "next/navigation";
import Link from "next/link";
import { createPackage } from "@/lib/packages";
import { getCurrentUser } from "@/lib/session";
import { DEFAULT_QUIZ_ROUND_CONFIG } from "@/games/quiz-round/state";
import Wordmark from "@/components/Wordmark";

export default async function NewPackagePage() {
  async function create(formData: FormData) {
    "use server";
    const user = await getCurrentUser();
    if (!user) redirect("/");
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    const pkg = await createPackage({
      name,
      gameType: "quiz-round",
      authorId: user.id,
      config: DEFAULT_QUIZ_ROUND_CONFIG,
      content: { questions: [] },
    });
    redirect(`/host/packages/${pkg.id}`);
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Wordmark />
        <Link
          href="/host"
          className="font-display font-semibold text-xs uppercase text-ink/60 hover:text-ink"
          style={{ letterSpacing: "0.05em" }}
        >
          ← Library
        </Link>
      </header>
      <section className="flex-1 px-6 max-w-md w-full mx-auto pb-12">
        <h1
          className="font-display font-bold text-3xl uppercase mb-6"
          style={{ letterSpacing: "0.05em" }}
        >
          New package
        </h1>
        <form action={create} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span
              className="font-display font-semibold text-xs uppercase text-ink/60"
              style={{ letterSpacing: "0.05em" }}
            >
              Name
            </span>
            <input
              type="text"
              name="name"
              required
              maxLength={80}
              autoFocus
              className="border-2 border-ink px-3 py-2 font-body text-base"
              placeholder="e.g. Đà Nẵng Trivia"
            />
          </label>
          <button
            type="submit"
            className="bg-ink text-cream font-display font-bold uppercase px-6 py-3 transition hover:translate-y-0.5"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            Create
          </button>
        </form>
      </section>
    </main>
  );
}
