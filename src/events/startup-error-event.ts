import { DispatchQueueEvents } from "./events";

export class DispatchQueueStartupErrorEvent extends Event {
  constructor(
    public readonly error: any,
    public readonly message: string = "Startup exception"
  ) {
    super(DispatchQueueEvents.StartupError);
  }
}