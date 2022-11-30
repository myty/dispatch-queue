import { Queue } from "./queue.ts";
import { DispatcWorkerEvents } from "./events/dispatch-worker-events/dispatch-worker-events.ts";
import { DispatchWorkerStatusChangedEvent } from "./events/dispatch-worker-events/worker-status-changed-event.ts";
import { DispatchWorker } from "./dispatch-worker/dispatch-worker.ts";
import { DispatchWorkerStatus } from "./dispatch-worker/dispatch-worker-status.ts";
import { DispatchQueueEvents } from "./events/dispatch-queue-events/dispatch-queue-events.ts";
import { DispatchQueueRuntimeErrorEvent } from "./events/dispatch-queue-events/dispatch-queue-runtime-error-event.ts";
import { DispatchQueueEventsMap } from "./events/dispatch-queue-events/dispatch-queue-events-map.ts";
import { DispatchWorkerErrorEvent } from "./events/dispatch-worker-events/dispatch-worker-error-event.ts";
import { DispatchQueueWorkerErrorEvent } from "./events/dispatch-queue-events/dispatch-queue-worker-error-event.ts";

interface DispatchQueueOptions<T> {
  autoStart?: boolean;
  workers?: DispatchWorker<T>[];
}

interface DispatchQueueEventTarget extends EventTarget {
  addEventListener<TEventType extends DispatchQueueEvents>(
    type: TEventType,
    callback: (ev: DispatchQueueEventsMap[TEventType]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void;

  dispatchEvent<TEventType extends DispatchQueueEvents>(
    event: DispatchQueueEventsMap[TEventType],
  ): boolean;
  dispatchEvent(event: Event): boolean;

  removeEventListener<TEventType extends DispatchQueueEvents>(
    type: TEventType,
    callback: (ev: DispatchQueueEventsMap[TEventType]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void;
}

const TypedEventTarget = EventTarget as {
  new (): DispatchQueueEventTarget;
  prototype: DispatchQueueEventTarget;
};

/**
 * A typed dispatch queue with configurable max concurrent processors
 */
export class DispatchQueue<T> extends TypedEventTarget {
  private _abortController?: AbortController;

  private readonly _processQueue = new Queue<T>();
  private readonly _removeWorkerByIds: Array<string> = [];
  private readonly _readyDisptachWorkerQueue = new Queue<
    DispatchWorker<T>
  >();

  constructor({
    autoStart = true,
    workers = [],
  }: DispatchQueueOptions<T>) {
    super();

    workers.forEach((worker) => this._readyDisptachWorkerQueue.enque(worker));

    if (!autoStart) {
      return;
    }

    this.startProcessing();
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
      super.dispatchEvent(
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

  removeWorkerById(workerId: string): void {
    this._removeWorkerByIds.push(workerId);
  }

  private async run(): Promise<void> {
    this._abortController = new AbortController();

    const removeEventListeners = this.addWorkerEventListeners();

    while (!this._abortController.signal.aborted) {
      const nextWorker = await this._readyDisptachWorkerQueue.deque();
      const forgetWorker = this.foundWorkerToBeRemovedById(nextWorker.id);

      if (forgetWorker) {
        continue;
      }

      const nextValue = await this._processQueue.deque();
      nextWorker.process(nextValue);
    }

    removeEventListeners();
  }

  private foundWorkerToBeRemovedById(id: string): boolean {
    if (
      this._removeWorkerByIds.length > 0
    ) {
      const foundIndex = this._removeWorkerByIds.findIndex((workerId) =>
        workerId === id
      );

      if (foundIndex >= 0) {
        this._removeWorkerByIds.splice(foundIndex, 1);
        return true;
      }
    }

    return false;
  }

  private addWorkerEventListeners(): () => void {
    const removeEventListenerObjectss = this._readyDisptachWorkerQueue.map(
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
          super.dispatchEvent(
            new DispatchQueueWorkerErrorEvent(evt.error, evt.workerId),
          );
        };

        worker.addEventListener(
          DispatcWorkerEvents.StatusChanged,
          dispatchWorkerStatusChangedEventListener,
        );

        worker.addEventListener(
          DispatcWorkerEvents.Error,
          dispatchWorkerErrorEventListener,
        );

        return {
          workerId: worker.id,
          unsubscribe: () => {
            worker.removeEventListener(
              DispatcWorkerEvents.StatusChanged,
              dispatchWorkerStatusChangedEventListener,
            );

            worker.removeEventListener(
              DispatcWorkerEvents.Error,
              dispatchWorkerErrorEventListener,
            );
          },
        };
      },
    );

    return () => {
      removeEventListenerObjectss.forEach((removeEventListener) =>
        removeEventListener.unsubscribe()
      );
    };
  }
}
