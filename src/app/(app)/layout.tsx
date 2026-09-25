import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/session";
import { getSiteBranding } from "@/lib/site";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.mustChangePassword) redirect("/change-password");
  const site = await getSiteBranding();

  return (
    <AppShell user={user} villageName={site.villageName} tagline={site.tagline}>
      {children}
    </AppShell>
  );
}
