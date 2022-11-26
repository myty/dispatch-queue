import { DispatchWorkerErrorEvent } from "../events/dispatch-worker-events/dispatch-worker-error-event.ts";
import { DispatchWorkerEventMap } from "../events/dispatch-worker-events/dispatch-worker-events-map.ts";
import { DispatcWorkerEvents } from "../events/dispatch-worker-events/dispatch-worker-events.ts";
import { DispatchWorkerStatusChangedEvent } from "../events/dispatch-worker-events/worker-status-changed-event.ts";

export enum DispatchWorkerStatus {
  Ready,
  Processing,
}

export type DispatchWorkerEventListener = <
  TEvent extends Event,
>(ev: TEvent) => void | Promise<void>;

export abstract class DispatchWorker<T> {
  private readonly _dispatchWorkerEvents = new EventTarget();

  private _status: DispatchWorkerStatus = DispatchWorkerStatus.Ready;

  constructor(public readonly id: string) {}

  abstract processor<TValue extends T>(
    value: TValue,
    workerId: string,
  ): void | Promise<void>;

  process<TValue extends T>(value: TValue): void {
    this.status = DispatchWorkerStatus.Processing;

    Promise.resolve(this.processor(value, this.id))
      .catch((err) => {
        this._dispatchWorkerEvents.dispatchEvent(
          new DispatchWorkerErrorEvent(err, this.id),
        );
      })
      .finally(() => {
        this.status = DispatchWorkerStatus.Ready;
      });
  }

  get status() {
    return this._status;
  }

  set status(value: DispatchWorkerStatus) {
    this._status = value;
    this._dispatchWorkerEvents.dispatchEvent(
      new DispatchWorkerStatusChangedEvent(this.id, value),
    );
  }

  addEventListener<TEventType extends DispatcWorkerEvents>(
    type: TEventType,
    listener: DispatchWorkerEventListener & DispatchWorkerEventMap[TEventType],
  ): void {
    this._dispatchWorkerEvents.addEventListener(
      type,
      listener,
    );
  }

  removeEventListener<TEventType extends DispatcWorkerEvents>(
    type: TEventType,
    listener: DispatchWorkerEventListener & DispatchWorkerEventMap[TEventType],
  ): void {
    this._dispatchWorkerEvents.removeEventListener(
      type,
      listener,
    );
  }
}
