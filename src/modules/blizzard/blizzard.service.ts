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

type BlizzardWowCharacters = {
  wow_accounts?: Array<{
    id: number;
    characters?: Array<{
      id: number;
      name: string;
      level?: number;
      realm?: {
        id?: number;
        slug?: string;
        name?: string;
      };
      playable_class?: {
        id?: number;
        name?: string;
      };
      playable_race?: {
        id?: number;
        name?: string;
      };
      faction?: {
        type?: string;
        name?: string;
      };
    }>;
  }>;
};

export type BlizzardCharacterSpecializations = {
  specializations?: Array<{
    specialization?: {
      id?: number;
      name?: string;
    };
    talents?: unknown[];
    specialization_name?: string;
  }>;

  active_specialization?: {
    id?: number;
    name?: string;
  };

  specialization_groups?: Array<{
    is_active?: boolean;
    glyphs?: unknown[];
  }>;

  character?: {
    id?: number;
    name?: string;
    realm?: {
      id?: number;
      name?: string;
      slug?: string;
    };
  };
};

/**
 * Service pour l'authentification depuis Blizzard
 */
@Injectable()
export class BlizzardService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Construit l'URL d'autorisation Battle.net.
   *
   * L'utilisateur est redirigé vers cette URL afin d'autoriser la connexion OAuth
   * et l'accès à son profil WoW.
   */
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
      scope: 'openid wow.profile',
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

  /**
   * Récupère le profil WoW du compte Battle.net authentifié.
   *
   * Cet endpoint permet de récupérer les personnages liés au compte de l'utilisateur.
   * Pour WoW Classic, le namespace utilisé doit être un namespace de profil Classic.
   */
  async getWowCharacters(accessToken: string): Promise<BlizzardWowCharacters> {
    const region = this.configService.get<string>('BATTLE_NET_REGION');
    const namespace =
      this.configService.get<string>('BLIZZARD_PROFILE_NAMESPACE') ??
      `profile-classic-${region}`;
    const locale = this.configService.get<string>('BLIZZARD_LOCALE') ?? 'fr_FR';

    const response = await axios.get<BlizzardWowCharacters>(
      `https://${region}.api.blizzard.com/profile/user/wow`,
      {
        params: {
          namespace,
          locale,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.data;
  }

  async getCharacterSpecializations(
    accessToken: string,
    realmSlug: string,
    characterName: string,
  ): Promise<BlizzardCharacterSpecializations> {
    const region = this.configService.get<string>('BATTLE_NET_REGION');

    const namespace =
      this.configService.get<string>('BLIZZARD_PROFILE_NAMESPACE') ??
      `profile-classic-${region}`;

    const locale = this.configService.get<string>('BLIZZARD_LOCALE') ?? 'fr_FR';

    const normalizedCharacterName = characterName.toLowerCase();

    const response = await axios.get<BlizzardCharacterSpecializations>(
      `https://${region}.api.blizzard.com/profile/wow/character/${realmSlug}/${normalizedCharacterName}/specializations`,
      {
        params: {
          namespace,
          locale,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.data;
  }
}
