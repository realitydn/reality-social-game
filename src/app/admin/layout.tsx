import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isHost } from "@/lib/roles";

// Staff console gate. Any staff member (admin OR host) may enter — hosts get a
// scoped view (only the controls their capabilities unlock), admins see
// everything. Non-staff are redirected home. This layout redirect is UX only:
// every server action re-checks the specific capability it needs (admin /
// can(create:session) / can(start:<type>) / session ownership), because a
// layout can't protect the public POST endpoints the actions compile to.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!(await isHost(session?.user?.email))) redirect("/");
  return <>{children}</>;
}
