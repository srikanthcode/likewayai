"use client";

import React, { useRef } from "react";
import { Table, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableBlockProps {
  children: React.ReactNode;
  theme?: "dark" | "light";
}

export default function TableBlock({ children, theme = "light" }: TableBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleExportCSV = () => {
    const tableEl = containerRef.current?.querySelector("table");
    if (!tableEl) return;

    const rows = Array.from(tableEl.querySelectorAll("tr"));
    const csvContent = rows
      .map((row) => {
        const cells = Array.from(row.querySelectorAll("th, td"));
        return cells.map((cell) => `"${(cell.textContent || "").replace(/"/g, '""').trim()}"`).join(",");
      })
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `table-export-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isDark = theme === "dark";

  return (
    <div
      ref={containerRef}
      className={cn(
        "likeway-active-table my-4 rounded-xl border overflow-hidden shadow-sm transition-all",
        isDark
          ? "border-white/10 bg-[#12161f] text-gray-100"
          : "border-gray-200 bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
      )}
    >
      {/* Table toolbar */}
      <div
        className={cn(
          "flex items-center justify-between px-3.5 py-2.5 border-b font-sans",
          isDark
            ? "border-white/10 bg-white/[0.03] text-gray-300"
            : "border-gray-200 bg-gray-50 text-gray-700"
        )}
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Table size={13} className={isDark ? "text-cyan-400" : "text-cyan-600"} />
          <span className="uppercase tracking-wider text-[11px] font-bold">Data Table</span>
        </div>

        <button
          onClick={handleExportCSV}
          className={cn(
            "flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded transition-colors",
            isDark
              ? "hover:bg-white/10 text-gray-300 hover:text-white"
              : "hover:bg-gray-200/70 text-gray-600 hover:text-gray-900"
          )}
          title="Download as CSV"
        >
          <Download size={12} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="w-full overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
