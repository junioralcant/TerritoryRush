import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PROFILE_REPOSITORY } from './ports/profile-repository.port';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PgProfileRepository } from './repositories/profile.repository';

@Module({
  imports: [AuthModule],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    { provide: PROFILE_REPOSITORY, useClass: PgProfileRepository },
  ],
  exports: [ProfileService],
})
export class ProfileModule {}
