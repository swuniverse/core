import { inflateSync } from 'node:zlib';
import {
  BANNER_MAX_BYTES,
  BannerImageError,
  normalizeBannerPng,
} from './alliance-banner-image';
import {
  PNG_SIGNATURE,
  chunk,
  idat,
  ihdr,
  makePng,
  padPngTo,
} from './testing/png-fixtures';

function rejection(input: Buffer): string {
  try {
    normalizeBannerPng(input);
  } catch (error) {
    expect(error).toBeInstanceOf(BannerImageError);
    return (error as Error).message;
  }
  throw new Error('expected rejection');
}

function chunkTypes(png: Buffer): string[] {
  const types: string[] = [];
  let offset = 8;
  while (offset < png.length) {
    types.push(png.toString('ascii', offset + 4, offset + 8));
    offset += 12 + png.readUInt32BE(offset);
  }
  return types;
}

describe('normalizeBannerPng', () => {
  it('accepts a PNG of exactly 600 x 150 pixels and reports its size', () => {
    const result = normalizeBannerPng(makePng(600, 150));
    expect(result.width).toBe(600);
    expect(result.height).toBe(150);
  });

  it('accepts smaller images and rejects 601 x 150 and 600 x 151', () => {
    expect(normalizeBannerPng(makePng(599, 149)).width).toBe(599);
    expect(rejection(makePng(601, 150))).toBe(
      'Das Banner darf höchstens 600 × 150 Pixel groß sein',
    );
    expect(rejection(makePng(600, 151))).toBe(
      'Das Banner darf höchstens 600 × 150 Pixel groß sein',
    );
  });

  it('accepts exactly 200 KB and rejects one byte more', () => {
    const base = makePng(10, 10);
    expect(BANNER_MAX_BYTES).toBe(200 * 1024);
    expect(() =>
      normalizeBannerPng(padPngTo(base, BANNER_MAX_BYTES)),
    ).not.toThrow();
    expect(rejection(padPngTo(base, BANNER_MAX_BYTES + 1))).toBe(
      'Das Banner darf höchstens 200 KB groß sein',
    );
  });

  it('rejects files that are not PNGs whatever they claim to be', () => {
    const jpegLike = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a]);
    expect(rejection(jpegLike)).toBe('Das Banner muss eine PNG-Datei sein');
    expect(rejection(Buffer.from('<svg onload="alert(1)"/>'))).toBe(
      'Das Banner muss eine PNG-Datei sein',
    );
    expect(rejection(Buffer.alloc(0))).toBe(
      'Das Banner muss eine PNG-Datei sein',
    );
  });

  it('rejects a PNG signature without a decodable header', () => {
    expect(rejection(Buffer.concat([PNG_SIGNATURE, Buffer.from('xx')]))).toBe(
      'Die PNG-Datei ist beschädigt',
    );
  });

  it('rejects data appended after the PNG (polyglot files)', () => {
    const polyglot = makePng(
      10,
      10,
      [],
      Buffer.from('PK\x03\x04<script>alert(1)</script>'),
    );
    expect(rejection(polyglot)).toBe(
      'Die PNG-Datei enthält zusätzliche Daten hinter dem Bildende',
    );
  });

  it('rejects animated PNGs', () => {
    const animated = makePng(10, 10, [chunk('acTL', Buffer.alloc(8))]);
    expect(rejection(animated)).toBe(
      'Animierte PNG-Dateien sind nicht erlaubt',
    );
  });

  it('rejects a corrupted checksum and a pixel payload of the wrong size', () => {
    const broken = Buffer.from(makePng(10, 10));
    broken[20] ^= 0xff;
    expect(rejection(broken)).toBe('Die PNG-Datei ist beschädigt');

    const wrongSize = Buffer.concat([
      PNG_SIGNATURE,
      ihdr(10, 10),
      idat(Buffer.alloc(5)),
      chunk('IEND'),
    ]);
    expect(rejection(wrongSize)).toBe('Die PNG-Datei ist beschädigt');
  });

  it('re-encodes: drops text, metadata and unknown chunks, keeps pixels', () => {
    const input = makePng(20, 10, [
      chunk('tEXt', Buffer.from('Comment\0<script>alert(1)</script>')),
      chunk('eXIf', Buffer.from('secret')),
      chunk('zzZz', Buffer.from('custom')),
    ]);
    const { data, width, height } = normalizeBannerPng(input);
    expect(chunkTypes(data)).toEqual(['IHDR', 'IDAT', 'IEND']);
    expect(data.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
    expect(data.includes(Buffer.from('script'))).toBe(false);
    expect([width, height]).toEqual([20, 10]);
    const idatStart = data.indexOf(Buffer.from('IDAT')) + 4;
    const idatLength = data.readUInt32BE(idatStart - 8);
    expect(
      inflateSync(data.subarray(idatStart, idatStart + idatLength)).length,
    ).toBe(10 * (1 + 20 * 3));
    // The output is itself a valid banner.
    expect(() => normalizeBannerPng(data)).not.toThrow();
  });

  it('keeps palette and transparency of indexed images', () => {
    const png = Buffer.concat([
      PNG_SIGNATURE,
      ihdr(2, 1, { depth: 1, colorType: 3 }),
      chunk('PLTE', Buffer.from([0, 0, 0, 255, 255, 255])),
      chunk('tRNS', Buffer.from([0, 255])),
      idat(Buffer.from([0, 0b01000000])),
      chunk('IEND'),
    ]);
    expect(chunkTypes(normalizeBannerPng(png).data)).toEqual([
      'IHDR',
      'PLTE',
      'tRNS',
      'IDAT',
      'IEND',
    ]);
  });

  it('accepts interlaced images with the correct pixel payload', () => {
    // 8x8 grayscale 8-bit Adam7 passes as [width, height].
    const passes = [
      [1, 1],
      [1, 1],
      [2, 1],
      [2, 2],
      [4, 2],
      [4, 4],
      [8, 4],
    ];
    const rawLength = passes.reduce((sum, [w, h]) => sum + h * (1 + w), 0);
    const png = Buffer.concat([
      PNG_SIGNATURE,
      ihdr(8, 8, { colorType: 0, interlace: 1 }),
      idat(Buffer.alloc(rawLength)),
      chunk('IEND'),
    ]);
    expect(normalizeBannerPng(png).width).toBe(8);
  });
});
