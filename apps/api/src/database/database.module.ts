import {
  Global,
  Inject,
  Injectable,
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
  useFactory: (config: ConfigService<AppConfig, true>): Pool =>
    new Pool({
      connectionString: config.get('databaseUrl', { infer: true }),
      max: 10,
    }),
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
