import { IsNotEmpty, IsString } from 'class-validator';

export class ConnectStravaDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}
