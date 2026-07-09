import {
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  OnModuleDestroy,
  Provider,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { AppConfig } from '../config/app-config.type';
import { PG_POOL } from './database.constants';

const pgPoolProvider: Provider = {
  provide: PG_POOL,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>): Pool => {
    const pool = new Pool({
      connectionString: config.get('databaseUrl', { infer: true }),
      max: 10,
    });
    pool.on('error', (error) => {
      Logger.error(`Idle Postgres client error: ${error.message}`, error.stack, 'DatabaseModule');
    });
    return pool;
  },
};

@Injectable()
class PgPoolCloser implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [pgPoolProvider, PgPoolCloser],
  exports: [PG_POOL],
})
export class DatabaseModule {}
