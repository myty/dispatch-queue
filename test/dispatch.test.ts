import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { Dispatch } from '../dispatch';

const delay = (dealyMs: number = 2000) =>
  new Promise<void>((resolve) => {
    setTimeout(() => resolve(), dealyMs);
  });

describe('Dispatch<T>', () => {
  let dispatcher: Dispatch<string>;
  let mockedProcessor: Mock<[], Promise<void>>;

  beforeEach(() => {
    mockedProcessor = vi.fn(() => Promise.resolve());
    dispatcher = new Dispatch<string>(mockedProcessor);
  });

  afterEach(() => {
    dispatcher.stopProcessing();
  });

  it('create concurrent queue', () => {
    expect(dispatcher).to.be.ok;
  });

  it('can enqueue value to queue', () => {
    expect(() => dispatcher.process('test')).to.be.ok;
  });

  it('processes enqueued value', async () => {
    const value = 'test';
    dispatcher.process(value);

    await delay(50);

    expect(mockedProcessor).toHaveBeenCalledOnce();
  });

  it('processes muliptle enqueued values', async () => {
    const value1 = 'value1';
    const value2 = 'value2';
    dispatcher.process(value1);
    dispatcher.process(value2);

    await delay(1000);

    expect(mockedProcessor).toHaveBeenCalledTimes(2);
  });
});
