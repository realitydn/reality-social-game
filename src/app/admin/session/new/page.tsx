import { redirect } from "next/navigation";
import { createSession } from "@/lib/sessions";
import Wordmark from "@/components/Wordmark";

export default function NewSessionPage() {
  async function create(formData: FormData) {
    "use server";
    const raw = String(formData.get("name") ?? "").trim();
    const name = raw.length > 0 ? raw.slice(0, 80) : defaultName();
    const session = await createSession(name);
    redirect(`/admin/session/${session.id}`);
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Wordmark />
      </header>
      <section className="flex-1 px-6 max-w-md w-full mx-auto">
        <h1 className="font-display font-bold text-3xl uppercase mb-8" style={{ letterSpacing: "0.05em" }}>
          New session
        </h1>
        <form action={create} className="flex flex-col gap-6">
          <div>
            <label
              htmlFor="name"
              className="font-display font-semibold text-xs uppercase block mb-2"
              style={{ letterSpacing: "0.05em" }}
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={defaultName()}
              maxLength={80}
              className="w-full border-2 border-ink bg-cream px-3 py-2 font-body focus:outline-none focus:bg-yellow"
            />
          </div>
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

function defaultName(): string {
  const d = new Date();
  return `${d.toLocaleString("en-US", { weekday: "short" }).toUpperCase()} · ${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(-2)}`;
}
