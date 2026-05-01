import { IsOptional, IsString } from 'class-validator';

// CRITICAL: every field needs a class-validator decorator. The global
// ValidationPipe runs with `whitelist: true`, which strips any property
// that has no validation metadata. Without these decorators the controller
// receives an empty DTO and the service silently returns the first page of
// every kind regardless of filters — pagination, kind, status, etc. all
// stop working. See assignment-directory.query.ts for the same pattern.
export class StaffingDeskQueryDto {
  @IsOptional() @IsString() public kind?: string;
  @IsOptional() @IsString() public person?: string;
  @IsOptional() @IsString() public personId?: string;
  @IsOptional() @IsString() public project?: string;
  @IsOptional() @IsString() public projectId?: string;
  @IsOptional() @IsString() public poolId?: string;
  @IsOptional() @IsString() public orgUnitId?: string;
  @IsOptional() @IsString() public status?: string;
  @IsOptional() @IsString() public priority?: string;
  @IsOptional() @IsString() public role?: string;
  @IsOptional() @IsString() public skills?: string;
  @IsOptional() @IsString() public from?: string;
  @IsOptional() @IsString() public to?: string;
  @IsOptional() @IsString() public allocMin?: string;
  @IsOptional() @IsString() public allocMax?: string;
  @IsOptional() @IsString() public sortBy?: string;
  @IsOptional() @IsString() public sortDir?: string;
  @IsOptional() @IsString() public page?: string;
  @IsOptional() @IsString() public pageSize?: string;
}
