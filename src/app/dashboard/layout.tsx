import { EmployeeNav } from '@/components/employee/EmployeeNav';
import { Toaster } from '@/components/ui/sonner';
import { SessionProvider } from 'next-auth/react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <EmployeeNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <Toaster />
      </div>
    </SessionProvider>
  );
}
