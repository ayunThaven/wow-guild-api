import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { BlizzardService } from '../blizzard/blizzard.service';
import { JwtService } from '@nestjs/jwt';
import { CharactersService } from '../characters/characters.service';

/**
 * Service d'authentification
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly blizzardService: BlizzardService,
    private readonly characterService: CharactersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Connecte l'utilisateur à l'application grâce à Battle.net
   *
   * @param code Code d'authentification fourni par Battle.net
   */
  async loginWithBattleNet(code?: string) {
    if (!code) {
      throw new BadRequestException('Missing Battle.Net authorization code');
    }

    const token = await this.blizzardService.exchangeCodeForToken(code);
    const userInfo = await this.blizzardService.getUserInfo(token.access_token);

    const provider = 'battlenet';
    const providerAccountId = String(userInfo.id);
    const existingExternalAccount =
      await this.prismaService.externalAccount.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      });

    if (existingExternalAccount) {
      await this.syncCharactersSafely(
        existingExternalAccount.user.id,
        token.access_token,
      );
      return this.buildAuthResponse(existingExternalAccount.user);
    }

    const user = await this.prismaService.user.create({
      data: {
        pseudo: userInfo.battletag,
        ExternalAccount: {
          create: {
            provider,
            providerAccountId,
            battleTag: userInfo.battletag,
            region: 'eu',
          },
        },
      },
      include: { ExternalAccount: true },
    });

    const authResponse = await this.buildAuthResponse(user);

    await this.syncCharactersSafely(user.id, token.access_token);

    return authResponse;
  }

  /**
   * Construit la réponse d'authentification de l'API.
   *
   * Battle.net sert uniquement à vérifier l'identité de l'utilisateur.
   * Ensuite, l'application utilise son propre JWT pour authentifier
   * les appels API.
   */
  private async buildAuthResponse(user: { id: number; pseudo: string }) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      pseudo: user.pseudo,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        pseudo: user.pseudo,
      },
    };
  }

  /**
   * Retourne l'utilisateur actuellement connecté avec ses comptes externes liés.
   */
  async getMe(userId: number) {
    return this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        pseudo: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        ExternalAccount: {
          select: {
            provider: true,
            battleTag: true,
            region: true,
          },
        },
      },
    });
  }

  private async syncCharactersSafely(userId: number, accessToken: string) {
    try {
      await this.characterService.syncFromBattleNet(userId, accessToken);
    } catch (error) {
      console.error('[Auth] Characters sync failed:', error);
    }
  }
}
