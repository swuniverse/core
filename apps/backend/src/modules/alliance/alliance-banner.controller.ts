import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Request,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { AllianceBannerService } from './alliance-banner.service';

type AuthRequest = { user: { sub: number } };

/**
 * Multer rejects oversized bodies with a generic 413 before the content check
 * can explain; the validator owns the 200 KB rule, this only bounds memory.
 */
const UPLOAD_HARD_LIMIT_BYTES = 2 * 1024 * 1024;

@Controller('alliances/:id/banner')
export class AllianceBannerController {
  constructor(private readonly banners: AllianceBannerService) {}

  /** Public: alliance pages are readable without membership. */
  @Get()
  @Header('Content-Type', 'image/png')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'public, max-age=300')
  async read(@Param('id', ParseIntPipe) id: number) {
    return new StreamableFile(await this.banners.read(id));
  }

  @Post()
  @HttpCode(204)
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: UPLOAD_HARD_LIMIT_BYTES } }),
  )
  async upload(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: { buffer: Buffer },
  ) {
    await this.banners.upload(req.user.sub, id, file?.buffer);
  }

  @Delete()
  @HttpCode(204)
  @UseGuards(AuthGuard('jwt'))
  async remove(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.banners.remove(req.user.sub, id);
  }
}
