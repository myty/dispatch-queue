enum QueueEvents {
  Enqued = 'enqued',
}

class Queue<T> {
  private readonly _queue: Array<T> = [];
  private readonly _eventTarget: EventTarget = new EventTarget();

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
            this._eventTarget.removeEventListener(QueueEvents.Enqued, onEnque);
            resolve(value);
          }
        };

        this._eventTarget.addEventListener(QueueEvents.Enqued, onEnque);
      }))
    );
  }
}

export class Dispatch<T> {
  private _abortController: AbortController;

  private readonly _queue: Queue<T> = new Queue<T>();
  private readonly _readyWorkerQueue: Queue<Worker<T>> = new Queue<Worker<T>>();

  constructor(
    processor: (value: T, workerId: string) => Promise<void>,
    concurrentWorkers = 2
  ) {
    for (let i = 0; i < concurrentWorkers; i++) {
      this._readyWorkerQueue.enque(
        new Worker(`id-${i}`, processor, (worker) =>
          this._readyWorkerQueue.enque(worker)
        )
      );
    }

    this.startProcessing();
  }

  process<TValue extends T>(value: TValue): void {
    this._queue.enque(value);
  }

  startProcessing() {
    this.start().catch((error) => {
      console.error('Startup exception', { ...error });
    });
  }

  stopProcessing() {
    this._abortController.abort();
  }

  private async start(): Promise<void> {
    this._abortController = new AbortController();

    do {
      const nextValue = await this._queue.deque();
      const nextWorker = await this._readyWorkerQueue.deque();
      nextWorker.process(nextValue);
    } while (this._abortController.signal.aborted);
  }
}

enum WorkerStatus {
  Ready,
  Processing,
}

class Worker<T> implements Worker<T> {
  public status: WorkerStatus = WorkerStatus.Ready;
  constructor(
    public id: string,
    private processor: (value: T, workerId: string) => Promise<void>,
    private onComplete: (value: Worker<T>) => void
  ) {}

  process<TValue extends T>(value: TValue): void {
    this.status = WorkerStatus.Processing;
    this.processor(value, this.id)
      .catch((error) => {
        console.error('Unhandled exception', { ...error });
      })
      .finally(() => {
        this.status = WorkerStatus.Ready;
        this.onComplete(this);
      });
  }
}
