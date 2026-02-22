import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerConfigService } from './logger.config';

describe('LoggerConfigService', () => {
  let service: LoggerConfigService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                'LOG_LEVEL': 'debug',
                'LOG_FORMAT': 'json',
                'NODE_ENV': 'test',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LoggerConfigService>(LoggerConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have a logger instance', () => {
    expect(service.getWinstonLogger()).toBeDefined();
  });

  it('should return correct log level', () => {
    expect(service.getLogLevel()).toBe('debug');
  });

  it('should log messages at different levels', () => {
    const logger = service.getWinstonLogger();
    const spy = jest.spyOn(logger, 'info');
    
    service.log('Test info message');
    expect(spy).toHaveBeenCalledWith('Test info message', { context: undefined });
  });

  it('should create child logger with context', () => {
    const childLogger = service.child('TestContext');
    expect(childLogger).toBeDefined();
    expect(childLogger).toBeInstanceOf(LoggerConfigService);
  });

  it('should update log level dynamically', () => {
    service.updateLogLevel('error');
    expect(service.getLogLevel()).toBe('error');
  });
});