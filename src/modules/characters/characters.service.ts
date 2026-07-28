import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { BlizzardService } from '../blizzard/blizzard.service';
import { ConfigService } from '@nestjs/config';
import {
  Character,
  Classes,
  Faction,
  Races,
  Specialisations,
} from '@prisma/client';

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

  /**
   * Retourne tous les personnages liés à un utilisateur.
   *
   * Les personnages principaux sont remontés en premier, puis les autres
   * sont triés par nom.
   */
  async findMine(userId: number) {
    return this.prismaService.character.findMany({
      where: {
        userId,
      },
      orderBy: [
        {
          isMain: 'desc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  /**
   * Synchronise tous les personnages WoW du compte Battle.net de l'utilisateur.
   *
   * Les personnages déjà existants sont mis à jour grâce à leur identifiant Blizzard.
   * Les nouveaux personnages sont créés automatiquement et liés à l'utilisateur connecté.
   */
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

      const race = this.mapRace(character.playable_race?.id);
      const characterClass = this.mapClass(character.playable_class?.id);
      const faction = this.mapFaction(character.faction?.type);

      if (!characterClass || !faction || !character.level) {
        continue;
      }

      let mainSpec: Specialisations | null = null;
      let secondarySpec: Specialisations | null = null;
      try {
        const specializations =
          await this.blizzardService.getCharacterSpecializations(
            accessToken,
            realm,
            character.name,
          );

        mainSpec = this.mapSpecialization(
          specializations.active_specialization?.id,
        );

        const availableSpecs =
          specializations.specializations
            ?.map((spec) => this.mapSpecialization(spec.specialization?.id))
            .filter((spec): spec is Specialisations => spec !== null) ?? [];

        secondarySpec =
          availableSpecs.find((spec) => spec !== mainSpec) ?? null;
      } catch (error) {
        console.error(error);
        console.warn(
          `[CharactersSync] Impossible de récupérer les spécialisations de ${character.name}`,
        );
      }

      const synced = await this.prismaService.character.upsert({
        where: {
          blizzardCharacterId,
        },
        update: {
          userId,
          name: character.name,
          realm,
          region,
          race,
          level: character.level,
          faction,
          class: characterClass,
          mainSpec: mainSpec ?? undefined,
          secondarySpec: secondarySpec ?? undefined,
          lastSyncAt: new Date(),
        },
        create: {
          userId,
          guildId: null,
          gameVersionId,
          blizzardCharacterId,
          name: character.name,
          realm,
          region,
          race,
          class: characterClass,
          faction,
          level: character.level,
          mainSpec,
          secondarySpec,
          isMain: false,
          lastSyncAt: new Date(),
        },
      });

      syncedCharacters.push(synced);
    }

    return syncedCharacters;
  }

  /**
   * Convertit une faction retournée par Blizzard vers l'enum Prisma locale.
   */
  private mapFaction(faction?: string): Faction | null {
    if (faction === 'HORDE') return Faction.HORDE;
    if (faction === 'ALLIANCE') return Faction.ALLIANCE;
    return null;
  }

  /**
   * Convertit un identifiant de classe Blizzard vers l'enum Prisma locale.
   *
   * Les identifiants de classe Blizzard sont plus fiables que les noms,
   * car les noms peuvent changer selon la langue utilisée par l'API.
   */
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

  private mapRace(raceId?: number) {
    const map: Record<number, Races> = {
      1: Races.HUMAN,
      2: Races.ORC,
      3: Races.DWARF,
      4: Races.NIGHTELF,
      5: Races.UNDEAD,
      6: Races.TAUREN,
      7: Races.GNOME,
      8: Races.TROLL,
      9: Races.GOBLIN,
      10: Races.BLOODELF,
      11: Races.DRAENEI,
      22: Races.WORGEN,
      24: Races.PANDAREN,
      25: Races.PANDAREN,
      26: Races.PANDAREN,
    };

    return raceId ? (map[raceId] ?? null) : null;
  }

  private mapSpecialization(specId?: number): Specialisations | null {
    const map: Record<number, Specialisations> = {
      // Death Knight
      250: Specialisations.BLOOD,
      251: Specialisations.FROST,
      252: Specialisations.UNHOLY,

      // Druid
      102: Specialisations.BALANCE,
      103: Specialisations.FERAL,
      104: Specialisations.GUARDIAN,
      105: Specialisations.RESTORATION,

      // Hunter
      253: Specialisations.BEASTMASTERY,
      254: Specialisations.MARKSMANSHIP,
      255: Specialisations.SURVIVAL,

      // Mage
      62: Specialisations.ARCANE,
      63: Specialisations.FIRE,
      64: Specialisations.FROST,

      // Monk
      268: Specialisations.BREWMASTER,
      270: Specialisations.MISTWEAVER,
      269: Specialisations.WINDWALKER,

      // Paladin
      65: Specialisations.HOLY,
      66: Specialisations.PROTECTION,
      70: Specialisations.RETRIBUTION,

      // Priest
      256: Specialisations.DISCIPLINE,
      257: Specialisations.HOLY,
      258: Specialisations.SHADOW,

      // Rogue
      259: Specialisations.ASSASSINATION,
      260: Specialisations.OUTLAW,
      261: Specialisations.SUBTLETY,

      // Shaman
      262: Specialisations.ELEMENTAL,
      263: Specialisations.ENHANCEMENT,
      264: Specialisations.RESTORATION,

      // Warlock
      265: Specialisations.AFFLICTION,
      266: Specialisations.DEMONOLOGY,
      267: Specialisations.DESTRUCTION,

      // Warrior
      71: Specialisations.ARMS,
      72: Specialisations.FURY,
      73: Specialisations.PROTECTION,
    };

    return specId ? (map[specId] ?? null) : null;
  }
}
