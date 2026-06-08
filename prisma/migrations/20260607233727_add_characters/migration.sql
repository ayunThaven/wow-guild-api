-- CreateEnum
CREATE TYPE "Faction" AS ENUM ('ALLIANCE', 'HORDE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "Classes" AS ENUM ('DEATHKNIGHT', 'DEMONHUNTER', 'DRUID', 'EVOKER', 'HUNTER', 'MAGE', 'MONK', 'PALADIN', 'PRIEST', 'ROGUE', 'SHAMAN', 'WARLOCK', 'WARRIOR');

-- CreateEnum
CREATE TYPE "Races" AS ENUM ('DARKIRONDWARF', 'DRACTHYR', 'DRAENEI', 'DWARF', 'EARTHEN', 'GNOME', 'HARANIR', 'HUMAN', 'KULTIRAN', 'LIGHTFORGEDDRAENEI', 'MECHAGNOME', 'NIGHTELF', 'PANDAREN', 'VOIDELF', 'WORGEN', 'BLOODELF', 'GOBLIN', 'HIGHMOUNTAINTAUREN', 'MAGHARORC', 'NIGHTBORNE', 'ORC', 'TAUREN', 'TROLL', 'UNDEAD', 'VULPERA', 'ZANDALARITROLL');

-- CreateEnum
CREATE TYPE "Specialisations" AS ENUM ('BLOOD', 'FROST', 'UNHOLY', 'HAVOC', 'VENGEANCE', 'DEVOURER', 'BALANCE', 'FERAL', 'GUARDIAN', 'RESTORATION', 'EVOKER', 'DEVASTATION', 'PRESERVATION', 'AUGMENTATION', 'BEASTMASTERY', 'MARKSMANSHIP', 'SURVIVAL', 'ARCANE', 'FIRE', 'MONK', 'BREWMASTER', 'MISTWEAVER', 'WINDWALKER', 'HOLY', 'PROTECTION', 'RETRIBUTION', 'DISCIPLINE', 'SHADOW', 'ASSASSINATION', 'OUTLAW', 'SUBTLETY', 'ELEMENTAL', 'ENHANCEMENT', 'AFFLICTION', 'DEMONOLOGY', 'DESTRUCTION', 'ARMS', 'FURY');

-- CreateTable
CREATE TABLE "Character" (
    "id" SERIAL NOT NULL,
    "guildId" INTEGER,
    "userId" INTEGER NOT NULL,
    "gameVersionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "class" "Classes" NOT NULL,
    "race" "Races" NOT NULL,
    "faction" "Faction" NOT NULL,
    "level" INTEGER NOT NULL,
    "mainSpec" "Specialisations" NOT NULL,
    "secondarySpec" "Specialisations" NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "blizzardCharacterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Character_blizzardCharacterId_key" ON "Character"("blizzardCharacterId");

-- CreateIndex
CREATE UNIQUE INDEX "Character_region_realm_name_gameVersionId_key" ON "Character"("region", "realm", "name", "gameVersionId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
