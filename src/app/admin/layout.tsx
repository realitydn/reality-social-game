import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";

// Admin gate. Admins come from the staff_roles table or the ADMIN_EMAILS
// bootstrap seed (see @/lib/roles). Non-admins are redirected home. This
// layout redirect is UX only — server actions guard themselves (they're
// public endpoints the redirect can't protect).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!(await isAdmin(session?.user?.email))) redirect("/");
  return <>{children}</>;
}
