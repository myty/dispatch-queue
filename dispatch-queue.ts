import { DispatchQueueEventMap } from "./events/events-map";
import { DispatchQueueEvents } from "./events/events";
import { DispatchQueueStartupErrorEvent } from "./events/startup-error-event";
import { DispatchQueueWorkerErrorEvent } from "./events/worker-error-event";
import { Queue } from "./queue";
import { Worker } from "./worker";

interface DispatchQueueOptions<T> {
  processor(value: T, workerId: string): Promise<void>;
  concurrentWorkers?: number;
}

export class DispatchQueue<T> {
  private _abortController: AbortController;

  private readonly _events = new EventTarget();
  private readonly _queue: Queue<T> = new Queue<T>();
  private readonly _readyWorkerQueue: Queue<Worker<T>> = new Queue<Worker<T>>();

  constructor({ processor, concurrentWorkers = 2 }: DispatchQueueOptions<T>) {
    for (let i = 0; i < concurrentWorkers; i++) {
      this._readyWorkerQueue.enque(
        new Worker(`worker-${i}`, {
          processor,
          onComplete: (worker) => this._readyWorkerQueue.enque(worker),
          onError: (id, error) => {
            this._events.dispatchEvent(
              new DispatchQueueWorkerErrorEvent(error, id)
            );
          },
        })
      );
    }

    this.startProcessing();
  }

  addEventListener<TEvent extends DispatchQueueEvents>(
    type: TEvent,
    listener: (ev: DispatchQueueEventMap[TEvent]) => void
  ): void {
    this._events.addEventListener(type, listener as EventListener);
  }

  removeEventListener<TEvent extends DispatchQueueEvents>(
    type: TEvent,
    listener: (ev: DispatchQueueEventMap[TEvent]) => void
  ): void {
    this._events.removeEventListener(type, listener as EventListener);
  }

  process<TValue extends T>(value: TValue): void {
    this._queue.enque(value);
  }

  startProcessing() {
    this.start().catch((error) => {
      this._events.dispatchEvent(new DispatchQueueStartupErrorEvent(error));
    });
  }

  stopProcessing() {
    this._abortController.abort();
  }

  private async start(): Promise<void> {
    this._abortController = new AbortController();

    while (!this._abortController.signal.aborted) {
      const nextValue = await this._queue.deque();
      const nextWorker = await this._readyWorkerQueue.deque();
      nextWorker.process(nextValue);
    }
  }
}
