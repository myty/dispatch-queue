import { DispatchWorker } from "./dispatch-worker.ts";

export class StandardDispatchWorker<T> extends DispatchWorker<T> {
  constructor(
    id: string,
    processor: (value: T, workerId: string) => void | Promise<void>,
  ) {
    super({ id, processor });
  }
}
