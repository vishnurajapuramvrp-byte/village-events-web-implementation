import { Role } from "@/lib/enums";
import { createUserAction, deleteUserAction, updateUserRoleAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { roleLabel } from "@/lib/rbac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubmitButton } from "@/components/submit-button";

const roles = Object.values(Role);

export default async function UsersPage() {
  const actor = await requirePermission("manageUsers");
  const [users, people] = await Promise.all([
    prisma.user.findMany({ include: { person: true }, orderBy: { createdAt: "asc" } }),
    prisma.person.findMany({ where: actor.villageId ? { villageId: actor.villageId } : undefined, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Users & roles</h1>
        <p className="text-sm text-muted-foreground">
          Add committee or recipient logins with either an email address or mobile number. New users must replace
          the temporary password before they can use the app.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add user</CardTitle>
          <CardDescription>A matching village person can be linked so recipient distributions appear automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createUserAction} className="grid gap-4 sm:grid-cols-2">
            <input name="name" placeholder="Full name" required className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
            <input name="mobile" placeholder="Mobile number" inputMode="tel" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
            <input name="email" type="email" placeholder="Email address (optional)" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
            <input name="password" type="password" placeholder="Temporary password" minLength={8} required className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
            <select name="role" defaultValue={Role.VIEWER} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              {roles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
            </select>
            <select name="personId" defaultValue="" className="h-10 rounded-md border border-input bg-background px-2 text-sm">
              <option value="">Link to village person (optional)</option>
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}{person.phone ? ` · ${person.phone}` : ""}</option>)}
            </select>
            <div className="sm:col-span-2">
              <SubmitButton>Create user</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>Role changes are written to the audit log.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Current role</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>
                    <div className="font-medium">{person.name ?? "Unnamed"}</div>
                    <div className="text-xs text-muted-foreground">{person.email ?? person.mobile ?? "No login identifier"}</div>
                    {person.person ? <div className="text-xs text-muted-foreground">Linked to {person.person.name}</div> : null}
                  </TableCell>
                  <TableCell>{roleLabel(person.role as Role)}</TableCell>
                  <TableCell>
                    <form action={updateUserRoleAction.bind(null, person.id)} className="flex gap-2">
                      <select
                        name="role"
                        defaultValue={person.role}
                        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </select>
                      <SubmitButton>Update</SubmitButton>
                    </form>
                    <form action={deleteUserAction.bind(null, person.id)}>
                      <SubmitButton variant="destructive">Delete</SubmitButton>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
