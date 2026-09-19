"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Bell,
  FileText,
  ScrollText,
  Settings,
  HandCoins,
  LogOut,
  Landmark,
} from "lucide-react";
import { Role } from "@/lib/enums";
import { can, roleLabel } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "viewFinance" as const },
  { href: "/events", label: "Events", icon: CalendarDays, permission: "viewFinance" as const },
  { href: "/people", label: "People", icon: Users, permission: "viewFinance" as const },
  { href: "/reminders", label: "Reminders", icon: Bell, permission: "viewFinance" as const },
  { href: "/reports", label: "Reports", icon: FileText, permission: "viewFinance" as const },
  { href: "/audit", label: "Audit", icon: ScrollText, permission: "viewAudit" as const },
  { href: "/settings/users", label: "Users", icon: Settings, permission: "manageUsers" as const },
];

export function AppShell({
  user,
  children,
}: {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: Role | string;
  };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isRecipient = user.role === Role.RECIPIENT;
  const nav = isRecipient
    ? [{ href: "/my-loan", label: "My distribution", icon: HandCoins }]
    : links.filter((item) => can(user.role, item.permission));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-border bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Village Events</p>
            <p className="text-xs text-muted-foreground">Festival ledger</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap",
                  active ? "bg-primary/15 font-medium text-primary" : "hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-border px-5 py-4 lg:block">
          <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
          <p className="text-xs text-muted-foreground">{roleLabel(user.role)}</p>
          <Button variant="ghost" size="sm" className="mt-3 w-full justify-start px-2" onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card/70 px-4 py-3 backdrop-blur lg:hidden">
          <p className="text-sm font-medium">{user.name ?? "Signed in"}</p>
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </Button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
