/**
 * DEPRECATED — This file is a backward-compatibility wrapper.
 * Task planning is now integrated into browser-engine.ts (v6).
 *
 * Re-export from tasks.ts for any code still importing from here.
 */
export { planAutomation, type AutomationPlan, type AutomationStep } from "./tasks";
