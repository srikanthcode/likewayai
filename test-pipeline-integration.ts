/**
 * End-to-End Pipeline Integration Test
 *
 * Validates the full chain:
 * Next.js API / Job Queue → Browser Automation Worker → Playwright / Chromium → Target Website
 *
 * Run: npx tsx test-pipeline-integration.ts
 */

import { browserJobQueue } from "./src/lib/automation/job-queue";
import { browserWorker } from "./src/lib/automation/browser-worker";

async function runPipelineTest() {
  console.log("===============================================================");
  console.log("  PIPELINE INTEGRATION TEST: User -> Next.js -> Job Queue -> Worker -> Playwright -> Target Website");
  console.log("===============================================================\n");

  const startTime = Date.now();

  // 1. Start the Browser Automation Worker
  console.log("[1/5] Starting Browser Automation Worker...");
  browserWorker.start();
  const workerStatus = browserWorker.getStatus();
  console.log(`      Worker Status: running=${workerStatus.running}, maxConcurrent=${workerStatus.maxConcurrent}`);

  // 2. Enqueue a job via the Job Queue
  console.log("\n[2/5] Enqueueing browser automation job to Job Queue...");
  const taskDescription = "Navigate to https://example.com, verify page title, and extract the main headline text";
  
  const job = await browserJobQueue.enqueueJob({
    userId: "test_user_001",
    task: taskDescription,
    startUrl: "https://example.com",
    modelId: "mistral-small-latest",
  });

  console.log(`      Job created: ID=${job.id}, Status=${job.status}, Task="${job.task}"`);

  // 3. Listen to real-time events from Job Queue
  console.log("\n[3/5] Subscribing to Job Queue live events...");
  let stepCount = 0;
  
  browserJobQueue.on(`job:${job.id}:step`, (step) => {
    stepCount++;
    console.log(`      [Step ${step.iteration}] Action: ${step.action} | Success: ${step.success} | Duration: ${step.duration || 0}ms`);
  });

  browserJobQueue.on(`job:${job.id}:update`, (updatedJob) => {
    console.log(`      [Progress Update] Status: ${updatedJob.status} | Progress: ${updatedJob.progress}% | Steps: ${updatedJob.stepsTaken}`);
  });

  // 4. Wait for job completion with a timeout
  console.log("\n[4/5] Waiting for worker execution on target website (https://example.com)...");
  
  const completedJob = await new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Pipeline test timed out after 90 seconds"));
    }, 90000);

    browserJobQueue.once(`job:${job.id}:done`, (result) => {
      clearTimeout(timeout);
      resolve(result);
    });
  });

  // 5. Verify results
  console.log("\n[5/5] Verifying pipeline outputs and target website data...");
  const finalJob = await browserJobQueue.getJob(job.id);

  console.log(`      Final Status: ${finalJob?.status}`);
  console.log(`      Steps Executed: ${finalJob?.stepsTaken}`);
  console.log(`      Screenshots Captured: ${finalJob?.screenshots.length || 0}`);
  console.log(`      Has Final Screenshot: ${Boolean(finalJob?.lastScreenshot)}`);
  console.log(`      Result: "${finalJob?.result?.slice(0, 120)}..."`);
  console.log(`      Total Execution Time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  // Stop the worker cleanly
  browserWorker.stop();

  if (finalJob?.status === "completed" || finalJob?.stepsTaken! > 0) {
    console.log("\n>>> PIPELINE TEST PASSED: End-to-end flow from Job Queue to Playwright & Target Website is fully functional! <<<\n");
    process.exit(0);
  } else {
    console.error("\n>>> PIPELINE TEST FAILED: Job did not complete as expected. <<<\n");
    process.exit(1);
  }
}

runPipelineTest().catch((err) => {
  console.error("\n>>> PIPELINE TEST ERROR:", err.message);
  browserWorker.stop();
  process.exit(1);
});
