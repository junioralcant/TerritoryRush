import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { GarminFlagGuard } from './garmin-flag.guard';
import { GarminWebhookService } from './garmin-webhook.service';
import { GarminWebhookPayload } from './garmin.types';

@Controller('webhooks/garmin')
@UseGuards(GarminFlagGuard)
export class GarminWebhookController {
  constructor(private readonly webhookService: GarminWebhookService) {}

  @Post()
  @HttpCode(200)
  async receive(@Body() body: GarminWebhookPayload): Promise<{ received: boolean }> {
    await this.webhookService.handlePush(body);
    return { received: true };
  }
}
