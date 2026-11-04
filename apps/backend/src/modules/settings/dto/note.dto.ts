import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import type { DeleteNotesRequest, SaveNoteRequest } from '@swuniverse/shared';

export class SaveNoteDto implements SaveNoteRequest {
  @IsString()
  @Length(1, 100)
  title: string;

  @IsString()
  @MaxLength(100_000)
  text: string;
}

export class DeleteNotesDto implements DeleteNotesRequest {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids: number[];
}
