import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('characters')
export class CharactersController {
  constructor(private readonly characterService: CharactersService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() characterDto: CreateCharacterDto,
  ) {
    return this.characterService.create(user.id, characterDto);
  }

  @Get('me')
  /**
   * Retourne les personnages liés à l'utilisateur connecté.
   *
   * Les personnages sont normalement créés automatiquement lors de la connexion
   * Battle.net, puis mis à jour à chaque nouvelle connexion.
   */
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.characterService.findMine(user.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) characterId: number,
  ) {
    return this.characterService.findOne(user.id, characterId);
  }
}
