import { DispatcWorkerEvents } from "./dispatch-worker-events.ts";

export function DispatchWorkerEvent(eventType: DispatcWorkerEvents) {
  return class DispatchWorkerEvent extends Event {
    constructor(
      public readonly workerId: string,
    ) {
      super(eventType);
    }
  };
}
