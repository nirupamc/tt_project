"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { Download, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Tree = dynamic(
  async () => (await import("react-organizational-chart")).Tree,
  { ssr: false },
);
const TreeNode = dynamic(
  async () => (await import("react-organizational-chart")).TreeNode,
  { ssr: false },
);

type OrgNode = {
  id: string;
  name: string;
  title: string;
  opt_type?: "OPT" | "STEM OPT" | null;
  kind?: "company" | "person" | "unassigned";
  unassigned_count?: number;
  children?: OrgNode[];
};

function PersonNode({
  node,
  collapsed,
  onToggle,
}: {
  node: OrgNode;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`min-w-[190px] rounded-lg border p-3 text-left bg-white ${
        node.kind === "unassigned"
          ? "border-red-500"
          : "border-[rgba(10,10,10,0.12)]"
      }`}
    >
      <p className="font-space text-sm font-semibold text-[#0A0A0A]">{node.name}</p>
      <p className="font-space text-xs text-[rgba(10,10,10,0.65)] mt-1">{node.title}</p>
      {node.kind === "unassigned" && (
        <p className="font-space text-xs text-red-600 mt-2">
          <TriangleAlert className="inline h-3.5 w-3.5 mr-1" />
          {`Unassigned (${node.unassigned_count || 0})`}
        </p>
      )}
      {node.opt_type === "STEM OPT" && (
        <span className="inline-flex mt-2 rounded-full bg-[#FFD700] text-[#0A0A0A] px-2 py-0.5 text-[10px] font-semibold">
          STEM OPT
        </span>
      )}
      {node.opt_type === "OPT" && (
        <span className="inline-flex mt-2 rounded-full bg-gray-200 text-gray-700 px-2 py-0.5 text-[10px] font-semibold">
          OPT
        </span>
      )}
      <p className="font-space text-[10px] text-[rgba(10,10,10,0.45)] mt-2">
        {collapsed ? "Click to expand" : "Click to collapse"}
      </p>
    </button>
  );
}

export default function OrgChartPage() {
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<OrgNode | null>(null);
  const [hasEmployees, setHasEmployees] = useState(true);
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [zoom, setZoom] = useState(1);
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/compliance/org-chart");
        if (!response.ok) throw new Error("Failed to load org chart");
        const payload = await response.json();
        setTree(payload.tree);
        setHasEmployees(payload.has_employees);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load org chart");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleNode = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node: OrgNode) => {
    const collapsed = !!collapsedIds[node.id];
    return (
      <TreeNode
        key={node.id}
        label={<PersonNode node={node} collapsed={collapsed} onToggle={() => toggleNode(node.id)} />}
      >
        {!collapsed &&
          (node.children || []).map((child) => renderNode(child))}
      </TreeNode>
    );
  };

  const exportAsPdf = async () => {
    if (!chartRef.current) return;
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(chartRef.current, { scale: 2, backgroundColor: "#FFFFFF" });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.setFillColor(10, 10, 10);
      pdf.rect(0, 0, pageWidth, 16, "F");
      pdf.setTextColor(255, 215, 0);
      pdf.setFontSize(11);
      pdf.text("TanTech LLC — Archway Compliance Platform", 8, 10);

      const imgWidth = pageWidth - 10;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const renderHeight = Math.min(imgHeight, pageHeight - 30);
      pdf.addImage(imageData, "PNG", 5, 20, imgWidth, renderHeight);

      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(9);
      pdf.text("TanTech LLC — Confidential", 8, pageHeight - 6);

      pdf.save(`TanTech_OrgChart_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } catch {
      toast.error("Failed to export org chart");
    }
  };

  const rootNode = useMemo(() => {
    if (!tree?.children?.[0]) return null;
    return tree.children[0];
  }, [tree]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bebas text-4xl text-[#F5F5F0] tracking-wider">ORG CHART</h1>
          <p className="font-space text-[13px] text-[rgba(245,245,240,0.6)] mt-1">
            Reporting hierarchy based on supervisor assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[rgba(245,245,240,0.75)] font-space text-xs">
            <span>Zoom</span>
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.1"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </div>
          <Button onClick={exportAsPdf} className="bg-[#FFD700] text-[#0A0A0A] hover:bg-[#FFE44D] font-space font-semibold">
            <Download className="h-4 w-4 mr-2" />
            Export Org Chart as PDF
          </Button>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border border-[rgba(255,215,0,0.1)] rounded-xl">
        <CardHeader>
          <CardTitle className="font-space text-lg text-[#FFD700]">TanTech Reporting Structure</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="h-6 w-56 bg-[rgba(255,215,0,0.2)] rounded animate-pulse" />
              <div className="h-20 w-64 bg-[rgba(245,245,240,0.08)] rounded animate-pulse" />
              <div className="h-20 w-64 bg-[rgba(245,245,240,0.08)] rounded animate-pulse" />
            </div>
          ) : !hasEmployees ? (
            <p className="font-space text-sm text-[rgba(245,245,240,0.65)]">
              No employees found. Add employees and assign supervisors to generate the org chart.
            </p>
          ) : rootNode ? (
            <div ref={chartRef} className="overflow-x-auto bg-white rounded-lg p-6 min-w-max">
              <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: "fit-content" }}>
              <Tree
                lineWidth="2px"
                lineColor="#d1d5db"
                lineBorderRadius="8px"
                label={
                  <div className="inline-flex min-w-[200px] rounded-lg border border-[rgba(10,10,10,0.12)] p-3 bg-white">
                    <div>
                      <p className="font-space text-sm font-semibold text-[#0A0A0A]">{tree?.name || "TanTech LLC"}</p>
                      <p className="font-space text-xs text-[rgba(10,10,10,0.65)]">{tree?.title || "Company"}</p>
                    </div>
                  </div>
                }
              >
                {renderNode(rootNode)}
              </Tree>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
