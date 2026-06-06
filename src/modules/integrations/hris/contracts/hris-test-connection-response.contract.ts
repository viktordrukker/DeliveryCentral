import { ApiProperty } from '@nestjs/swagger';

export class HrisTestConnectionResponseDto {
  @ApiProperty()
  public adapter!: string;

  @ApiProperty()
  public reachable!: boolean;

  @ApiProperty()
  public latencyMs!: number;

  @ApiProperty({ required: false })
  public errorMessage?: string;
}
