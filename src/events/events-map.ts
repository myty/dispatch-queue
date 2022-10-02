import { DispatchQueueStartupErrorEvent } from "./startup-error-event";
import { DispatchQueueWorkerErrorEvent } from "./worker-error-event";
import { DispatchQueueEvents } from "./events";

export interface DispatchQueueEventMap {
  [DispatchQueueEvents.WorkerError]: DispatchQueueWorkerErrorEvent;
  [DispatchQueueEvents.StartupError]: DispatchQueueStartupErrorEvent;
}
