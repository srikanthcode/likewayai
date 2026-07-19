/**
 * DEPRECATED — This file is a backward-compatibility wrapper.
 * All functionality has been moved to browser-engine.ts (v7).
 *
 * Re-export everything from the unified engine.
 */
export { runAgent, runAgentFrom } from "./browser-engine";
export type {
  AgentResult,
  AgentAction,
  AgentStep,
  AgentOptions,
  DOMElement,
  PageSnapshot,
  ActionType,
  BrowserPhase,
} from "./browser-engine";
