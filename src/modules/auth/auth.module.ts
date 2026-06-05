import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { BlizzardModule } from '../blizzard/blizzard.module';

@Module({
  providers: [AuthService],
  controllers: [AuthController],
  imports: [BlizzardModule],
})
export class AuthModule {}
