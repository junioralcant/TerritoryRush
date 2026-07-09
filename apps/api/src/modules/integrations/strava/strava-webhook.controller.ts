import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { StravaWebhookEventDto, toWebhookEvent } from './dto/strava-webhook-event.dto';
import { StravaWebhookService } from './strava-webhook.service';
import { StravaWebhookValidationResponse } from './strava.types';

@Controller('webhooks/strava')
export class StravaWebhookController {
  constructor(private readonly webhookService: StravaWebhookService) {}

  @Get()
  verify(@Query() query: Record<string, string>): StravaWebhookValidationResponse {
    return this.webhookService.verifyChallenge(query);
  }

  @Post()
  @HttpCode(200)
  async receive(@Body() body: StravaWebhookEventDto): Promise<{ received: boolean }> {
    await this.webhookService.handleEvent(toWebhookEvent(body));
    return { received: true };
  }
}
