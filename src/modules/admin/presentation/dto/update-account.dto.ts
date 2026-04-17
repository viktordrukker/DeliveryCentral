import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const VALID_ROLES = ['employee', 'project_manager', 'resource_manager', 'director', 'hr_manager', 'delivery_manager', 'admin'];

export class UpdateAccountDto {
  @IsArray()
  @IsString({ each: true })
  @IsIn(VALID_ROLES, { each: true })
  @IsOptional()
  roles?: string[];

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
