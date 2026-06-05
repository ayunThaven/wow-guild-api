import { Module } from '@nestjs/common';
import { BlizzardService } from './blizzard.service';

@Module({
  providers: [BlizzardService],
  exports: [BlizzardService],
})
export class BlizzardModule {}
