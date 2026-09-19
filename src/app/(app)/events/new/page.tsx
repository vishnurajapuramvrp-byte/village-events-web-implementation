import { createEventAction } from "@/app/actions";
import { requirePermission } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";

export default async function NewEventPage() {
  await requirePermission("writeEvents");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">New event</h1>
        <p className="text-sm text-muted-foreground">
          Opening balance is the cash already on hand before this event&apos;s donations.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Event details</CardTitle>
          <CardDescription>Amounts are stored as integer paise, never as floating-point currency.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createEventAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Ugadi 2027 community fund" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="What this collection is for" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" name="endDate" type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening balance (₹)</Label>
              <Input id="openingBalance" name="openingBalance" type="number" step="0.01" min="0" defaultValue="0" />
            </div>
            <div className="flex gap-3">
              <SubmitButton>Create event</SubmitButton>
              <Button variant="outline" asChild>
                <Link href="/events">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
