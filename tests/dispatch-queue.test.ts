import {
  afterEach,
  assert,
  assertExists,
  assertSpyCall,
  assertSpyCalls,
  beforeEach,
  Deferred,
  delay,
  describe,
  it,
  returnsNext,
  Spy,
  spy,
  Stub,
  stub,
} from "./deps.ts";

import { DispatchQueue } from "../src/dispatch-queue.ts";
import { Queue } from "../src/queue.ts";
import { DispatchQueueWorkerErrorEvent } from "../src/events/dispatch-queue-events/dispatch-queue-worker-error-event.ts";
import { DispatchQueueEvents } from "../src/events/dispatch-queue-events/dispatch-queue-events.ts";
import { DispatchQueueRuntimeErrorEvent } from "../src/events/dispatch-queue-events/dispatch-queue-runtime-error-event.ts";
import { DispatchWorker } from "../src/dispatch-worker/dispatch-worker.ts";
import { StandardDispatchWorker } from "../src/dispatch-worker/standard-dispatch-worker.ts";

describe("Dispatch", () => {
  let dispatcher: DispatchQueue<string>;
  let mockedProcessor: Spy<
    unknown,
    [value: string, workerId: string],
    Promise<void>
  >;

  beforeEach(() => {
    mockedProcessor = spy((_value, _workerId) => Promise.resolve());
    dispatcher = new DispatchQueue<string>({
      workers: createWorkers(mockedProcessor),
    });
  });

  afterEach(() => {
    dispatcher.stopProcessing();
  });

  it("create concurrent queue", () => {
    assertExists(dispatcher);
  });

  it("can enqueue value to queue", () => {
    dispatcher.process("test");
  });

  it("processes enqueued value", async () => {
    // Arrange
    const value = "test";
    const deferredPromise = new Deferred<void>();
    mockedProcessor = spy(async (_value, _workerId) => {
      deferredPromise.resolve();
      return await deferredPromise;
    });

    dispatcher = new DispatchQueue<string>({
      workers: createWorkers(mockedProcessor),
    });

    // Act
    dispatcher.process(value);
    await deferredPromise;

    // Arrange
    assertSpyCall(mockedProcessor, 0);
  });

  describe("concurrent processors", () => {
    [
      { concurrentProcessorCount: 1, processCount: 2 },
      { concurrentProcessorCount: 3, processCount: 3 },
      { concurrentProcessorCount: 4, processCount: 10 },
      { concurrentProcessorCount: 5, processCount: 27 },
      { concurrentProcessorCount: 6, processCount: 6 },
      { concurrentProcessorCount: 7, processCount: 50 },
      { concurrentProcessorCount: 31, processCount: 50 },
    ].forEach(({ concurrentProcessorCount, processCount }) => {
      describe(`when processCount=${processCount} and concurrentProcessorCount=${concurrentProcessorCount}`, () => {
        const workerDelayMs = 25;
        let deferredPromises: Record<string, Deferred<void>>;

        beforeEach(() => {
          deferredPromises = {};
          mockedProcessor = spy(async (value, _workerId) => {
            await delay(workerDelayMs);
            deferredPromises[value].resolve();
          });
          dispatcher = new DispatchQueue<string>({
            workers: createWorkers(mockedProcessor, concurrentProcessorCount),
          });
        });

        it("processes", async () => {
          // Arrange
          const expectedDuration =
            Math.ceil(processCount / concurrentProcessorCount) * workerDelayMs +
            concurrentProcessorCount * workerDelayMs;

          // Arrange & Act
          const startTime = Date.now();
          const deferredPromiseArray: Deferred<void>[] = [];

          for (let index = 0; index < processCount; index++) {
            const value = `value-${index}`;
            const deferredPromise = new Deferred<void>();

            deferredPromiseArray.push(deferredPromise);

            deferredPromises = {
              ...deferredPromises,
              [value]: deferredPromise,
            };

            dispatcher.process(value);
          }

          await Promise.allSettled(deferredPromiseArray);

          // Assert
          const duration = Date.now() - startTime;
          assertSpyCall(mockedProcessor, processCount - 1);
          assert(expectedDuration >= duration);
          assert(workerDelayMs <= duration);
        });
      });
    });
  });

  describe("when worker has exception", () => {
    beforeEach(() => {
      mockedProcessor = spy((_value, _workerId) =>
        Promise.reject("this is an error")
      );
      dispatcher = new DispatchQueue<string>({
        workers: createWorkers(mockedProcessor),
      });
    });

    it("handles event", async () => {
      // Arrange
      const deferredPromise = new Deferred<void>();
      const eventListener = spy((_evt: DispatchQueueWorkerErrorEvent) => {
        deferredPromise.resolve();
      });
      dispatcher.addEventListener(
        DispatchQueueEvents.WorkerError,
        eventListener,
      );

      // Act
      dispatcher.process("test1");
      await deferredPromise;

      // Assert
      assertSpyCall(mockedProcessor, 0);
    });
  });

  describe("when removeEventListener()", () => {
    let eventListener: Spy<
      unknown,
      [_evt: DispatchQueueWorkerErrorEvent],
      void
    >;

    beforeEach(() => {
      mockedProcessor = spy((_value, _workerId) =>
        Promise.reject("this is an error")
      );
      dispatcher = new DispatchQueue<string>({
        workers: createWorkers(mockedProcessor),
      });

      eventListener = spy((_evt: DispatchQueueWorkerErrorEvent) => {});

      dispatcher.addEventListener(
        DispatchQueueEvents.WorkerError,
        eventListener,
      );
    });

    it("does not handle event", async () => {
      // Arrange
      dispatcher.removeEventListener(
        DispatchQueueEvents.WorkerError,
        eventListener,
      );

      // Act
      dispatcher.process("test1");
      await delay(10);

      // Assert
      assertSpyCalls(eventListener, 0);
    });
  });

  describe("when unhandle runtime error occurs", () => {
    let stubbedDequeue: Stub<Queue<unknown>, [], Promise<unknown>>;

    beforeEach(() => {
      stubbedDequeue = stub(
        Queue.prototype,
        "deque",
        returnsNext([Promise.reject()]),
      );

      mockedProcessor = spy((_value, _workerId) => Promise.resolve());

      dispatcher = new DispatchQueue<string>({
        workers: createWorkers(mockedProcessor),
      });
    });

    afterEach(() => {
      stubbedDequeue.restore();
    });

    it("it handles exception", async () => {
      const deferredPromise = new Deferred<void>();

      const eventListener = spy((_evt: DispatchQueueRuntimeErrorEvent) => {
        deferredPromise.resolve();
      });

      dispatcher.addEventListener(
        DispatchQueueEvents.RuntimeError,
        eventListener,
      );

      dispatcher.process("test");
      dispatcher.startProcessing();

      await deferredPromise;

      assertSpyCalls(eventListener, 2);
    });
  });
});

function createWorkers<T>(
  processor: (value: T, workerId: string) => void | Promise<void>,
  count = 2,
): DispatchWorker<string>[] {
  const workers: DispatchWorker<T>[] = [];

  for (let i = 0; i < count; i++) {
    workers.push(
      new StandardDispatchWorker(`worker-${i}`, processor),
    );
  }

  return workers;
}
