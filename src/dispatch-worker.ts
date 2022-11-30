import { DispatchWorkerStatus } from "./dispatch-worker-status.ts";
import { DispatchWorkerErrorEvent } from "./events/dispatch-worker-events/dispatch-worker-error-event.ts";
import { DispatchWorkerEventMap } from "./events/dispatch-worker-events/dispatch-worker-events-map.ts";
import { DispatcWorkerEvents } from "./events/dispatch-worker-events/dispatch-worker-events.ts";
import { DispatchWorkerStatusChangedEvent } from "./events/dispatch-worker-events/worker-status-changed-event.ts";

interface DispatchWorkerOptions<T> {
  id: string;
  processor<TValue extends T>(
    value: TValue,
    workerId: string,
  ): void | Promise<void>;
}

export abstract class DispatchWorker<T> extends EventTarget {
  private _status: DispatchWorkerStatus = DispatchWorkerStatus.Ready;
  private readonly _processor: <TValue extends T>(
    value: TValue,
    workerId: string,
  ) => void | Promise<void>;

  public readonly id: string;

  constructor({ id, processor }: DispatchWorkerOptions<T>) {
    super();
    this.id = id;
    this._processor = processor;
  }

  process<TValue extends T>(value: TValue): void {
    this.status = DispatchWorkerStatus.Processing;

    Promise.resolve(this._processor(value, this.id))
      .catch((err) => {
        super.dispatchEvent(
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
    super.dispatchEvent(
      new DispatchWorkerStatusChangedEvent(this.id, value),
    );
  }

  addEventListener = <TEventType extends DispatcWorkerEvents>(
    type: TEventType,
    listener: DispatchWorkerEventMap[TEventType],
  ): void => super.addEventListener(type, listener);

  removeEventListener = <TEventType extends DispatcWorkerEvents>(
    type: TEventType,
    listener: DispatchWorkerEventMap[TEventType],
  ): void => super.removeEventListener(type, listener);
}
