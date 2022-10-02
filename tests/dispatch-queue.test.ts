import { DispatchQueue } from "../src/dispatch-queue.ts";
import { DispatchQueueEvents } from "../src/events/events.ts";
import { DispatchQueueWorkerErrorEvent } from "../src/events/worker-error-event.ts";
import { delay } from "https://deno.land/std@0.154.0/async/delay.ts";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std@0.158.0/testing/bdd.ts";
import {
  assert,
  assertExists,
} from "https://deno.land/std@0.158.0/testing/asserts.ts";
import {
  assertSpyCall,
  Spy,
  spy,
} from "https://deno.land/std@0.158.0/testing/mock.ts";
import { Deferred } from "./test-utils/deferred.ts";

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
      processor: mockedProcessor,
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
    const deferredPromise = new Deferred();
    mockedProcessor = spy(async (_value, _workerId) => {
      deferredPromise.resolve();
      return await deferredPromise;
    });

    dispatcher = new DispatchQueue<string>({
      processor: mockedProcessor,
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
        let deferredPromises: Record<string, Deferred>;

        beforeEach(() => {
          deferredPromises = {};
          mockedProcessor = spy(async (value, _workerId) => {
            await delay(workerDelayMs);
            deferredPromises[value].resolve();
          });

          dispatcher = new DispatchQueue<string>({
            processor: mockedProcessor,
            concurrentWorkers: concurrentProcessorCount,
          });
        });

        it("processes", async () => {
          // Arrange
          const expectedDuration =
            Math.ceil(processCount / concurrentProcessorCount) * workerDelayMs +
            concurrentProcessorCount * 25;

          // Arrange & Act
          const startTime = Date.now();
          const deferredPromiseArray: Deferred[] = [];

          for (let index = 0; index < processCount; index++) {
            const value = `value-${index}`;
            const deferredPromise = new Deferred();

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
        processor: mockedProcessor,
      });
    });

    it("handles event", async () => {
      // Arrange
      const deferredPromise = new Deferred();
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
});
