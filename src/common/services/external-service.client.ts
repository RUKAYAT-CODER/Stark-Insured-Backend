import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import CircuitBreaker from 'opossum';
import { AppConfigService } from '../../config/app-config.service';
import { ExternalServiceError } from '../errors/domain.error';

@Injectable()
export class ExternalServiceClient {
  private readonly logger = new Logger(ExternalServiceClient.name);
  private readonly httpClient: AxiosInstance;
  private readonly breaker: any; // opossum circuit breaker instance (loosely typed)

  constructor(private config: AppConfigService) {
    this.httpClient = axios.create();

    // configure retries for transient errors
    axiosRetry(this.httpClient, {
      retries: this.config.externalServiceRetryAttempts,
      retryDelay: (retryCount: number) => {
        const delay = Math.min(
          this.config.externalServiceRetryDelay * Math.pow(2, retryCount - 1),
          this.config.externalServiceMaxRetryDelay,
        );
        this.logger.debug(`retrying external request, attempt ${retryCount}, delay ${delay}ms`);
        return delay;
      },
      retryCondition: (error) => {
        // retry on network errors or 5xx responses
        return (
          isNetworkOrIdempotentRequestError(error) ||
          (error.response && error.response.status >= 500)
        );
      },
    });

    const breakerOptions = {
      timeout: this.config.circuitBreakerTimeout,
      errorThresholdPercentage: this.config.circuitBreakerErrorThreshold,
      resetTimeout: this.config.circuitBreakerResetTimeout,
    };

    this.breaker = new CircuitBreaker(
      (reqConfig: AxiosRequestConfig) => this.httpClient.request(reqConfig),
      breakerOptions,
    );

    this.breaker.on('open', () => this.logger.warn('Circuit breaker opened for external requests'));
    this.breaker.on('halfOpen', () => this.logger.log('Circuit breaker half-open stage'));
    this.breaker.on('close', () => this.logger.log('Circuit breaker closed'));
  }

  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    if (!this.config.circuitBreakerEnabled) {
      // fallback to direct request
      try {
        const resp = await this.httpClient.request<T>(config);
        return resp.data;
      } catch (error) {
        this.logger.error('direct external request failed', error);
        throw new ExternalServiceError('External request failed', error);
      }
    }

    try {
      const resp = await this.breaker.fire(config);
      return (resp as AxiosResponse<T>).data;
    } catch (err) {
      this.logger.error('external request failed', err);
      // wrap any failure into our domain error so filter can handle it
      throw new ExternalServiceError('External request failed', err);
    }
  }

  // convenience helpers
  get<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'get', url });
  }

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'post', url, data });
  }

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'put', url, data });
  }

  delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'delete', url });
  }
}
