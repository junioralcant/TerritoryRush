import { BadRequestException } from '@nestjs/common';
import { ActivityStatus } from './activities.types';

const VALID_STATUSES: readonly ActivityStatus[] = ['imported', 'processing', 'processed', 'rejected'];

export const parseActivityStatus = (raw: string | undefined): ActivityStatus | undefined => {
  if (raw === undefined || raw === '') {
    return undefined;
  }
  if (!VALID_STATUSES.includes(raw as ActivityStatus)) {
    throw new BadRequestException(`Invalid status filter: ${raw}`);
  }
  return raw as ActivityStatus;
};
