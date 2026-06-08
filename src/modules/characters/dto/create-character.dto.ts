import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Classes, Faction, Races, Specialisations } from '@prisma/client';

export class CreateCharacterDto {
  @IsInt()
  gameVersionId: number;

  @IsString()
  blizzardCharacterId: string;

  @IsString()
  name: string;

  @IsString()
  realm: string;

  @IsString()
  region: string;

  @IsEnum(Classes)
  class: Classes;

  @IsOptional()
  @IsEnum(Specialisations)
  mainSpec: Specialisations;

  @IsOptional()
  @IsEnum(Specialisations)
  secondarySpec: Specialisations;

  @IsEnum(Faction)
  faction: Faction;

  @IsInt()
  @Min(1)
  level: number;

  @IsEnum(Races)
  race: Races;

  @IsBoolean()
  isMain: Boolean;
}
