import { IsInt, IsString } from 'class-validator';
import { StravaWebhookEvent } from '../strava.types';

export class StravaWebhookEventDto {
  @IsString()
  object_type!: string;

  @IsInt()
  object_id!: number;

  @IsString()
  aspect_type!: string;

  @IsInt()
  owner_id!: number;

  @IsInt()
  subscription_id!: number;

  @IsInt()
  event_time!: number;
}

export const toWebhookEvent = (dto: StravaWebhookEventDto): StravaWebhookEvent => ({
  objectType: dto.object_type,
  objectId: dto.object_id,
  aspectType: dto.aspect_type,
  ownerId: dto.owner_id,
  subscriptionId: dto.subscription_id,
  eventTime: dto.event_time,
});
