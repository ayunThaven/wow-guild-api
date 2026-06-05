import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

type BattleNetUserInfo = {
  id: number;
  battletag: string;
};

type BattleNetTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

/**
 * Service pour l'authentification depuis Blizzard
 */
@Injectable()
export class BlizzardService {
  constructor(private readonly configService: ConfigService) {}

  getAuthorizationUrl(): string {
    const clientId = this.configService.getOrThrow<string>(
      'BATTLE_NET_CLIENT_ID',
    );
    const redirectUri = this.configService.getOrThrow<string>(
      'BATTLE_NET_REDIRECT_URI',
    );
    const state = crypto.randomUUID();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid',
      state,
    });

    return `https://oauth.battle.net/authorize?${params.toString()}`;
  }

  /**
   * Échange le code de connexion avec un token d'autorisation pour l'API
   *
   * @param code Le code fourni par Blizzard lors de l'authentification
   */
  async exchangeCodeForToken(code: string): Promise<BattleNetTokenResponse> {
    const clientId = this.configService.getOrThrow<string>(
      'BATTLE_NET_CLIENT_ID',
    );
    const redirectUri = this.configService.getOrThrow<string>(
      'BATTLE_NET_REDIRECT_URI',
    );
    const clientSecret = this.configService.getOrThrow<string>(
      'BATTLE_NET_CLIENT_SECRET',
    );

    try {
      const response = await axios.post<BattleNetTokenResponse>(
        'https://oauth.battle.net/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
        {
          auth: {
            username: clientId,
            password: clientSecret,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return response.data;
    } catch {
      throw new InternalServerErrorException('Unable to exchange code');
    }
  }

  /**
   * Récupère les infos de l'utilisateur battle.net tel que son battleTag et l'id battle.net
   *
   * @param accessToken Le token d'autorisation pour l'api Battle.net
   */
  async getUserInfo(accessToken: string): Promise<BattleNetUserInfo> {
    try {
      const response = await axios.get<BattleNetUserInfo>(
        'https://oauth.battle.net/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return response.data;
    } catch {
      throw new InternalServerErrorException(
        'Unable to fetch user information',
      );
    }
  }
}
