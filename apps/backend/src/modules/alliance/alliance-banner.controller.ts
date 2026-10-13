import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  Controller,
  Delete,
  ExceptionFilter,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  Res,
  PayloadTooLargeException,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { BANNER_TOO_LARGE_MESSAGE } from './alliance-banner-image';
import { AllianceBannerService } from './alliance-banner.service';

type AuthRequest = { user: { sub: number } };

/**
 * Multer rejects oversized bodies with a generic 413 before the content check
 * can explain; the validator owns the 200 KB rule, this only bounds memory.
 */
const UPLOAD_HARD_LIMIT_BYTES = 2 * 1024 * 1024;

/** Reports the transport cap with the same clear message as the validator. */
@Catch(PayloadTooLargeException)
class UploadTooLargeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    const exception = new BadRequestException(BANNER_TOO_LARGE_MESSAGE);
    host
      .switchToHttp()
      .getResponse()
      .status(exception.getStatus())
      .json(exception.getResponse());
  }
}

@Controller('alliances/:id/banner')
export class AllianceBannerController {
  constructor(private readonly banners: AllianceBannerService) {}

  /**
   * Public: alliance pages are readable without membership.
   *
   * Caching: the detail DTO links `?v=<updatedAt ms>`, so every replacement
   * changes the URL and a versioned response may be cached for a year. An
   * unversioned request cannot tell stale from current, so it must revalidate
   * (`no-cache`); a removed or replaced banner is therefore never served
   * stale for minutes.
   */
  @Get()
  @Header('Content-Type', 'image/png')
  @Header('X-Content-Type-Options', 'nosniff')
  async read(
    @Param('id', ParseIntPipe) id: number,
    @Query('v') version: string | undefined,
    @Res({ passthrough: true }) res: { setHeader(k: string, v: string): void },
  ) {
    const data = await this.banners.read(id);
    res.setHeader(
      'Cache-Control',
      version && /^\d+$/.test(version)
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
    );
    return new StreamableFile(data);
  }

  @Post()
  @HttpCode(204)
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  @UseFilters(UploadTooLargeFilter)
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
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  async remove(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.banners.remove(req.user.sub, id);
  }
}
