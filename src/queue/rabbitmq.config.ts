import { Transport } from '@nestjs/microservices';

export const rabbitConfig = {
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://admin:admin@localhost:5672'],
    queue: 'main_queue',
    queueOptions: {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': 'dlx_exchange',
  },
},
  },
};