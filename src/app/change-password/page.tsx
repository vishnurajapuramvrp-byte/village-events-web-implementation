import { redirect } from "next/navigation";
import { changePasswordAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/session";

export default async function ChangePasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (!user.mustChangePassword) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set your password</CardTitle>
          <CardDescription>Your administrator gave you a temporary password. Choose a new one to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={changePasswordAction} className="space-y-4">
            <input name="password" type="password" minLength={8} required placeholder="New password" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
            <input name="confirmation" type="password" minLength={8} required placeholder="Confirm new password" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
            <Button type="submit" className="w-full">Save password</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}