enum WorkerStatus {
  Ready,
  Processing,
}

interface WorkerOptions<T> {
  processor(value: T, workerId: string): Promise<void>;
  onComplete(worker: Worker<T>): void;
  onError(workerId: string, error: any): void;
}

export class Worker<T> implements Worker<T> {
  public status: WorkerStatus = WorkerStatus.Ready;

  constructor(public id: string, private options: WorkerOptions<T>) {}

  process<TValue extends T>(value: TValue): void {
    this.status = WorkerStatus.Processing;
    this.options
      .processor(value, this.id)
      .catch((error) => this.options.onError(this.id, error))
      .finally(() => {
        this.status = WorkerStatus.Ready;
        this.options.onComplete(this);
      });
  }
}
