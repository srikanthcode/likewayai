"use client";

import React, { useState, useMemo } from "react";
import { Table, Download, Search, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableBlockProps {
  children: React.ReactNode;
  theme?: "dark" | "light";
}

export default function TableBlock({ children, theme = "dark" }: TableBlockProps) {
  const [filter, setFilter] = useState("");

  const handleExportCSV = () => {
    // Extract text content from the rendered table
    const tableEl = document.querySelector(".likeway-active-table table") as HTMLTableElement;
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

  return (
    <div
      className={cn(
        "likeway-active-table my-4 rounded-xl border overflow-hidden shadow-sm transition-all",
        theme === "dark"
          ? "border-white/10 bg-black/20"
          : "border-black/10 bg-black/[0.02]"
      )}
    >
      {/* Table toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
        <div className="flex items-center gap-1.5 text-xs opacity-70">
          <Table size={13} />
          <span className="font-semibold uppercase tracking-wider text-[11px]">Data Table</span>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-80 hover:opacity-100"
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
