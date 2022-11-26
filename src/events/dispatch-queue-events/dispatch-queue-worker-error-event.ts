import { DispatchQueueEvents } from "./dispatch-queue-events.ts";

export class DispatchQueueWorkerErrorEvent extends Event {
  constructor(
    public readonly error: unknown,
    public readonly workerId: string,
  ) {
    super(DispatchQueueEvents.WorkerError);
  }
}
