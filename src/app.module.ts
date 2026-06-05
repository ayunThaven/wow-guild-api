import { Module } from '@nestjs/common';
import { BlizzardModule } from './modules/blizzard/blizzard.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [BlizzardModule, AuthModule],
})
export class AppModule {}
