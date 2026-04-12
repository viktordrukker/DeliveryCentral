import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  
  Max,
  Min,
  
  
  Matches,
} from 'class-validator';

export class TimesheetEntryDto {
  id!: string;
  projectId!: string;
  assignmentId?: string;
  date!: string; // YYYY-MM-DD
  hours!: number;
  capex!: boolean;
  description?: string;
}

export class TimesheetWeekDto {
  id!: string;
  personId!: string;
  weekStart!: string; // YYYY-MM-DD
  status!: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  entries!: TimesheetEntryDto[];
}

export class UpsertEntryDto {
  @IsString()
  @IsNotEmpty()
  weekStart!: string; // YYYY-MM-DD

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  date!: string; // YYYY-MM-DD

  @IsNumber()
  @Min(0)
  @Max(24)
  hours!: number; // 0-24

  @IsBoolean()
  @IsOptional()
  capex?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}

export class RejectTimesheetDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export interface TimeReportData {
  byProject: Array<{ name: string; hours: number }>;
  byPerson: Array<{ name: string; hours: number }>;
  byDay: Array<{ date: string; hours: number }>;
  capexHours: number;
  opexHours: number;
}
