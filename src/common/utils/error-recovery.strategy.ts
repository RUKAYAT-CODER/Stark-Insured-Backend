/**
 * Generic retry helper with exponential backoff.  Can be used when
 * interacting with potentially flaky resources (databases, caches, etc.).
 *
 * Usage example:
 * ```ts
 * const result = await executeWithRetry(() => this.httpClient.get(url), 3, 500);
 * ```
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  initialDelay: number = 500,
  maxDelay: number = 10000,
): Promise<T> {
  let lastError: any;

  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = Math.min(initialDelay * Math.pow(2, i - 1), maxDelay);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
