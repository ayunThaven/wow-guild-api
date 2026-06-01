import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BlizzardModule } from './modules/blizzard/blizzard.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [BlizzardModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
