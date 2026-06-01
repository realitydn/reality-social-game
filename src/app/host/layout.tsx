import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isHost } from "@/lib/roles";

// Host surface gate. Staff only (admin or host): this is where hosts author
// quiz packages and run their own sessions. Non-staff are sent home. Like the
// admin layout, this is UX only — actions and the control desk self-authorize.
export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!(await isHost(session?.user?.email))) redirect("/");
  return <>{children}</>;
}
