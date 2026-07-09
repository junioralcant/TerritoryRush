import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/app-config.type';
import { GarminFlagGuard } from './garmin-flag.guard';

const guardWith = (enabled: boolean): GarminFlagGuard =>
  new GarminFlagGuard({ get: () => enabled } as unknown as ConfigService<AppConfig, true>);

describe('GarminFlagGuard', () => {
  it('allows the request when the flag is enabled', () => {
    expect(guardWith(true).canActivate()).toBe(true);
  });

  it('behaves as 404 when the flag is disabled', () => {
    expect(() => guardWith(false).canActivate()).toThrow(NotFoundException);
  });
});
