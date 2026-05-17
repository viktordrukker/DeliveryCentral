import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString, ValidateIf } from 'class-validator';

/**
 * F-19 / 20c-09 — typed DTO replacing the inline `OverridePayload`
 * type-alias on `PUT /admin/role-presets/:preset`. The endpoint
 * accepts either `{ roles: null }` (clear override → fall back to
 * compile-time default) or `{ roles: PlatformRole[] }` (apply
 * override). Deeper PlatformRole validation + the "admin must be
 * present" invariant stay in the controller because invalid values
 * produce a specific error message that names the offending role.
 */
export class SetRolePresetOverrideRequestDto {
  @ApiProperty({
    description:
      'List of PlatformRole strings to apply, or null to clear the override and revert to the compile-time default.',
    nullable: true,
    type: [String],
  })
  @ValidateIf((_, value) => value !== null)
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  public roles!: string[] | null;
}
