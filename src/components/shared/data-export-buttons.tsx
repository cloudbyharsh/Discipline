"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export function DataExportButtons() {
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);

  async function fetchAll() {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) throw new Error("Not signed in.");
    const [checkIns, journal, milestones] = await Promise.all([
      supabase.from("check_ins").select("*").eq("user_id", userId).order("check_in_date"),
      supabase.from("journal_entries").select("*").eq("user_id", userId).order("entry_date"),
      supabase.from("milestones").select("*").eq("user_id", userId).order("day_target"),
    ]);
    return {
      check_ins: checkIns.data ?? [],
      journal_entries: journal.data ?? [],
      milestones: milestones.data ?? [],
    };
  }

  async function exportJSON() {
    setBusy("json");
    try {
      const all = await fetchAll();
      download(`discipline-export-${Date.now()}.json`, JSON.stringify(all, null, 2), "application/json");
    } finally {
      setBusy(null);
    }
  }

  async function exportCSV() {
    setBusy("csv");
    try {
      const all = await fetchAll();
      download(`discipline-checkins-${Date.now()}.csv`, toCSV(all.check_ins), "text/csv");
    } finally {
      setBusy(null);
    }
  }

  async function exportPDF() {
    setBusy("pdf");
    try {
      const all = await fetchAll();
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Discipline — Progress Summary", 14, 18);
      doc.setFontSize(10);
      doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 25);
      doc.text(`Total check-ins: ${all.check_ins.length}`, 14, 35);
      doc.text(`Journal entries: ${all.journal_entries.length}`, 14, 41);
      doc.text(`Milestones: ${all.milestones.length}`, 14, 47);

      let y = 60;
      doc.setFontSize(12);
      doc.text("Recent check-ins", 14, y);
      doc.setFontSize(9);
      y += 7;
      for (const c of all.check_ins.slice(-30) as { check_in_date: string; was_successful: boolean; mood: string; urge_level: number }[]) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(`${c.check_in_date}  ·  ${c.was_successful ? "On track" : "Slip"}  ·  mood: ${c.mood}  ·  urge: ${c.urge_level}/10`, 14, y);
        y += 6;
      }
      doc.save(`discipline-summary-${Date.now()}.pdf`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export your data</CardTitle>
        <CardDescription>Your data belongs to you. Download a full copy any time.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={exportJSON} disabled={busy !== null}>
          <Download className="mr-1.5 h-4 w-4" />
          {busy === "json" ? "Exporting…" : "Export JSON"}
        </Button>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={busy !== null}>
          <Download className="mr-1.5 h-4 w-4" />
          {busy === "csv" ? "Exporting…" : "Export CSV"}
        </Button>
        <Button variant="outline" size="sm" onClick={exportPDF} disabled={busy !== null}>
          <Download className="mr-1.5 h-4 w-4" />
          {busy === "pdf" ? "Exporting…" : "Export PDF"}
        </Button>
      </CardContent>
    </Card>
  );
}
