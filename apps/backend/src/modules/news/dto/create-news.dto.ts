import { ArrayMaxSize, IsArray, IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateNewsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  text!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  links: string[] = [];

  @IsBoolean()
  isChangelog = false;
}
