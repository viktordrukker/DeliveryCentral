import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ResolveExceptionRequestDto {
  @ApiProperty({ description: 'Resolution note explaining how the exception was handled' })
  @IsString()
  @IsNotEmpty()
  public resolution!: string;

  @ApiProperty({ description: 'ID of the actor resolving the exception' })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  public resolvedBy!: string;
}

export class SuppressExceptionRequestDto {
  @ApiProperty({ description: 'Reason for suppressing the exception' })
  @IsString()
  @IsNotEmpty()
  public reason!: string;

  @ApiProperty({ description: 'ID of the actor suppressing the exception' })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  public suppressedBy!: string;
}

export class ExceptionResolutionResponseDto {
  @ApiProperty()
  public exceptionId!: string;

  @ApiProperty()
  public resolvedAt!: string;

  @ApiProperty()
  public resolvedBy!: string;

  @ApiProperty()
  public resolution!: string;

  @ApiProperty({ enum: ['RESOLVED', 'SUPPRESSED'] })
  public status!: string;
}
