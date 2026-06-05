import {
  Controller,
  Get,
  Query,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { BlizzardService } from '../blizzard/blizzard.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: {
    id: number;
    pseudo: string;
  };
};

/**
 * Controller d'authentification
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly blizzardService: BlizzardService,
  ) {}

  /**
   * Redirige vers Battle.Net pour la connection
   */
  @Get('battlenet')
  @Redirect()
  redirectToBattlenet() {
    return {
      url: this.blizzardService.getAuthorizationUrl(),
    };
  }

  /**
   * Redirige depuis Battle.Net pour la connection
   * @param code Code d'authentification fourni par Battle.Net
   */
  @Get('battlenet/callback')
  async handleBattlenetCallback(@Query('code') code: string) {
    return this.authService.loginWithBattleNet(code);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() request: AuthenticatedRequest) {
    return this.authService.getMe(request.user.id);
  }
}
