import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { ProfileService } from './profile.service';
import { RunnerProfileDetail } from './profile.types';

@Controller('me')
@UseGuards(SupabaseJwtGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser): Promise<RunnerProfileDetail> {
    return this.profileService.getProfileDetail(user);
  }
}
