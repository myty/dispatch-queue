import { DispatchQueueEvents } from "./events";

export class DispatchQueueWorkerErrorEvent extends Event {
  constructor(public readonly error: any, public readonly workerId: string) {
    super(DispatchQueueEvents.WorkerError);
  }
}
