import { addPersonAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState } from "@/components/empty-state";

export default async function PeoplePage() {
  const user = await requireUser();
  if (!can(user.role, "viewFinance") && !can(user.role, "writePeople")) {
    throw new Error("You do not have permission to do that.");
  }
  if (!user.villageId) throw new Error("Your account is not assigned to a village yet.");

  const people = await prisma.person.findMany({
    where: { villageId: user.villageId },
    include: { _count: { select: { distributions: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">People</h1>
        <p className="text-sm text-muted-foreground">
          Recipients and other village contacts used on distributions.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Directory</CardTitle>
          </CardHeader>
          <CardContent>
            {people.length === 0 ? (
              <EmptyState title="No people yet" description="Add a recipient before creating a distribution." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Distributions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell>
                        <div className="font-medium">{person.name}</div>
                        <div className="text-xs text-muted-foreground">{person.address}</div>
                      </TableCell>
                      <TableCell>{person.phone ?? "—"}</TableCell>
                      <TableCell>{person._count.distributions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {can(user.role, "writePeople") ? (
          <Card>
            <CardHeader>
              <CardTitle>Add person</CardTitle>
              <CardDescription>Committee members can maintain this list.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={addPersonAction} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" name="address" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" />
                </div>
                <SubmitButton>Save person</SubmitButton>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
