import { browserJobQueue, AutomationJob } from "./job-queue";
import { runBrowserEngine, AgentOptions } from "./browser-engine";
import { fetchAI } from "../api-manager";
import { getProviderForModel } from "../models";
import { broadcastStatus, broadcastStep } from "./browser-ws-server";
import { logger } from "../logger";

export class BrowserWorker {
  private static instance: BrowserWorker;
  private isRunning = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private activeJobsCount = 0;
  private readonly MAX_CONCURRENT_JOBS = 3;
  private readonly JOB_TIMEOUT_MS = 180 * 1000; // 3 minutes max per job
  private activeControllers: Map<string, AbortController> = new Map();

  private constructor() {
    // Listen for immediate job creation events to reduce pickup latency
    browserJobQueue.on("job:created", () => {
      if (this.isRunning && this.activeJobsCount < this.MAX_CONCURRENT_JOBS) {
        this.processNextJob().catch((err) => {
          logger.error("[BrowserWorker] Error in immediate job trigger:", err);
        });
      }
    });

    // Listen for cancel events
    browserJobQueue.on("job:cancelled", (job: AutomationJob) => {
      const controller = this.activeControllers.get(job.id);
      if (controller) {
        controller.abort();
        this.activeControllers.delete(job.id);
      }
    });
  }

  public static getInstance(): BrowserWorker {
    if (!BrowserWorker.instance) {
      BrowserWorker.instance = new BrowserWorker();
    }
    return BrowserWorker.instance;
  }

  /**
   * Start the background worker loop
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    logger.info("[BrowserWorker] Browser Automation Worker started", {
      maxConcurrent: this.MAX_CONCURRENT_JOBS,
    });

    // Worker poll loop every 2 seconds
    this.pollTimer = setInterval(() => {
      if (this.activeJobsCount < this.MAX_CONCURRENT_JOBS) {
        this.processNextJob().catch((err) => {
          logger.error("[BrowserWorker] Error in poll loop:", err);
        });
      }
    }, 2000);
  }

  /**
   * Stop the background worker loop
   */
  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    // Abort all active jobs
    for (const [jobId, controller] of this.activeControllers.entries()) {
      controller.abort();
      logger.info(`[BrowserWorker] Aborted job ${jobId} during worker stop`);
    }
    this.activeControllers.clear();

    logger.info("[BrowserWorker] Browser Automation Worker stopped");
  }

  public getStatus() {
    return {
      running: this.isRunning,
      activeJobs: this.activeJobsCount,
      maxConcurrent: this.MAX_CONCURRENT_JOBS,
    };
  }

  /**
   * Claim and execute next queued job
   */
  private async processNextJob(): Promise<void> {
    if (!this.isRunning || this.activeJobsCount >= this.MAX_CONCURRENT_JOBS) {
      return;
    }

    const job = await browserJobQueue.claimNextJob();
    if (!job) return;

    this.activeJobsCount++;
    const abortController = new AbortController();
    this.activeControllers.set(job.id, abortController);

    logger.info(`[BrowserWorker] Starting execution for job ${job.id}`, {
      task: job.task.slice(0, 50),
      userId: job.userId,
    });

    const isProduction =
      process.env.VERCEL_ENV === "production" ||
      process.env.VERCEL_ENV === "preview" ||
      !!process.env.RENDER ||
      process.env.NODE_ENV === "production";

    const timeoutId = setTimeout(() => {
      logger.warn(`[BrowserWorker] Job ${job.id} exceeded timeout of ${this.JOB_TIMEOUT_MS}ms`);
      browserJobQueue.failJob(job.id, `Execution timed out after ${this.JOB_TIMEOUT_MS / 1000}s`);
      abortController.abort();
    }, this.JOB_TIMEOUT_MS);

    try {
      broadcastStatus(job.id, "launching", `Starting browser automation for: ${job.task}`);

      const modelId = job.modelId || "mistral-small-latest";
      const provider = getProviderForModel(modelId);

      const options: AgentOptions = {
        provider,
        modelId,
        fetchAI,
        headless: isProduction,
        maxIterations: 25,
        sessionId: job.id,
        onStep: async (step) => {
          if (abortController.signal.aborted) return;

          const actionName = step.action?.action || "step";
          const reasoning = step.action?.reasoning;
          const ref = step.action?.ref;
          const value = step.action?.value;

          // Broadcast to WebSocket server if connected
          broadcastStep(job.id, {
            iteration: step.iteration,
            action: actionName,
            reasoning: reasoning || "",
            url: step.stateBefore?.url || "",
            phase: step.stateBefore ? "active" : "unknown",
            success: step.success,
          });

          // Add step record to Job Queue
          await browserJobQueue.addJobStep(
            job.id,
            {
              iteration: step.iteration,
              action: actionName,
              reasoning,
              ref,
              value,
              url: step.stateBefore?.url,
              success: step.success,
              error: step.error,
              verified: step.verified,
              duration: step.duration,
              screenshot: step.screenshot,
            },
            {
              currentSubGoal: step.subGoal,
            }
          );
        },
      };

      const fullTask = job.startUrl
        ? `Navigate to ${job.startUrl} first, then: ${job.task}`
        : job.task;

      const result = await runBrowserEngine(fullTask, options);

      clearTimeout(timeoutId);

      if (abortController.signal.aborted) {
        return;
      }

      if (result.success) {
        await browserJobQueue.completeJob(job.id, {
          answer: result.answer || "Task executed successfully",
          finalState: result.finalState,
          screenshots: result.screenshots,
          lastScreenshot: result.screenshots[result.screenshots.length - 1] || undefined,
          duration: result.duration,
        });
        broadcastStatus(job.id, "done", result.answer);
      } else {
        await browserJobQueue.failJob(
          job.id,
          result.error || "Automation failed without specific error",
          result.screenshots[result.screenshots.length - 1] || undefined
        );
        broadcastStatus(job.id, "error", result.error);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      logger.error(`[BrowserWorker] Uncaught error during job ${job.id}:`, err);
      await browserJobQueue.failJob(job.id, err?.message || "Worker execution failed");
      broadcastStatus(job.id, "error", err?.message);
    } finally {
      clearTimeout(timeoutId);
      this.activeControllers.delete(job.id);
      this.activeJobsCount--;

      // Check if more jobs are pending
      if (this.isRunning && this.activeJobsCount < this.MAX_CONCURRENT_JOBS) {
        setImmediate(() => this.processNextJob());
      }
    }
  }
}

export const browserWorker = BrowserWorker.getInstance();
