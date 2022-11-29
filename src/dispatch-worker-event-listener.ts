export type DispatchWorkerEventListener = <
  TEvent extends Event,
>(ev: TEvent) => void | Promise<void>;
