import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthStatus, ReadinessStatus } from './health.types';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  liveness(): HealthStatus {
    return this.healthService.liveness();
  }

  @Get('ready')
  async readiness(): Promise<ReadinessStatus> {
    const result = await this.healthService.readiness();
    if (result.status !== 'ready') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
