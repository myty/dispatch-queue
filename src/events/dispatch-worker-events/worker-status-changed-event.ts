import { DispatchWorkerStatus } from "../../dispatch-worker-status.ts";
import { DispatchWorkerEvent } from "./dispatch-worker-event.ts";
import { DispatcWorkerEvents } from "./dispatch-worker-events.ts";

export class DispatchWorkerStatusChangedEvent
  extends DispatchWorkerEvent(DispatcWorkerEvents.StatusChanged) {
  constructor(
    workerId: string,
    public readonly status: DispatchWorkerStatus,
  ) {
    super(workerId);
  }
}
