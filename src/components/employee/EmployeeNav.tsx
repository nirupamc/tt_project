"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderKanban, Clock, LogOut, User } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "My Projects", icon: FolderKanban },
  { href: "/dashboard/timesheet", label: "Timesheet", icon: Clock },
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
    <header className="sticky top-0 z-50 bg-[#0A0A0A] border-b border-[rgba(255,215,0,0.2)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="font-bebas text-[22px] text-[#FFD700]"
            >
              TANTECH UPSKILL
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg font-space text-[13px] transition-colors",
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

          <DropdownMenu>
            <DropdownMenuTrigger>
              <button className="relative h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFD700]">
                <Avatar className="h-10 w-10 border-2 border-[#FFD700]">
                  <AvatarImage src={session?.user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-[#2A2A2A] text-[#FFD700]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
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
                  <FolderKanban className="h-4 w-4 mr-2" />
                  My Projects
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="md:hidden">
                <Link
                  href="/dashboard/timesheet"
                  className="flex items-center font-space text-[13px]"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Timesheet
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 font-space text-[13px]"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
