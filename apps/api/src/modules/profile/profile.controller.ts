import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
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

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateProfileDto,
  ): Promise<RunnerProfileDetail> {
    return this.profileService.updateName(user, body.name);
  }
}
