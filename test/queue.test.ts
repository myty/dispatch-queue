import { beforeEach, describe, expect, it } from "vitest";
import { Queue } from "../queue";

describe("Queue", () => {
  let queue: Queue<string>;

  beforeEach(() => {
    queue = new Queue<string>();
  });

  it("create concurrent queue", () => {
    expect(queue).toBeDefined();
  });

  describe("enqueue", () => {
    it("does not throw", () => {
      queue.enque("test");
      expect(() => {
        queue.enque("test");
      }).not.toThrow();
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
      expect(result).toBe(test1);
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
      expect(result2).toBe(test2);
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
      expect(duration).toBeGreaterThan(delayMs);
      expect(result1).toBe(test1);
      expect(result2).toBe(test2);
    });
  });
});
