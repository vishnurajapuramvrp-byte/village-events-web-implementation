import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { SignInForm } from "@/components/sign-in-form";
import { demoLoginEnabled, googleLoginEnabled } from "@/lib/auth";
import { designatedAdminEmails } from "@/lib/gmail";
import { getSiteBranding } from "@/lib/site";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const [googleEnabled, demoEnabled, site] = [googleLoginEnabled(), demoLoginEnabled(), await getSiteBranding()];
  const adminEmail = designatedAdminEmails()[0];

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-3 rounded-2xl bg-primary/10 px-4 py-3 text-primary">
          <Landmark className="h-6 w-6" />
          <span className="text-sm font-semibold">{site.villageName}</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{site.headline}</h1>
        <p className="max-w-xl text-lg text-muted-foreground">{site.description}</p>
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {site.highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            {demoEnabled
              ? "Local testing uses demo accounts. Production uses Gmail only."
              : adminEmail
                ? `Sign in with Gmail. ${adminEmail} becomes Admin; other Gmail users start as Viewer.`
                : "Sign in with Gmail. New users start as Viewer until an Admin assigns a role."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm googleEnabled={googleEnabled} demoLoginEnabled={demoEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
