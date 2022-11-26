import { DispatchWorker } from "./dispatch-worker.ts";

interface InProcessDispatchWorkerOptions<T> {
  processor(value: T, workerId: string): void | Promise<void>;
}

export class InProcessDispatchWorker<T> extends DispatchWorker<T> {
  constructor(
    id: string,
    options: InProcessDispatchWorkerOptions<T>,
  ) {
    super(id);
    this.processor = options.processor;
  }

  readonly processor: (value: T, workerId: string) => void | Promise<void>;
}
