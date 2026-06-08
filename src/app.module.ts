import { Module } from '@nestjs/common';
import { BlizzardModule } from './modules/blizzard/blizzard.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { CharactersModule } from './modules/characters/characters.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BlizzardModule,
    AuthModule,
    PrismaModule,
    CharactersModule,
  ],
})
export class AppModule {}
