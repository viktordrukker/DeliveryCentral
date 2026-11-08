import { ApiProperty } from '@nestjs/swagger';

export class RadiusTestConnectionResponseDto {
  @ApiProperty()
  public reachable!: boolean;

  @ApiProperty()
  public latencyMs!: number;

  @ApiProperty({ required: false })
  public errorMessage?: string;
}
