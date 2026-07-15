import type {
  TestCase,
  TestResult,
  SuiteResult,
  ChatResponse,
  EvaluationConfig,
  CategoryMetrics,
} from "./types.js";
import { ApiClient } from "./api-client.js";
import { computeSuiteMetrics } from "./scoring.js";

export class Evaluator {
  private client: ApiClient;
  private config: EvaluationConfig;

  constructor(config: EvaluationConfig) {
    this.client = new ApiClient(config.targetUrl, config.modelId);
    this.config = config;
  }

  async evaluateSuite(
    name: string,
    category: SuiteResult["suite"],
    testCases: TestCase[]
  ): Promise<SuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    for (const test of testCases) {
      if (this.config.verbose) {
        console.log(`  Running: ${test.id} - ${test.name}`);
      }

      const result = await this.runTestCase(test);
      results.push(result);

      if (this.config.verbose) {
        const icon = result.pass ? "✓" : "✗";
        console.log(`    ${icon} Score: ${result.score}/100 | ${result.details.slice(0, 100)}`);
      }
    }

    const passed = results.filter((r) => r.pass).length;
    const durMs = Date.now() - startTime;

    const suite: SuiteResult = {
      suite: category,
      name,
      tests: results,
      overallScore: 0,
      totalTests: results.length,
      passedTests: passed,
      failedTests: results.length - passed,
      durationMs: durMs,
      metrics: this.computeCategoryMetrics(results, category),
    };

    computeSuiteMetrics(suite);
    return suite;
  }

  private async runTestCase(testCase: TestCase): Promise<TestResult> {
    try {
      const response = await this.client.sendMessage(testCase.prompt, {
        history: testCase.history,
        mode: testCase.mode,
        plan: testCase.plan,
        files: testCase.files,
      });

      if (!response.success) {
        return {
          pass: false,
          score: 0,
          details: `API Error (${response.statusCode}): ${response.error}`,
        };
      }

      if (response.content.length === 0) {
        return {
          pass: false,
          score: 0,
          details: "Empty response from API",
        };
      }

      if (testCase.validationFn) {
        return await testCase.validationFn(response.content);
      }

      return {
        pass: true,
        score: 50,
        details: "No validation function provided - check passed by default",
      };
    } catch (error: any) {
      return {
        pass: false,
        score: 0,
        details: `Test execution error: ${error.message}`,
      };
    }
  }

  private computeCategoryMetrics(
    results: TestResult[],
    category: string
  ): CategoryMetrics {
    const base: CategoryMetrics = {
      accuracy: 0, reasoning: 0, coding: 0, conversation: 0,
      safety: 0, speed: 0, reliability: 0, ux: 0,
    };

    const scores = results.filter((r) => r.pass).map((r) => r.score);
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    base[category as keyof CategoryMetrics] = avgScore;
    return base;
  }
}
