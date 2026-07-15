#!/usr/bin/env node

/**
 * Likeway AI Assistant — Automated Evaluation Framework
 *
 * Usage:
 *   npm run evaluate -- --all                    # Run all test suites
 *   npm run evaluate -- --suite functional       # Run specific suite
 *   npm run evaluate -- --suite functional,accuracy  # Run multiple suites
 *   npm run evaluate -- --all --iterations 3     # Run with multiple iterations
 *   npm run evaluate -- --suite safety --verbose  # Verbose output
 *   npm run evaluate -- --all --report-only      # Only generate report from existing data
 */

import { loadConfig, DEFAULT_CONFIG } from "./config.js";
import { Evaluator } from "./evaluator.js";
import { assembleReport } from "./scoring.js";
import { generateReport } from "./reporting.js";
import type { TestCategory, EvaluationReport, SuiteResult } from "./types.js";
import { formatDuration, sleep } from "./utils.js";

// ── Test Suite Registry ──────────────────────────────────────────────────────
import { functionalTests } from "./suites/functional.js";
import { accuracyTests } from "./suites/accuracy.js";
import { reasoningTests } from "./suites/reasoning.js";
import { codingTests } from "./suites/coding.js";
import { conversationTests } from "./suites/conversation.js";
import { memoryTests } from "./suites/memory.js";
import { performanceTests } from "./suites/performance.js";
import { safetyTests } from "./suites/safety.js";
import { uxTests } from "./suites/ux.js";

interface SuiteDefinition {
  name: string;
  category: TestCategory;
  tests: import("./types.js").TestCase[];
}

const SUITE_REGISTRY: Record<TestCategory, SuiteDefinition> = {
  functional: { name: "Functional Tests", category: "functional", tests: functionalTests },
  accuracy: { name: "Accuracy Tests", category: "accuracy", tests: accuracyTests },
  reasoning: { name: "Reasoning Tests", category: "reasoning", tests: reasoningTests },
  coding: { name: "Coding Tests", category: "coding", tests: codingTests },
  conversation: { name: "Conversation & Memory Tests", category: "conversation", tests: [...conversationTests, ...memoryTests] },
  performance: { name: "Performance Tests", category: "performance", tests: performanceTests },
  safety: { name: "Safety Tests", category: "safety", tests: safetyTests },
  ux: { name: "User Experience Tests", category: "ux", tests: uxTests },
};

const ALL_CATEGORIES: TestCategory[] = [
  "functional", "accuracy", "reasoning", "coding",
  "conversation", "performance", "safety", "ux",
];

// ── CLI Argument Parsing ─────────────────────────────────────────────────────
function parseArgs(): {
  suites: TestCategory[];
  iterations: number;
  verbose: boolean;
  outputFormat: "json" | "html" | "markdown";
  reportOnly: boolean;
} {
  const args = process.argv.slice(2);
  const result = {
    suites: [] as TestCategory[],
    iterations: DEFAULT_CONFIG.iterations,
    verbose: DEFAULT_CONFIG.verbose,
    outputFormat: DEFAULT_CONFIG.outputFormat as "json" | "html" | "markdown",
    reportOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--all":
        result.suites = [...ALL_CATEGORIES];
        break;
      case "--suite":
        const suiteList = args[++i];
        if (suiteList) {
          result.suites = suiteList.split(",").filter((s): s is TestCategory =>
            ALL_CATEGORIES.includes(s as TestCategory)
          );
        }
        break;
      case "--iterations":
        result.iterations = parseInt(args[++i] || "1", 10);
        break;
      case "--verbose":
        result.verbose = true;
        break;
      case "--output":
        const format = args[++i] as "json" | "html" | "markdown";
        if (format) result.outputFormat = format;
        break;
      case "--report-only":
        result.reportOnly = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
  Likeway AI Evaluation Framework
  ===============================

  Usage: npm run evaluate -- [options]

  Options:
    --all                    Run all 8 test suites
    --suite <names>          Run specific suites (comma-separated)
                             e.g. --suite functional,accuracy,safety
    --iterations <n>         Number of iterations per test (default: 1)
    --verbose                Show detailed test output
    --output <format>        Output format: json, html, markdown (default: json)
    --report-only            Skip tests, regenerate report from last run
    --help, -h               Show this help

  Examples:
    npm run evaluate -- --all
    npm run evaluate -- --suite functional
    npm run evaluate -- --suite functional,accuracy,safety
    npm run evaluate -- --all --iterations 3 --verbose
    npm run evaluate -- --all --output html
  `);
}

// ── Main Runner ──────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const config = loadConfig();
  const cliArgs = parseArgs();
  const timestamp = new Date().toISOString();

  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   Likeway AI Evaluation Framework v1.0       ║
  ╚══════════════════════════════════════════════╝
  `);
  console.log(`  Target: ${config.targetUrl}`);
  console.log(`  Model:  ${config.modelId}`);
  console.log(`  Date:   ${timestamp}`);
  console.log(`  Iterations: ${cliArgs.iterations}`);
  console.log(`  Verbose: ${cliArgs.verbose}`);
  console.log("");

  // Determine which suites to run
  const suitesToRun = cliArgs.suites.length > 0 ? cliArgs.suites : ALL_CATEGORIES;

  if (cliArgs.reportOnly) {
    console.log("  Report-only mode: regeneration not yet supported without test data.");
    console.log("  Run with --all first to generate data.");
    return;
  }

  // Create evaluator
  const evaluator = new Evaluator(config);
  const allSuiteResults: SuiteResult[] = [];
  const totalStartTime = Date.now();

  // Run selected suites
  for (const category of suitesToRun) {
    const suiteDef = SUITE_REGISTRY[category];
    if (!suiteDef) {
      console.warn(`  Warning: Unknown suite "${category}", skipping`);
      continue;
    }

    console.log(`  ┌─ ${suiteDef.name} (${suiteDef.tests.length} tests) ──────────────────`);

    for (let iter = 0; iter < cliArgs.iterations; iter++) {
      if (cliArgs.iterations > 1) {
        console.log(`  │ Iteration ${iter + 1}/${cliArgs.iterations}`);
      }

      const suiteResult = await evaluator.evaluateSuite(
        suiteDef.name,
        suiteDef.category,
        suiteDef.tests
      );

      allSuiteResults.push(suiteResult);

      const pct = suiteResult.overallScore;
      const barLen = Math.round(pct / 5);
      const bar = "█".repeat(barLen) + "░".repeat(20 - barLen);
      const status = pct >= 80 ? "✓" : pct >= 60 ? "~" : "✗";
      console.log(`  │ ${status} Score: ${pct}/100 ${bar}`);
      console.log(`  │ Passed: ${suiteResult.passedTests}/${suiteResult.totalTests} | Duration: ${formatDuration(suiteResult.durationMs)}`);
      console.log(`  └${"─".repeat(50)}`);

      if (iter < cliArgs.iterations - 1) {
        await sleep(1000);
      }
    }
  }

  const totalDuration = Date.now() - totalStartTime;

  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   Evaluation Complete                         ║
  ╚══════════════════════════════════════════════╝
  `);
  console.log(`  Total duration: ${formatDuration(totalDuration)}`);
  console.log(`  Suites executed: ${suitesToRun.length}`);
  console.log(`  Iterations: ${cliArgs.iterations}`);
  console.log("");

  // Assemble and generate report
  const report = assembleReport(allSuiteResults, config);
  const reportPath = generateReport(report, cliArgs.outputFormat);

  // Print summary
  printSummary(report);

  // Print improvement plan
  printImprovementPlan(report);
}

function printSummary(report: EvaluationReport): void {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   Score Summary                               ║
  ╚══════════════════════════════════════════════╝
  `);
  console.log(`  Overall Score: ${report.overallScore}/100`);
  console.log(`  ${report.summary}`);
  console.log("");

  // Category breakdown
  const maxNameLen = Math.max(...Object.keys(report.categoryScores).map((k) => k.length));
  console.log(`  ${"Category".padEnd(maxNameLen + 2)} Score  Status`);
  console.log(`  ${"-".repeat(maxNameLen + 2)} -----  ------`);
  for (const [cat, score] of Object.entries(report.categoryScores)) {
    const status = score >= 75 ? "✅ Pass" : "❌ Fail";
    console.log(`  ${cat.padEnd(maxNameLen + 2)} ${String(score).padEnd(5)} ${status}`);
  }
  console.log("");

  // Weak areas
  if (report.weakAreas.length > 0) {
    console.log(`  ⚠️  Weak Areas:`);
    for (const area of report.weakAreas) {
      console.log(`     - ${area.category}: ${area.score}/100 (${area.gap}pts below threshold of ${area.threshold})`);
    }
    console.log("");
  } else {
    console.log(`  ✅ All categories meet thresholds`);
    console.log("");
  }
}

function printImprovementPlan(report: EvaluationReport): void {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   Priority Fixes                              ║
  ╚══════════════════════════════════════════════╝
  `);

  if (report.priorityFixes.length === 0) {
    console.log("  No critical fixes needed.");
    console.log("");
    return;
  }

  for (const fix of report.priorityFixes) {
    const pctBadge = fix.priority === "P0" ? "🔴" : fix.priority === "P1" ? "🟡" : "🟢";
    console.log(`  ${pctBadge} [${fix.priority}] ${fix.title}`);
    console.log(`     ${fix.description}`);
    console.log(`     File: ${fix.file}`);
    console.log(`     Suggestion: ${fix.suggestedChange}`);
    console.log("");
  }

  // Improvement plan summary
  console.log(`  Immediate Actions:`);
  for (const action of report.improvementPlan.immediate) {
    console.log(`     🔴 ${action.title}`);
  }
  console.log(`  Short-Term Actions:`);
  for (const action of report.improvementPlan.shortTerm) {
    console.log(`     🟡 ${action.title}`);
  }
  console.log(`  Medium-Term Actions:`);
  for (const action of report.improvementPlan.mediumTerm) {
    console.log(`     🟢 ${action.title}`);
  }
  console.log(`  Long-Term Actions:`);
  for (const action of report.improvementPlan.longTerm) {
    console.log(`     🔵 ${action.title}`);
  }
  console.log("");

  // Root causes
  if (report.rootCauses.length > 0) {
    console.log(`  Root Causes:`);
    for (const cause of report.rootCauses) {
      const icon = cause.severity === "critical" ? "🔴" : cause.severity === "high" ? "🟡" : "🟢";
      console.log(`     ${icon} [${cause.severity}] ${cause.category}: ${cause.cause}`);
    }
    console.log("");
  }

  // Regression tests
  if (report.regressions.length > 0) {
    console.log(`  Regression Tests to Add:`);
    for (const reg of report.regressions) {
      console.log(`     - ${reg.description}`);
      console.log(`       Expected fix: ${reg.expectedFix}`);
    }
    console.log("");
  }

  console.log(`  📄 Full report saved to src/reports/`);
  console.log("");
  console.log(`  Next Steps:`);
  console.log(`  1. Review the priority fixes above`);
  console.log(`  2. Implement the suggested changes`);
  console.log(`  3. Re-run the evaluation to verify improvements`);
  console.log(`  4. Add regression tests for any fixed issues`);
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   Continuous Improvement Pipeline             ║
  ╚══════════════════════════════════════════════╝
  `);
  console.log(`  Run: npm run evaluate -- --all --output html`);
  console.log(`  Run: npm run evaluate -- --suite safety --verbose`);
  console.log(`  Run: npm run evaluate -- --all --iterations 3`);
  console.log("");
}

// ── Execute ──────────────────────────────────────────────────────────────────
main().catch((error) => {
  console.error("  Evaluation framework failed:", error.message);
  process.exit(1);
});
