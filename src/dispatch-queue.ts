import { Queue } from "./queue.ts";
import { InProcessDispatchWorker } from "./workers/in-process-dispatch-worker.ts";
import { DispatcWorkerEvents } from "./events/dispatch-worker-events/dispatch-worker-events.ts";
import { DispatchWorkerStatusChangedEvent } from "./events/dispatch-worker-events/worker-status-changed-event.ts";
import {
  DispatchWorker,
  DispatchWorkerEventListener,
  DispatchWorkerStatus,
} from "./workers/dispatch-worker.ts";
import { DispatchQueueEvents } from "./events/dispatch-queue-events/dispatch-queue-events.ts";
import { DispatchQueueRuntimeErrorEvent } from "./events/dispatch-queue-events/dispatch-queue-runtime-error-event.ts";
import { DispatchQueueEventsMap } from "./events/dispatch-queue-events/dispatch-queue-events-map.ts";
import { DispatchWorkerErrorEvent } from "./events/dispatch-worker-events/dispatch-worker-error-event.ts";
import { DispatchQueueWorkerErrorEvent } from "./events/dispatch-queue-events/dispatch-queue-worker-error-event.ts";

interface DispatchQueueOptions<T> {
  autoStart?: boolean;
  concurrentWorkers?: number;
  processor(value: T, workerId: string): Promise<void>;
}

/**
 * A typed dispatch queue with configurable max concurrent processors
 */
export class DispatchQueue<T> {
  private _abortController?: AbortController;

  private readonly _dispatchQueueEvents = new EventTarget();
  private readonly _processQueue: Queue<T> = new Queue<T>();
  private readonly _readyDisptachWorkerQueue: Queue<DispatchWorker<T>> =
    new Queue<
      DispatchWorker<T>
    >();

  constructor({
    autoStart = true,
    concurrentWorkers = 2,
    processor,
  }: DispatchQueueOptions<T>) {
    for (let i = 0; i < concurrentWorkers; i++) {
      this._readyDisptachWorkerQueue.enque(
        new InProcessDispatchWorker(`worker-${i}`, {
          processor,
        }),
      );
    }

    if (!autoStart) {
      return;
    }

    this.startProcessing();
  }

  addEventListener<TEvent extends DispatchQueueEvents>(
    type: TEvent,
    listener: (ev: DispatchQueueEventsMap[TEvent]) => void,
  ): void {
    this._dispatchQueueEvents.addEventListener(type, listener as EventListener);
  }

  removeEventListener<TEvent extends DispatchQueueEvents>(
    type: TEvent,
    listener: (ev: DispatchQueueEventsMap[TEvent]) => void,
  ): void {
    this._dispatchQueueEvents.removeEventListener(
      type,
      listener as EventListener,
    );
  }

  /**
   * Add value to be processed by the dispatch queue
   */
  process<TValue extends T>(value: TValue): void {
    this._processQueue.enque(value);
  }

  /**
   * Starts the processing of items on the queue. Auto-starts on the creation of
   * the DispatchQueue
   */
  startProcessing() {
    this.run().catch((error) => {
      this._dispatchQueueEvents.dispatchEvent(
        new DispatchQueueRuntimeErrorEvent(error),
      );
    });
  }

  /**
   * Stops the processing of items on the queue
   */
  stopProcessing() {
    this._abortController?.abort();
  }

  private async run(): Promise<void> {
    this._abortController = new AbortController();

    const removeEventListeners = this.addWorkerEventListeners();

    while (!this._abortController.signal.aborted) {
      const nextValue = await this._processQueue.deque();
      const nextWorker = await this._readyDisptachWorkerQueue.deque();
      nextWorker.process(nextValue);
    }

    removeEventListeners();
  }

  private addWorkerEventListeners(): () => void {
    const removeEventListeners = this._readyDisptachWorkerQueue.map(
      (worker) => {
        const dispatchWorkerStatusChangedEventListener = (
          evt: DispatchWorkerStatusChangedEvent,
        ) => {
          if (evt.status === DispatchWorkerStatus.Ready) {
            this._readyDisptachWorkerQueue.enque(worker);
          }
        };

        const dispatchWorkerErrorEventListener = (
          evt: DispatchWorkerErrorEvent,
        ) => {
          this._dispatchQueueEvents.dispatchEvent(
            new DispatchQueueWorkerErrorEvent(evt.error, evt.workerId),
          );
        };

        worker.addEventListener(
          DispatcWorkerEvents.StatusChanged,
          dispatchWorkerStatusChangedEventListener as DispatchWorkerEventListener,
        );

        worker.addEventListener(
          DispatcWorkerEvents.Error,
          dispatchWorkerErrorEventListener as DispatchWorkerEventListener,
        );

        return () => {
          worker.removeEventListener(
            DispatcWorkerEvents.StatusChanged,
            dispatchWorkerStatusChangedEventListener as DispatchWorkerEventListener,
          );

          worker.removeEventListener(
            DispatcWorkerEvents.Error,
            dispatchWorkerErrorEventListener as DispatchWorkerEventListener,
          );
        };
      },
    );

    return () => {
      removeEventListeners.forEach((removeEventListener) =>
        removeEventListener()
      );
    };
  }
}
