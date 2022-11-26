import { DispatchQueueEvents } from "./dispatch-queue-events.ts";

export class DispatchQueueRuntimeErrorEvent extends Event {
  constructor(
    public readonly error: unknown,
    public readonly message: string = "Startup exception",
  ) {
    super(DispatchQueueEvents.RuntimeError);
  }
}
