import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { DispatchQueue } from "../src/dispatch-queue";
import { DispatchQueueEvents } from "../src/events/events";
import { DispatchQueueWorkerErrorEvent } from "../src/events/worker-error-event";
import { Deferred } from "./test-utils/deferred";
import { delay } from "./test-utils/delay";

describe("Dispatch", () => {
  let dispatcher: DispatchQueue<string>;
  let mockedProcessor: Mock<[value: string, workerId: string], Promise<void>>;

  beforeEach(() => {
    mockedProcessor = vi.fn((_value, _workerId) => Promise.resolve());
    dispatcher = new DispatchQueue<string>({
      processor: mockedProcessor,
    });
  });

  afterEach(() => {
    dispatcher.stopProcessing();
  });

  it("create concurrent queue", () => {
    expect(dispatcher).to.be.ok;
  });

  it("can enqueue value to queue", () => {
    expect(() => dispatcher.process("test")).to.be.ok;
  });

  it("processes enqueued value", async () => {
    // Arrange
    const value = "test";
    const deferredPromise = new Deferred();
    mockedProcessor = vi.fn(async (_value, _workerId) => {
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
    expect(mockedProcessor).toHaveBeenCalledOnce();
  });

  describe.each([
    { concurrentProcessorCount: 1, processCount: 2 },
    { concurrentProcessorCount: 3, processCount: 3 },
    { concurrentProcessorCount: 4, processCount: 10 },
    { concurrentProcessorCount: 5, processCount: 27 },
    { concurrentProcessorCount: 6, processCount: 6 },
    { concurrentProcessorCount: 7, processCount: 50 },
    { concurrentProcessorCount: 31, processCount: 50 },
  ])(
    "when processCount=$processCount and concurrentProcessorCount=$concurrentProcessorCount",
    ({ concurrentProcessorCount, processCount }) => {
      const workerDelayMs = 25;
      let deferredPromises: Record<string, Deferred>;

      beforeEach(() => {
        deferredPromises = {};
        mockedProcessor = vi.fn(async (value, _workerId) => {
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
        expect(mockedProcessor).toHaveBeenCalledTimes(processCount);
        expect(expectedDuration).toBeGreaterThanOrEqual(duration);
        expect(workerDelayMs).toBeLessThanOrEqual(duration);
      });
    }
  );

  describe("when worker has exception", () => {
    beforeEach(() => {
      mockedProcessor = vi.fn((_value, _workerId) =>
        Promise.reject("this is an error")
      );
      dispatcher = new DispatchQueue<string>({
        processor: mockedProcessor,
      });
    });

    it("handles event", async () => {
      // Arrange
      const deferredPromise = new Deferred();
      const eventListener = vi.fn((evt: DispatchQueueWorkerErrorEvent) => {
        deferredPromise.resolve();
      });
      dispatcher.addEventListener(
        DispatchQueueEvents.WorkerError,
        eventListener
      );

      // Act
      dispatcher.process("test1");
      await deferredPromise;

      // Assert
      expect(mockedProcessor).toHaveBeenCalledOnce();
    });
  });
});
