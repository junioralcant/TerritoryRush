import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/app-config.type';

/**
 * Gates the Garmin endpoints behind the feature flag. When disabled (default),
 * Garmin routes behave as if they do not exist (404), keeping the integration
 * inert until partner approval — without affecting the Strava flow.
 */
@Injectable()
export class GarminFlagGuard implements CanActivate {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  canActivate(): boolean {
    if (!this.config.get('garminEnabled', { infer: true })) {
      throw new NotFoundException('Garmin integration is disabled');
    }
    return true;
  }
}
