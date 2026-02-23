import { ExternalServiceClient } from './external-service.client';
import { AppConfigService } from '../../config/app-config.service';
import { ExternalServiceError } from '../errors/domain.error';
import axios, { AxiosRequestConfig } from 'axios';

describe('ExternalServiceClient', () => {
  let client: ExternalServiceClient;
  let config: Partial<AppConfigService>;

  beforeEach(() => {
    // minimal config stub
    config = {
      externalServiceRetryAttempts: 2,
      externalServiceRetryDelay: 10,
      externalServiceMaxRetryDelay: 50,
      circuitBreakerEnabled: true,
      circuitBreakerTimeout: 100,
      circuitBreakerErrorThreshold: 50,
      circuitBreakerResetTimeout: 500,
    } as any;
    client = new ExternalServiceClient(config as AppConfigService);
  });

  it('should retry on transient failures and eventually succeed', async () => {
    const spy = jest.spyOn(client['httpClient'], 'request');
    // fail first two calls and succeed third
    spy
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce({ response: { status: 502 } })
      .mockResolvedValueOnce({ data: { ok: true } });

    const result = await client.get<{ ok: boolean }>('http://example.com');
    expect(result).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('should throw ExternalServiceError when all retries fail', async () => {
    jest.spyOn(client['httpClient'], 'request').mockRejectedValue(new Error('down'));

    await expect(client.get('http://example.com')).rejects.toBeInstanceOf(ExternalServiceError);
  });

  it('should open circuit breaker after threshold of failures', async () => {
    // we will make enough failing requests to trip the breaker
    const spy = jest.spyOn(client['httpClient'], 'request');
    spy.mockRejectedValue(new Error('boom'));

    // errorThresholdPercentage is 50 and window is not configurable easily,
    // so call 4 times and expect circuit to open on 3rd or 4th call.
    for (let i = 0; i < 4; i++) {
      try {
        await client.get('http://example.com');
      } catch (e) {
        // ignore
      }
    }

    // circuit breaker should be open now
    expect(client['breaker'].opened).toBe(true);
  });
});
