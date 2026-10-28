import { EventEmitter } from "events";
import clientPromise, { isMongoConfigured } from "../mongodb";
import { Collection, ObjectId } from "mongodb";

export type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "timeout";

export interface JobStep {
  iteration: number;
  action: string;
  reasoning?: string;
  ref?: string;
  value?: string;
  url?: string;
  success: boolean;
  error?: string;
  verified?: boolean;
  duration?: number;
  screenshot?: string;
  timestamp: number;
}

export interface AutomationJob {
  id: string;
  _id?: ObjectId;
  userId: string;
  task: string;
  startUrl?: string;
  modelId?: string;
  status: JobStatus;
  progress: number; // 0 - 100
  subGoals?: string[];
  currentSubGoal?: string;
  stepsTaken: number;
  steps: JobStep[];
  screenshots: string[];
  lastScreenshot?: string;
  result?: string;
  finalState?: { phase: string; url: string; title: string };
  error?: string;
  duration?: number;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  /** Epoch ms after which an unrefreshed "processing" claim may be reclaimed. */
  leaseUntil?: number | null;
  metadata?: Record<string, any>;
}

export interface EnqueueJobOptions {
  userId?: string;
  task: string;
  startUrl?: string;
  modelId?: string;
  metadata?: Record<string, any>;
}

const DB_NAME = process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || "likeway_ai";
const COLLECTION_NAME = "automation_jobs";

/** How long a claim stays valid without a heartbeat before it can be reclaimed. */
const CLAIM_LEASE_MS = 2 * 60 * 1000;

class BrowserJobQueue extends EventEmitter {
  private static instance: BrowserJobQueue;
  private inMemoryJobs: Map<string, AutomationJob> = new Map();
  private maxInMemoryJobs = 200;

  private constructor() {
    super();
    this.setMaxListeners(100);

    // Periodic cleanup of stale jobs in memory every 15 minutes
    if (typeof setInterval !== "undefined") {
      setInterval(() => this.cleanupOldJobs(), 15 * 60 * 1000);
    }
  }

  public static getInstance(): BrowserJobQueue {
    if (!BrowserJobQueue.instance) {
      BrowserJobQueue.instance = new BrowserJobQueue();
    }
    return BrowserJobQueue.instance;
  }

  private async getCollection(): Promise<Collection<AutomationJob> | null> {
    try {
      if (!isMongoConfigured()) return null;
      const client = await clientPromise;
      return client.db(DB_NAME).collection<AutomationJob>(COLLECTION_NAME);
    } catch (err) {
      console.warn("[JobQueue] MongoDB connection not available, using in-memory queue:", (err as any)?.message);
      return null;
    }
  }

  /**
   * Enqueue a new browser automation job
   */
  public async enqueueJob(options: EnqueueJobOptions): Promise<AutomationJob> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();

    const job: AutomationJob = {
      id,
      userId: options.userId || "anonymous",
      task: options.task,
      startUrl: options.startUrl,
      modelId: options.modelId || "mistral-small-latest",
      status: "queued",
      progress: 0,
      stepsTaken: 0,
      steps: [],
      screenshots: [],
      createdAt: now,
      updatedAt: now,
      metadata: options.metadata || {},
    };

    this.inMemoryJobs.set(id, job);

    // Enforce memory capacity
    if (this.inMemoryJobs.size > this.maxInMemoryJobs) {
      const oldestKey = this.inMemoryJobs.keys().next().value;
      if (oldestKey) this.inMemoryJobs.delete(oldestKey);
    }

    // Persist before announcing the job. Claiming reads the database, so the
    // document must exist by the time a worker can see the "job:created" event.
    const col = await this.getCollection();
    if (col) {
      try {
        await col.insertOne({ ...job });
      } catch (err: any) {
        console.warn(`[JobQueue] Failed to persist job ${id} to MongoDB:`, err.message);
      }
    }

    this.emit("job:created", job);
    this.emit(`job:${id}:update`, job);

    return job;
  }

  /**
   * Get job by ID (checks memory first, then DB)
   */
  public async getJob(id: string): Promise<AutomationJob | null> {
    const cached = this.inMemoryJobs.get(id);
    if (cached) return cached;

    const col = await this.getCollection();
    if (col) {
      try {
        const found = await col.findOne({ id });
        if (found) {
          this.inMemoryJobs.set(id, found);
          return found;
        }
      } catch (err: any) {
        console.warn(`[JobQueue] Error finding job ${id} in DB:`, err.message);
      }
    }

    return null;
  }

  /**
   * Claim next pending queued job for worker execution
   */
  public async claimNextJob(): Promise<AutomationJob | null> {
    // When MongoDB is configured, the database is the single source of truth for
    // claiming. Claiming from the in-memory copy first let two worker instances
    // (or two concurrent claims in one process) both take the same queued job,
    // because the memory check had no atomicity. The database path uses a
    // conditional findOneAndUpdate, which is atomic per document.
    const col = await this.getCollection();

    if (col) {
      const now = Date.now();
      const leaseUntil = now + CLAIM_LEASE_MS;

      try {
        // A job whose claim lease lapsed (worker crashed mid-run) is reclaimable.
        // The query is still a single conditional update, so two workers racing
        // for the same document cannot both win it.
        await col.updateMany(
          { status: "processing", leaseUntil: { $lt: now } },
          { $set: { status: "queued", leaseUntil: null } }
        ).catch(() => {});

        const doc = await col.findOneAndUpdate(
          { status: "queued" },
          { $set: { status: "processing", startedAt: now, updatedAt: now, leaseUntil } },
          { sort: { createdAt: 1 }, returnDocument: "after" }
        );
        if (doc) {
          this.inMemoryJobs.set(doc.id, doc);
          this.emit("job:started", doc);
          this.emit(`job:${doc.id}:update`, doc);
          return doc;
        }
      } catch (err: any) {
        console.warn("[JobQueue] Error claiming job from DB:", err.message);
      }
      // A queued job absent from the DB is not claimable: memory may hold a copy
      // of a job another instance already took.
      return null;
    }

    // No database configured (single-process / development): claim from memory.
    for (const job of this.inMemoryJobs.values()) {
      if (job.status === "queued") {
        job.status = "processing";
        job.startedAt = Date.now();
        job.updatedAt = Date.now();
        this.emit("job:started", job);
        this.emit(`job:${job.id}:update`, job);
        return job;
      }
    }

    return null;
  }

  /**
   * Add a step to a running job and update progress
   */
  public async addJobStep(
    id: string,
    step: Omit<JobStep, "timestamp">,
    extraUpdates?: Partial<AutomationJob>
  ): Promise<void> {
    const job = await this.getJob(id);
    if (!job) return;

    const fullStep: JobStep = {
      ...step,
      timestamp: Date.now(),
    };

    job.steps.push(fullStep);
    job.stepsTaken = job.steps.length;
    job.updatedAt = Date.now();

    if (step.screenshot) {
      job.lastScreenshot = step.screenshot;
      if (job.screenshots.length < 20) {
        job.screenshots.push(step.screenshot);
      }
    }

    if (extraUpdates) {
      Object.assign(job, extraUpdates);
    }

    // Dynamic progress estimate: asymptotic up to 90% based on steps
    if (job.status === "processing") {
      const estimatedSteps = Math.max(10, job.stepsTaken + 3);
      job.progress = Math.min(90, Math.round((job.stepsTaken / estimatedSteps) * 100));
    }

    // Every step doubles as a heartbeat: an actively progressing job must not
    // look stale to another worker's reclaim pass.
    if (job.status === "processing" && isMongoConfigured()) {
      job.leaseUntil = job.updatedAt + CLAIM_LEASE_MS;
    }

    this.emit("job:step", { jobId: id, step: fullStep });
    this.emit(`job:${id}:step`, fullStep);
    this.emit(`job:${id}:update`, job);

    const col = await this.getCollection();
    if (col) {
      col.updateOne(
        { id },
        {
          $push: { steps: fullStep as any },
          $set: {
            stepsTaken: job.stepsTaken,
            lastScreenshot: job.lastScreenshot,
            currentSubGoal: job.currentSubGoal,
            subGoals: job.subGoals,
            progress: job.progress,
            updatedAt: job.updatedAt,
            leaseUntil: job.leaseUntil,
          },
        }
      ).catch(() => {});
    }
  }

  /**
   * Mark a job as completed
   */
  public async completeJob(
    id: string,
    resultData: {
      answer?: string;
      finalState?: { phase: string; url: string; title: string };
      screenshots?: string[];
      lastScreenshot?: string;
      duration?: number;
    }
  ): Promise<void> {
    const job = await this.getJob(id);
    if (!job) return;

    const now = Date.now();
    job.status = "completed";
    job.progress = 100;
    job.result = resultData.answer || "Task completed successfully";
    job.finalState = resultData.finalState;
    if (resultData.lastScreenshot) job.lastScreenshot = resultData.lastScreenshot;
    if (resultData.screenshots && resultData.screenshots.length > 0) {
      job.screenshots = resultData.screenshots.slice(-20);
    }
    job.duration = resultData.duration || (job.startedAt ? now - job.startedAt : now - job.createdAt);
    job.completedAt = now;
    job.updatedAt = now;

    this.emit("job:completed", job);
    this.emit(`job:${id}:update`, job);
    this.emit(`job:${id}:done`, { status: "completed", job });

    const col = await this.getCollection();
    if (col) {
      col.updateOne(
        { id },
        {
          $set: {
            status: "completed",
            progress: 100,
            result: job.result,
            finalState: job.finalState,
            lastScreenshot: job.lastScreenshot,
            duration: job.duration,
            completedAt: job.completedAt,
            updatedAt: job.updatedAt,
            leaseUntil: null,
          },
        }
      ).catch(() => {});
    }
  }

  /**
   * Mark a job as failed
   */
  public async failJob(id: string, errorMessage: string, lastScreenshot?: string): Promise<void> {
    const job = await this.getJob(id);
    if (!job) return;

    const now = Date.now();
    job.status = "failed";
    job.error = errorMessage;
    if (lastScreenshot) job.lastScreenshot = lastScreenshot;
    job.duration = job.startedAt ? now - job.startedAt : now - job.createdAt;
    job.completedAt = now;
    job.updatedAt = now;

    this.emit("job:failed", job);
    this.emit(`job:${id}:update`, job);
    this.emit(`job:${id}:done`, { status: "failed", error: errorMessage, job });

    const col = await this.getCollection();
    if (col) {
      col.updateOne(
        { id },
        {
          $set: {
            status: "failed",
            error: errorMessage,
            lastScreenshot: job.lastScreenshot,
            duration: job.duration,
            completedAt: job.completedAt,
            updatedAt: job.updatedAt,
            leaseUntil: null,
          },
        }
      ).catch(() => {});
    }
  }

  /**
   * Cancel an active or queued job
   */
  public async cancelJob(id: string, reason = "Cancelled by user"): Promise<boolean> {
    const job = await this.getJob(id);
    if (!job) return false;

    if (["completed", "failed", "cancelled"].includes(job.status)) {
      return false;
    }

    const now = Date.now();
    job.status = "cancelled";
    job.error = reason;
    job.completedAt = now;
    job.updatedAt = now;

    this.emit("job:cancelled", job);
    this.emit(`job:${id}:update`, job);
    this.emit(`job:${id}:done`, { status: "cancelled", job });

    const col = await this.getCollection();
    if (col) {
      col.updateOne(
        { id },
        {
          $set: {
            status: "cancelled",
            error: reason,
            completedAt: job.completedAt,
            updatedAt: job.updatedAt,
            leaseUntil: null,
          },
        }
      ).catch(() => {});
    }

    return true;
  }

  /**
   * List jobs for a user or all jobs
   */
  public async listJobs(filter: { userId?: string; status?: JobStatus; limit?: number }): Promise<AutomationJob[]> {
    const limit = Math.min(filter.limit || 50, 100);
    const col = await this.getCollection();

    if (col) {
      try {
        const query: any = {};
        if (filter.userId) query.userId = filter.userId;
        if (filter.status) query.status = filter.status;

        return await col
          .find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .toArray();
      } catch (err: any) {
        console.warn("[JobQueue] DB query failed, falling back to memory:", err.message);
      }
    }

    // Fallback to in-memory jobs
    return Array.from(this.inMemoryJobs.values())
      .filter((j) => {
        if (filter.userId && j.userId !== filter.userId) return false;
        if (filter.status && j.status !== filter.status) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Clean up old in-memory jobs older than 2 hours
   */
  private cleanupOldJobs(): void {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    for (const [id, job] of this.inMemoryJobs.entries()) {
      if (job.updatedAt < twoHoursAgo && ["completed", "failed", "cancelled"].includes(job.status)) {
        this.inMemoryJobs.delete(id);
      }
    }
  }
}

export const browserJobQueue = BrowserJobQueue.getInstance();
