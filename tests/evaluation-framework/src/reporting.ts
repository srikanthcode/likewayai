import type { EvaluationReport, SuiteResult } from "./types.js";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const REPORTS_DIR = join(process.cwd(), "src", "reports");

export function generateReport(
  report: EvaluationReport,
  format: "json" | "html" | "markdown" = "json"
): string {
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }

  let output: string;
  let filename: string;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  switch (format) {
    case "json":
      output = generateJsonReport(report);
      filename = `eval-report-${timestamp}.json`;
      break;
    case "html":
      output = generateHtmlReport(report);
      filename = `eval-report-${timestamp}.html`;
      break;
    case "markdown":
      output = generateMarkdownReport(report);
      filename = `eval-report-${timestamp}.md`;
      break;
  }

  const filepath = join(REPORTS_DIR, filename);
  writeFileSync(filepath, output, "utf-8");
  console.log(`\n  Report saved: ${filepath}`);
  return filepath;
}

function generateJsonReport(report: EvaluationReport): string {
  return JSON.stringify(report, null, 2);
}

function generateMarkdownReport(report: EvaluationReport): string {
  const lines: string[] = [];

  lines.push(`# AI Assistant Evaluation Report`);
  lines.push(``);
  lines.push(`**Date:** ${report.timestamp}`);
  lines.push(`**Target:** ${report.targetUrl}`);
  lines.push(`**Model:** ${report.modelId}`);
  lines.push(`**Overall Score:** ${report.overallScore}/100`);
  lines.push(``);
  lines.push(`## Score Summary`);
  lines.push(``);
  lines.push(`| Category | Score | Threshold | Status |`);
  lines.push(`|----------|-------|-----------|--------|`);

  for (const [category, score] of Object.entries(report.categoryScores)) {
    const threshold = report.metrics[category as keyof typeof report.metrics] || 75;
    const status = score >= 75 ? "✅ Pass" : "❌ Fail";
    lines.push(`| ${category} | ${score}/100 | ${threshold} | ${status} |`);
  }

  lines.push(``);
  lines.push(`**Grade:** ${report.overallScore >= 90 ? "A" : report.overallScore >= 80 ? "B" : report.overallScore >= 70 ? "C" : report.overallScore >= 60 ? "D" : "F"}`);
  lines.push(``);

  if (report.weakAreas.length > 0) {
    lines.push(`## Weak Areas`);
    lines.push(``);
    for (const area of report.weakAreas) {
      lines.push(`- **${area.category}**: ${area.score}/100 (gap: ${area.gap}pts) — ${area.details}`);
    }
    lines.push(``);
  }

  if (report.rootCauses.length > 0) {
    lines.push(`## Root Causes`);
    lines.push(``);
    for (const cause of report.rootCauses) {
      lines.push(`- **[${cause.severity.toUpperCase()}] ${cause.category}**: ${cause.cause}`);
      lines.push(`  - Evidence: ${cause.evidence}`);
    }
    lines.push(``);
  }

  if (report.priorityFixes.length > 0) {
    lines.push(`## Priority Fixes`);
    lines.push(``);
    for (const fix of report.priorityFixes) {
      lines.push(`### ${fix.id} [${fix.priority}] ${fix.title}`);
      lines.push(`**File:** ${fix.file}`);
      lines.push(`**Description:** ${fix.description}`);
      lines.push(`**Suggested Change:** ${fix.suggestedChange}`);
      lines.push(``);
    }
  }

  lines.push(`## Improvement Plan`);
  lines.push(``);

  if (report.improvementPlan.immediate.length > 0) {
    lines.push(`### Immediate Actions`);
    for (const action of report.improvementPlan.immediate) {
      lines.push(`- [ ] ${action.title} (effort: ${action.effort}, impact: ${action.impact})`);
    }
    lines.push(``);
  }

  if (report.improvementPlan.shortTerm.length > 0) {
    lines.push(`### Short-Term Actions`);
    for (const action of report.improvementPlan.shortTerm) {
      lines.push(`- [ ] ${action.title} (effort: ${action.effort}, impact: ${action.impact})`);
    }
    lines.push(``);
  }

  lines.push(`### Medium-Term Actions`);
  for (const action of report.improvementPlan.mediumTerm) {
    lines.push(`- [ ] ${action.title} (effort: ${action.effort}, impact: ${action.impact})`);
  }
  lines.push(``);

  lines.push(`### Long-Term Actions`);
  for (const action of report.improvementPlan.longTerm) {
    lines.push(`- [ ] ${action.title} (effort: ${action.effort}, impact: ${action.impact})`);
  }
  lines.push(``);

  lines.push(`## System Information`);
  lines.push(`- Node: ${report.systemInfo.nodeVersion}`);
  lines.push(`- Platform: ${report.systemInfo.platform}`);
  lines.push(`- CPUs: ${report.systemInfo.cpus}`);
  lines.push(`- Memory: ${report.systemInfo.memoryGb} GB`);
  lines.push(``);
  lines.push(`## Suite Details`);
  lines.push(``);

  for (const suite of report.suites) {
    lines.push(`### ${suite.name}`);
    lines.push(`- Score: ${suite.overallScore}/100`);
    lines.push(`- Passed: ${suite.passedTests}/${suite.totalTests}`);
    lines.push(`- Duration: ${suite.durationMs}ms`);
    lines.push(``);

    for (const test of suite.tests) {
      const icon = test.pass ? "✅" : "❌";
      lines.push(`  ${icon} **${test.details}** (score: ${test.score})`);
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`*Generated by Likeway Evaluation Framework*`);

  return lines.join("\n");
}

function generateHtmlReport(report: EvaluationReport): string {
  const barChart = (score: number, maxScore = 100) => {
    const pct = Math.round((score / maxScore) * 100);
    const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#eab308" : "#ef4444";
    return `<div style="background:#e5e7eb;border-radius:4px;height:20px;width:100%">
      <div style="background:${color};width:${pct}%;height:20px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold">${pct}%</div>
    </div>`;
  };

  const weakAreaRows = report.weakAreas.map((w) => `
    <tr>
      <td style="padding:8px;border:1px solid #d1d5db;text-transform:capitalize">${w.category}</td>
      <td style="padding:8px;border:1px solid #d1d5db">${w.score}/100</td>
      <td style="padding:8px;border:1px solid #d1d5db">${barChart(w.score)}</td>
      <td style="padding:8px;border:1px solid #d1d5db">${w.details}</td>
    </tr>`).join("");

  const priorityFixCards = report.priorityFixes.map((f) => `
    <div style="background:${f.priority === "P0" ? "#fef2f2" : f.priority === "P1" ? "#fffbeb" : "#f0fdf4"};border:1px solid ${f.priority === "P0" ? "#fecaca" : f.priority === "P1" ? "#fde68a" : "#bbf7d0"};border-radius:8px;padding:12px;margin-bottom:12px">
      <h3 style="margin:0 0 4px 0;font-size:14px">${f.id} [${f.priority}] ${f.title}</h3>
      <p style="margin:0 0 4px 0;font-size:12px;color:#4b5563">${f.description}</p>
      <p style="margin:0;font-size:11px;color:#6b7280"><strong>File:</strong> ${f.file}</p>
    </div>`).join("");

  const suiteCards = report.suites.map((s) => {
    const testRows = s.tests.map((t) => `
      <tr>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:12px">${t.pass ? "✅" : "❌"}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:12px">${t.score}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:12px">${t.details}</td>
      </tr>`).join("");
    return `
      <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px">
        <h3 style="margin:0 0 8px 0">${s.name} — ${s.overallScore}/100 (${s.passedTests}/${s.totalTests} passed)</h3>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f9fafb"><th style="padding:4px 8px;border:1px solid #e5e7eb;font-size:11px;text-align:left">Status</th><th style="padding:4px 8px;border:1px solid #e5e7eb;font-size:11px;text-align:left">Score</th><th style="padding:4px 8px;border:1px solid #e5e7eb;font-size:11px;text-align:left">Detail</th></tr></thead>
          <tbody>${testRows}</tbody>
        </table>
      </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Evaluation Report - ${report.overallScore}/100</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; color: #1f2937; }
  .container { max-width: 1000px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 24px; border-radius: 12px; margin-bottom: 20px; }
  .header h1 { margin: 0; font-size: 24px; }
  .header .score { font-size: 48px; font-weight: bold; margin: 8px 0; }
  .header .grade { font-size: 18px; opacity: 0.9; }
  .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .card h2 { margin: 0 0 12px 0; font-size: 18px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px; border: 1px solid #d1d5db; text-align: left; font-size: 13px; }
  th { background: #f9fafb; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
  .badge-p0 { background: #fef2f2; color: #dc2626; }
  .badge-p1 { background: #fffbeb; color: #d97706; }
  .badge-p2 { background: #f0fdf4; color: #16a34a; }
  .badge-critical { background: #fef2f2; color: #dc2626; }
  .badge-high { background: #fffbeb; color: #d97706; }
  .badge-medium { background: #eff6ff; color: #2563eb; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🤖 AI Assistant Evaluation Report</h1>
    <div class="score">${report.overallScore}/100</div>
    <div class="grade">Grade: ${report.overallScore >= 90 ? "A" : report.overallScore >= 80 ? "B" : report.overallScore >= 70 ? "C" : report.overallScore >= 60 ? "D" : "F"} — ${report.overallScore >= 80 ? "✅ Production Ready" : report.overallScore >= 60 ? "⚠️ Needs Improvement" : "❌ Not Ready"}</div>
    <div style="margin-top:8px;font-size:12px;opacity:0.8">${report.timestamp} | ${report.modelId}</div>
  </div>

  <div class="card">
    <h2>📊 Category Scores</h2>
    <table>
      <thead><tr><th>Category</th><th>Score</th><th>Bar</th><th>Status</th></tr></thead>
      <tbody>${weakAreaRows.length ? weakAreaRows : '<tr><td colspan="4" style="text-align:center;color:#6b7280">All categories pass thresholds</td></tr>'}</tbody>
    </table>
  </div>

  ${report.priorityFixes.length > 0 ? `
  <div class="card">
    <h2>🔧 Priority Fixes</h2>
    ${priorityFixCards}
  </div>` : ""}

  ${report.rootCauses.length > 0 ? `
  <div class="card">
    <h2>🔍 Root Causes</h2>
    <table>
      <thead><tr><th>Severity</th><th>Category</th><th>Cause</th></tr></thead>
      <tbody>${report.rootCauses.map(c => `
        <tr>
          <td><span class="badge badge-${c.severity}">${c.severity}</span></td>
          <td style="text-transform:capitalize">${c.category}</td>
          <td>${c.cause}</td>
        </tr>`).join("")}</tbody>
    </table>
  </div>` : ""}

  <div class="card">
    <h2>📋 Suite Results</h2>
    ${suiteCards}
  </div>

  <div style="text-align:center;color:#9ca3af;font-size:12px;padding:20px">
    Generated by Likeway Evaluation Framework
  </div>
</div>
</body>
</html>`;
}
