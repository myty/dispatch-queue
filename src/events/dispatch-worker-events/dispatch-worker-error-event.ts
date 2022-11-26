import { DispatchWorkerEvent } from "./dispatch-worker-event.ts";
import { DispatcWorkerEvents } from "./dispatch-worker-events.ts";

export class DispatchWorkerErrorEvent
  extends DispatchWorkerEvent(DispatcWorkerEvents.Error) {
  constructor(
    public readonly error: unknown,
    workerId: string,
  ) {
    super(workerId);
  }
}
