import { executeWithRetry } from './error-recovery.strategy';

describe('executeWithRetry', () => {
  it('should return value when function succeeds immediately', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await executeWithRetry(fn, 3, 10);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValue('later');

    const result = await executeWithRetry(fn, 3, 10);
    expect(result).toBe('later');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw last error after exhausting attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('permanent')); 
    await expect(executeWithRetry(fn, 2, 1)).rejects.toThrow('permanent');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
