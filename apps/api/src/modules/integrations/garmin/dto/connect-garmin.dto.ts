import { IsNotEmpty, IsString } from 'class-validator';

export class ConnectGarminDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  codeVerifier!: string;
}
