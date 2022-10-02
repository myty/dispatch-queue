import { DispatchQueueStartupErrorEvent } from "./startup-error-event.ts";
import { DispatchQueueWorkerErrorEvent } from "./worker-error-event.ts";
import { DispatchQueueEvents } from "./events.ts";

export interface DispatchQueueEventMap {
  [DispatchQueueEvents.WorkerError]: DispatchQueueWorkerErrorEvent;
  [DispatchQueueEvents.StartupError]: DispatchQueueStartupErrorEvent;
}
