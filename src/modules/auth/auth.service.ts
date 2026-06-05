import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { BlizzardService } from '../blizzard/blizzard.service';

/**
 * Service d'authentification
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly blizzardService: BlizzardService,
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
      return {
        message: 'Logged in with Battle.Net.',
        user: existingExternalAccount.user,
        battleTag: existingExternalAccount.battleTag,
      };
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
    return {
      message: 'User account created successfully with Battle.Net.',
      user,
    };
  }
}
