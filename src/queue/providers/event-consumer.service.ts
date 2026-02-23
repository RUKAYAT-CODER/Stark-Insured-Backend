import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';

@Controller()
export class EventConsumerService {

  @EventPattern('send_email')
  async handleEmail(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      console.log('Sending email...', data);

      // simulate async work
      await new Promise((res) => setTimeout(res, 3000));

      channel.ack(message);

    } catch (error) {
      console.error(error);
      channel.nack(message, false, false); // send to DLQ
    }
  }

  @EventPattern('generate_policy')
  async handlePolicy(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    try {
      console.log('Generating policy...', data);

      await new Promise((res) => setTimeout(res, 5000));

      channel.ack(message);

    } catch (error) {
      channel.nack(message, false, false);
    }
  }
}