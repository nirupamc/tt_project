"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmployeeNotificationBell } from "./EmployeeNotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderKanban, Clock, IdCard, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "My Projects", icon: FolderKanban },
  { href: "/dashboard/timesheet", label: "Timesheet", icon: Clock },
  { href: "/dashboard/profile", label: "My Profile", icon: IdCard },
];

export function EmployeeNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(255,215,0,0.2)] bg-[#0A0A0A]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Archway Logo"
                className="h-6 w-6 object-contain"
              />
              <span className="font-bebas text-[22px] text-[#FFD700]">
                ARCHWAY
              </span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 font-space text-[13px] transition-colors",
                      isActive
                        ? "text-[#FFD700]"
                        : "text-[rgba(245,245,240,0.7)] hover:text-[#F5F5F0]",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <EmployeeNotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger className="relative h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:ring-offset-2">
                <Avatar className="h-10 w-10 border-2 border-[#FFD700]">
                  <AvatarImage src={session?.user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-[#2A2A2A] text-[#FFD700]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="font-space text-sm font-medium">
                    {session?.user?.name}
                  </p>
                  <p className="font-space text-xs text-gray-500">
                    {session?.user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="md:hidden">
                  <Link
                    href="/dashboard"
                    className="flex items-center font-space text-[13px]"
                  >
                    <FolderKanban className="mr-2 h-4 w-4" />
                    My Projects
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="md:hidden">
                  <Link
                    href="/dashboard/timesheet"
                    className="flex items-center font-space text-[13px]"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Timesheet
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="md:hidden">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center font-space text-[13px]"
                  >
                    <IdCard className="mr-2 h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="font-space text-[13px] text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
