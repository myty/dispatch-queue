import { DispatchWorkerErrorEvent } from "./dispatch-worker-error-event.ts";
import { DispatcWorkerEvents } from "./dispatch-worker-events.ts";
import { DispatchWorkerStatusChangedEvent } from "./worker-status-changed-event.ts";

export interface DispatchWorkerEventMap {
  [DispatcWorkerEvents.Error]: (
    evt: DispatchWorkerErrorEvent,
  ) => void | Promise<void>;
  [DispatcWorkerEvents.StatusChanged]: (
    evt: DispatchWorkerStatusChangedEvent,
  ) => void | Promise<void>;
}
