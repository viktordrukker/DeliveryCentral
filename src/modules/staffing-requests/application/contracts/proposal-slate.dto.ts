import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProposalSlateCandidateResponseDto {
  id!: string;
  candidatePersonId!: string;
  rank!: number;
  matchScore!: number;
  availabilityPercent?: number;
  mismatchedSkills!: string[];
  rationale?: string;
  decision!: string;
  decidedAt?: string;
}

export class ProposalSlateResponseDto {
  id!: string;
  staffingRequestId!: string;
  proposedByPersonId!: string;
  status!: string;
  proposedAt!: string;
  expiresAt?: string;
  decidedAt?: string;
  candidates!: ProposalSlateCandidateResponseDto[];
}

export class SubmitProposalSlateCandidateDto {
  @IsString()
  candidatePersonId!: string;

  @IsInt()
  @Min(1)
  rank!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  matchScore!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  availabilityPercent?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mismatchedSkills?: string[];

  @IsOptional()
  @IsString()
  rationale?: string;
}

export class SubmitProposalSlateRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitProposalSlateCandidateDto)
  candidates!: SubmitProposalSlateCandidateDto[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class PickProposalCandidateRequestDto {
  @IsString()
  candidateId!: string;
}

export class RejectProposalSlateRequestDto {
  @IsString()
  reasonCode!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  /**
   * When true, the request returns to OPEN so the RM can build another slate.
   * When false, the request moves to CANCELLED.
   */
  @IsBoolean()
  sendBack!: boolean;
}

export class PickProposalCandidateResponseDto {
  assignmentId!: string;
  slate!: ProposalSlateResponseDto;
}

export class RejectProposalSlateResponseDto {
  slate!: ProposalSlateResponseDto;
  nextRequestStatus!: 'OPEN' | 'CANCELLED';
}
