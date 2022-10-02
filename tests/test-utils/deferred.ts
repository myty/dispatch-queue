export class Deferred<T = void> implements Promise<T> {
  private _resolveSelf?: (value: T | PromiseLike<T>) => void;
  private _rejectSelf?: (reason?: any) => void;
  private promise: Promise<T>;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this._resolveSelf = resolve;
      this._rejectSelf = reject;
    });
  }

  finally(onfinally?: (() => void) | null | undefined): Promise<T> {
    return this.promise.finally(onfinally);
  }

  [Symbol.toStringTag]: string = "Promise";

  public then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  public catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null,
  ): Promise<T | TResult> {
    return this.promise.catch(onrejected);
  }

  public resolve(val: T | PromiseLike<T>) {
    this._resolveSelf?.(val);
  }
  public reject(reason: any) {
    this._rejectSelf?.(reason);
  }
}
