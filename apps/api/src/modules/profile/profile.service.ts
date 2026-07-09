import { Inject, Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { PROFILE_REPOSITORY, ProfileRepository } from './ports/profile-repository.port';
import { RunnerProfile, RunnerProfileDetail } from './profile.types';

const nameFromEmail = (email: string | null): string | null => {
  if (!email) {
    return null;
  }
  const localPart = email.split('@')[0];
  return localPart && localPart.trim() !== '' ? localPart : null;
};

@Injectable()
export class ProfileService {
  constructor(
    @Inject(PROFILE_REPOSITORY) private readonly profiles: ProfileRepository,
  ) {}

  async ensureProfileForUser(user: AuthUser): Promise<RunnerProfile> {
    const existing = await this.profiles.findByUserId(user.id);
    if (existing) {
      return existing;
    }
    return this.profiles.create({ userId: user.id, name: nameFromEmail(user.email) });
  }

  async getProfileDetail(user: AuthUser): Promise<RunnerProfileDetail> {
    const profile = await this.ensureProfileForUser(user);
    const aggregates = await this.profiles.loadAggregates(user.id);
    return { ...profile, ...aggregates };
  }
}
