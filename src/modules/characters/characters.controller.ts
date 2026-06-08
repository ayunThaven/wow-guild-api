import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
}
