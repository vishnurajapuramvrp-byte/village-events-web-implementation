import { Role } from "@/lib/enums";
import { updateUserRoleAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { roleLabel } from "@/lib/audit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubmitButton } from "@/components/submit-button";

const roles = Object.values(Role);

export default async function UsersPage() {
  await requirePermission("manageUsers");
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Users & roles</h1>
        <p className="text-sm text-muted-foreground">
          Admin, treasurer, committee member, viewer, and recipient. Google users listed in
          ADMIN_EMAILS become admins on first sign-in.
        </p>
      </div>
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
                    <div className="text-xs text-muted-foreground">{person.email}</div>
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
