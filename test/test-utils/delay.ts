export const delay = (delayMs: number = 2000) =>
  new Promise<void>((resolve) => {
    setTimeout(() => resolve(), delayMs);
  });
