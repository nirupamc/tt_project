"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Clock,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/projects", label: "Projects & Clients", icon: FolderKanban },
  { href: "/admin/timesheets", label: "Timesheets", icon: Clock },
  { href: "/admin/compliance", label: "Compliance", icon: ShieldCheck },
];

function NavContent({
  pathname,
  onNavigate,
  onSignOut,
}: {
  pathname: string;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className="px-6 py-6 border-b border-[rgba(255,215,0,0.2)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Archway Logo" className="w-8 h-8 object-contain" />
            <div>
              <h1 className="font-bebas text-[28px] text-[#FFD700] leading-none">ARCHWAY</h1>
            </div>
          </div>
          <AdminNotificationBell />
        </div>
      </div>
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg font-space text-[14px] transition-all duration-200",
                  isActive
                    ? "bg-[rgba(255,215,0,0.08)] border-l-[3px] border-l-[#FFD700] text-[#FFD700]"
                    : "text-[rgba(245,245,240,0.6)] hover:bg-[rgba(255,215,0,0.05)] hover:text-[#F5F5F0]",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="p-4 border-t border-[rgba(255,215,0,0.2)]">
        <Button
          variant="ghost"
          className="w-full justify-start text-[rgba(245,245,240,0.6)] hover:text-[#F5F5F0] hover:bg-[rgba(255,215,0,0.05)] font-space text-[14px]"
          onClick={onSignOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/admin/login" });
  };

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A] border-b border-[rgba(255,215,0,0.2)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="Archway Logo" 
            className="w-6 h-6 object-contain"
          />
          <h1 className="font-bebas text-[22px] text-[#FFD700]">ARCHWAY</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-[#FFD700]"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-[#0A0A0A] border-r border-[rgba(255,215,0,0.2)] transform transition-transform duration-200 flex flex-col",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <NavContent
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-full w-64 bg-[#0A0A0A] border-r border-[rgba(255,215,0,0.2)] flex-col">
        <NavContent pathname={pathname} onNavigate={() => setMobileOpen(false)} onSignOut={handleSignOut} />
      </aside>
    </>
  );
}
