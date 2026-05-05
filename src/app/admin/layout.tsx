import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

// Soft admin gate via ADMIN_EMAILS env var. Any signed-in user whose email
// is on the list gets through; everyone else is redirected home.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");
  return <>{children}</>;
}
