import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../../database/database.constants';
import {
  CreateNotificationInput,
  NotificationRecord,
  NotificationType,
  RegisterDeviceTokenInput,
} from '../notifications.types';
import { NotificationRepository } from '../ports/notification-repository.port';

type NotificationRow = {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  sent_at: Date | null;
  read_at: Date | null;
  created_at: Date;
};

@Injectable()
export class PgNotificationRepository implements NotificationRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(input: CreateNotificationInput): Promise<string> {
    const result = await this.pool.query<{ id: string }>(
      `insert into public.notification (user_id, type, payload) values ($1, $2, $3) returning id`,
      [input.userId, input.type, JSON.stringify(input.payload)],
    );
    return result.rows[0].id;
  }

  async markSent(id: string): Promise<void> {
    await this.pool.query(`update public.notification set sent_at = now() where id = $1`, [id]);
  }

  async listForUser(userId: string): Promise<NotificationRecord[]> {
    const result = await this.pool.query<NotificationRow>(
      `select id, type, payload, sent_at, read_at, created_at
       from public.notification where user_id = $1 order by created_at desc limit 100`,
      [userId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      payload: row.payload,
      sentAt: row.sent_at ? row.sent_at.toISOString() : null,
      readAt: row.read_at ? row.read_at.toISOString() : null,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async findDeviceTokens(userId: string): Promise<string[]> {
    const result = await this.pool.query<{ token: string }>(
      `select token from public.device_token where user_id = $1`,
      [userId],
    );
    return result.rows.map((row) => row.token);
  }

  async upsertDeviceToken(input: RegisterDeviceTokenInput): Promise<void> {
    await this.pool.query(
      `insert into public.device_token (user_id, token, platform) values ($1, $2, $3)
       on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now()`,
      [input.userId, input.token, input.platform],
    );
  }

  async hasNotificationForCity(userId: string, type: NotificationType, cityId: string): Promise<boolean> {
    const result = await this.pool.query(
      `select 1 from public.notification where user_id = $1 and type = $2 and payload->>'cityId' = $3 limit 1`,
      [userId, type, cityId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
