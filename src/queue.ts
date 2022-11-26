enum QueueEvents {
  Enqued = "enqued",
}

export class Queue<T> {
  private readonly _queue: Array<T> = [];
  private readonly _eventTarget: EventTarget = new EventTarget();

  map<TOutput>(
    callbackfn: (value: T, index: number, array: T[]) => TOutput,
  ): TOutput[] {
    return this._queue.map(callbackfn);
  }

  flatMap<TOutput>(
    callback: (
      value: T,
      index: number,
      array: T[],
    ) => TOutput | ReadonlyArray<TOutput>,
  ): TOutput[] {
    return this._queue.flatMap(callback);
  }

  enque<TValue extends T>(value: TValue): void {
    this._queue.push(value);
    this._eventTarget.dispatchEvent(new Event(QueueEvents.Enqued));
  }

  async deque(): Promise<T> {
    return (
      this._queue.shift() ??
        (await new Promise((resolve) => {
          const onEnque = () => {
            const value = this._queue.shift();

            if (value != null) {
              this._eventTarget.removeEventListener(
                QueueEvents.Enqued,
                onEnque,
              );
              resolve(value);
            }
          };

          this._eventTarget.addEventListener(QueueEvents.Enqued, onEnque);
        }))
    );
  }
}
