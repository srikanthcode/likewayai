import EventEmitter from "events";

export type TaskState =
  | "CREATED"
  | "QUEUED"
  | "PLANNING"
  | "RUNNING"
  | "EXECUTING"
  | "VERIFYING"
  | "WAITING_FOR_USER"
  | "WAITING_FOR_PAGE"
  | "RECOVERING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface TaskStateEvent {
  taskId: string;
  fromState: TaskState;
  toState: TaskState;
  message?: string;
  timestamp: number;
  data?: any;
}

export class AgentStateMachine extends EventEmitter {
  private taskId: string;
  private currentState: TaskState;
  private history: TaskStateEvent[] = [];
  private createdAt: number;

  constructor(taskId: string, initialState: TaskState = "CREATED") {
    super();
    this.taskId = taskId;
    this.currentState = initialState;
    this.createdAt = Date.now();
  }

  public getState(): TaskState {
    return this.currentState;
  }

  public getHistory(): TaskStateEvent[] {
    return [...this.history];
  }

  public transition(toState: TaskState, message?: string, data?: any): boolean {
    const fromState = this.currentState;

    // Terminal states cannot transition further
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(fromState)) {
      console.warn(`[StateMachine] Task ${this.taskId} is already in terminal state ${fromState}. Cannot transition to ${toState}.`);
      return false;
    }

    this.currentState = toState;
    const event: TaskStateEvent = {
      taskId: this.taskId,
      fromState,
      toState,
      message,
      timestamp: Date.now(),
      data,
    };

    this.history.push(event);
    this.emit("stateChanged", event);
    this.emit(`state:${toState}`, event);

    return true;
  }

  public isTerminal(): boolean {
    return ["COMPLETED", "FAILED", "CANCELLED"].includes(this.currentState);
  }

  public toJSON() {
    return {
      taskId: this.taskId,
      state: this.currentState,
      historyCount: this.history.length,
      elapsedMs: Date.now() - this.createdAt,
      lastEvent: this.history[this.history.length - 1] || null,
    };
  }
}
