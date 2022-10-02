import {
  assert,
  assertEquals,
  assertExists,
  beforeEach,
  describe,
  it,
} from "./deps.ts";

import { Queue } from "../src/queue.ts";

describe("Queue", () => {
  let queue: Queue<string>;

  beforeEach(() => {
    queue = new Queue<string>();
  });

  it("create concurrent queue", () => {
    assertExists(queue);
  });

  describe("enqueue", () => {
    it("does not throw", () => {
      queue.enque("test");
      assert(() => {
        queue.enque("test");
      });
    });
  });

  describe("dequeue", () => {
    it("returns value", async () => {
      // Arrange
      const test1 = "test1";
      queue.enque(test1);

      // Act
      const result = await queue.deque();

      // Assert
      assertEquals(result, test1);
    });

    it("returns values in order", async () => {
      // Arrange
      const test1 = "test1";
      const test2 = "test2";
      queue.enque(test1);
      queue.enque(test2);

      // Act
      const _ = await queue.deque();
      const result2 = await queue.deque();

      // Assert
      assertEquals(result2, test2);
    });

    it("waits for enqued value", async () => {
      // Arrange
      const delayMs = 50;
      const startTime = Date.now();
      const test1 = "test1";
      const test2 = "test2";

      queue.enque(test1);
      setTimeout(() => queue.enque(test2), delayMs);

      // Act
      const result1 = await queue.deque();
      const result2 = await queue.deque();

      // Assert
      const duration = Date.now() - startTime;
      assert(duration > delayMs);
      assertEquals(result1, test1);
      assertEquals(result2, test2);
    });
  });
});
