import { DispatchQueueEvents } from "./dispatch-queue-events.ts";
import { DispatchQueueRuntimeErrorEvent } from "./dispatch-queue-runtime-error-event.ts";
import { DispatchQueueWorkerErrorEvent } from "./dispatch-queue-worker-error-event.ts";

export interface DispatchQueueEventsMap {
  [DispatchQueueEvents.WorkerError]: DispatchQueueWorkerErrorEvent;
  [DispatchQueueEvents.RuntimeError]: DispatchQueueRuntimeErrorEvent;
}
