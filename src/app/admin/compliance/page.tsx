import Link from "next/link";

export default function AdminCompliancePage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.2)] rounded-xl p-10">
        <h1 className="font-bebas text-4xl text-[#FFD700] tracking-wider">
          Compliance — Coming Soon
        </h1>
        <p className="font-space text-[14px] text-[rgba(245,245,240,0.65)] mt-3">
          USCIS compliance tools are being prepared for the next sprint.
        </p>
        <div className="mt-6">
          <Link
            href="/admin/compliance/org-chart"
            className="inline-flex items-center rounded-md bg-[#FFD700] text-[#0A0A0A] font-space text-[13px] font-semibold px-4 py-2 hover:bg-[#FFE44D] transition-colors"
          >
            Open Org Chart
          </Link>
        </div>
      </div>
    </div>
  );
}
