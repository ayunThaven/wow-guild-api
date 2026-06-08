import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { BlizzardService } from '../blizzard/blizzard.service';
import { ConfigService } from '@nestjs/config';
import { Character, Classes, Faction } from '@prisma/client';

@Injectable()
export class CharactersService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly blizzardService: BlizzardService,
  ) {}

  async create(userId: number, dto: CreateCharacterDto) {
    if (dto.isMain) {
      await this.prismaService.character.updateMany({
        where: { userId },
        data: { isMain: false },
      });
    }

    return this.prismaService.character.create({
      data: {
        userId,
        blizzardCharacterId: dto.blizzardCharacterId,
        gameVersionId: dto.gameVersionId,
        name: dto.name,
        realm: dto.realm,
        region: dto.region,
        race: dto.race,
        class: dto.class,
        faction: dto.faction,
        mainSpec: dto.mainSpec,
        secondarySpec: dto.secondarySpec,
        level: dto.level,
        isMain: false,
      },
    });
  }

  async syncFromBattleNet(userId: number, accessToken: string) {
    const profile = await this.blizzardService.getWowCharacters(accessToken);

    const region = this.configService.get<string>('BATTLE_NET_REGION') ?? 'eu';
    const gameVersionId = 1;

    const characters =
      profile.wow_accounts?.flatMap((account) => account.characters ?? []) ??
      [];

    const syncedCharacters: Character[] = [];
    for (const character of characters) {
      const realm = character.realm?.slug ?? character.realm?.name;

      if (!realm) {
        continue;
      }

      const blizzardCharacterId = `${region}:${character.realm?.id ?? realm}:${character.id}`;

      const characterClass = this.mapClass(character.playable_class?.id);
      const faction = this.mapFaction(character.faction?.type);

      if (!characterClass || !faction || !character.level) {
        continue;
      }

      const synced = await this.prismaService.character.upsert({
        where: {
          blizzardCharacterId,
        },
        update: {
          userId,
          name: character.name,
          realm,
          region: region.toUpperCase(),
          level: character.level,
          faction: faction,
          class: characterClass,
          lastSyncAt: new Date(),
        },
        create: {
          userId,
          gameVersionId,
          blizzardCharacterId,
          name: character.name,
          realm,
          region: region.toUpperCase(),
          level: character.level,
          faction: faction,
          class: characterClass,
          isMain: false,
          lastSyncAt: new Date(),
        },
      });

      syncedCharacters.push(synced);
    }

    return syncedCharacters;
  }

  private mapFaction(faction?: string): Faction | null {
    if (faction === 'HORDE') return Faction.HORDE;
    if (faction === 'ALLIANCE') return Faction.ALLIANCE;
    return null;
  }

  private mapClass(classId?: number): Classes | null {
    const map: Record<number, Classes> = {
      1: Classes.WARRIOR,
      2: Classes.PALADIN,
      3: Classes.HUNTER,
      4: Classes.ROGUE,
      5: Classes.PRIEST,
      6: Classes.DEATHKNIGHT,
      7: Classes.SHAMAN,
      8: Classes.MAGE,
      9: Classes.WARLOCK,
      10: Classes.MONK,
      11: Classes.DRUID,
      12: Classes.DEMONHUNTER,
      13: Classes.EVOKER,
    };

    return classId ? (map[classId] ?? null) : null;
  }
}
