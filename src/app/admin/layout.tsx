import { Sidebar } from "@/components/admin/Sidebar";
import { Toaster } from "@/components/ui/sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="pt-16 lg:pt-0">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
