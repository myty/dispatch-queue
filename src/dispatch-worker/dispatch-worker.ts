import { DispatchWorkerStatus } from "./dispatch-worker-status.ts";
import { DispatchWorkerErrorEvent } from "../events/dispatch-worker-events/dispatch-worker-error-event.ts";
import { DispatchWorkerEventMap } from "../events/dispatch-worker-events/dispatch-worker-events-map.ts";
import { DispatcWorkerEvents } from "../events/dispatch-worker-events/dispatch-worker-events.ts";
import { DispatchWorkerStatusChangedEvent } from "../events/dispatch-worker-events/worker-status-changed-event.ts";

interface DispatchWorkerOptions<T> {
  id: string;
  processor<TValue extends T>(
    value: TValue,
    workerId: string,
  ): void | Promise<void>;
}

interface DispatchWorkerEventTarget extends EventTarget {
  addEventListener<TEventType extends DispatcWorkerEvents>(
    type: TEventType,
    callback: (ev: DispatchWorkerEventMap[TEventType]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void;

  dispatchEvent<TEventType extends DispatcWorkerEvents>(
    event: DispatchWorkerEventMap[TEventType],
  ): boolean;
  dispatchEvent(event: Event): boolean;

  removeEventListener<TEventType extends DispatcWorkerEvents>(
    type: TEventType,
    callback: (ev: DispatchWorkerEventMap[TEventType]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean,
  ): void;
}

const TypedEventTarget = EventTarget as {
  new (): DispatchWorkerEventTarget;
  prototype: DispatchWorkerEventTarget;
};

export abstract class DispatchWorker<T> extends TypedEventTarget {
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
    super.dispatchEvent(
      new DispatchWorkerStatusChangedEvent(
        this.id,
        DispatchWorkerStatus.Processing,
      ),
    );

    Promise.resolve(this._processor(value, this.id))
      .catch((err) => {
        super.dispatchEvent(
          new DispatchWorkerErrorEvent(err, this.id),
        );
      })
      .finally(() => {
        super.dispatchEvent(
          new DispatchWorkerStatusChangedEvent(
            this.id,
            DispatchWorkerStatus.Ready,
          ),
        );
      });
  }
}
