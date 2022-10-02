import { DispatchQueueEvents } from "./events.ts";

export class DispatchQueueStartupErrorEvent extends Event {
  constructor(
    public readonly error: unknown,
    public readonly message: string = "Startup exception",
  ) {
    super(DispatchQueueEvents.StartupError);
  }
}
