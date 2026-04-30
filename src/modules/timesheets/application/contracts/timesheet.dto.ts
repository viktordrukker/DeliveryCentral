import {
  IsBoolean,
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
  benchCategory?: string;
  workLabel?: string;
  workItemId?: string;
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
  totalHours?: number;
  standardHours?: number;
  overtimeHours?: number;
  overtimeApproved?: boolean;
  overtimeThreshold?: number;
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

  @IsString()
  @IsOptional()
  benchCategory?: string;

  @IsString()
  @IsOptional()
  workLabel?: string;

  @IsString()
  @IsOptional()
  workItemId?: string;
}

export class RenameMyTimeRowDto {
  @IsString()
  @IsNotEmpty()
  month!: string; // YYYY-MM

  @IsString()
  @IsNotEmpty()
  kind!: 'BENCH' | 'WORK_LABEL';

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  oldLabel?: string;

  @IsString()
  @IsOptional()
  newLabel?: string;
}

export class DeleteMyTimeRowDto {
  @IsString()
  @IsNotEmpty()
  month!: string; // YYYY-MM

  @IsString()
  @IsNotEmpty()
  kind!: 'BENCH' | 'WORK_LABEL';

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  label?: string;
}

export class RejectTimesheetDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export interface TimeReportData {
  byProject: Array<{ name: string; hours: number; standardHours: number; overtimeHours: number; benchHours: number }>;
  byPerson: Array<{ name: string; hours: number; standardHours: number; overtimeHours: number; benchHours: number }>;
  byDay: Array<{ date: string; hours: number }>;
  weeklyTrend: Array<{ week: string; standard: number; overtime: number; bench: number; leave: number }>;
  capexHours: number;
  opexHours: number;
  standardHours: number;
  overtimeHours: number;
  benchHours: number;
  leaveHours: number;
  totalHours: number;
}
