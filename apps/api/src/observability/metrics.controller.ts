import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(@Res({ passthrough: true }) response: Response): Promise<string> {
    response.setHeader('Content-Type', this.metricsService.contentType());
    return this.metricsService.metrics();
  }
}
