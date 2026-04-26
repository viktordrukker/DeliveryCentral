import { ArgumentMetadata, BadRequestException, Inject, Injectable, PipeTransform, Type, mixin } from '@nestjs/common';

import { AggregateType } from './aggregate-type';
import { PublicIdService } from './public-id.service';

/**
 * Factory that creates a NestJS pipe for validating a specific aggregate's
 * publicId on controller ingress. Example:
 *
 *   @Param('projectId', ParsePublicId(AggregateType.Project)) projectPublicId: string
 *
 * The pipe rejects:
 *   - malformed shapes (not `<prefix>_<sqid>`)
 *   - publicIds that belong to a different aggregate type (wrong prefix)
 *   - raw UUIDs (explicit check — the most common accidental leak)
 *
 * The pipe does NOT resolve publicId → internal uuid. That happens at the
 * repository layer so services can remain ignorant of the publicId scheme.
 * Returning the publicId string verbatim keeps controller handlers simple:
 * they pass it to a service method that wraps a `findUnique({ where: { publicId } })`.
 *
 * For the transition window where a controller must accept either a uuid or
 * a publicId (release N+1 per DMD-004), use `ParsePublicIdOrUuid` instead.
 */
export function ParsePublicId(expectedType: AggregateType): Type<PipeTransform> {
  @Injectable()
  class Pipe implements PipeTransform<string, string> {
    public constructor(
      @Inject(PublicIdService) private readonly publicIdService: PublicIdService,
    ) {}

    public transform(value: string, _metadata: ArgumentMetadata): string {
      if (typeof value !== 'string' || value.length === 0) {
        throw new BadRequestException(`Expected a ${expectedType} identifier.`);
      }
      if (this.publicIdService.looksLikeUuid(value)) {
        throw new BadRequestException(
          'Raw UUIDs are not accepted on this endpoint. Use the public identifier.',
        );
      }
      if (!this.publicIdService.isValidShape(value, expectedType)) {
        throw new BadRequestException(`Malformed ${expectedType} identifier.`);
      }
      return value;
    }
  }

  return mixin(Pipe);
}

/**
 * Transitional pipe for the release-N+1 window where an endpoint must accept
 * EITHER a legacy internal uuid OR the new publicId. Returns the input verbatim
 * — the service layer resolves both shapes via a helper like
 * `findSkillByIdOrPublicId`. Removed in DM-2.5-11 when uuid acceptance is
 * dropped; at that point controllers switch to `ParsePublicId`.
 *
 *   @Param('id', ParsePublicIdOrUuid(AggregateType.Skill)) idOrPublicId: string
 */
export function ParsePublicIdOrUuid(expectedType: AggregateType): Type<PipeTransform> {
  @Injectable()
  class Pipe implements PipeTransform<string, string> {
    public constructor(
      @Inject(PublicIdService) private readonly publicIdService: PublicIdService,
    ) {}

    public transform(value: string, _metadata: ArgumentMetadata): string {
      if (typeof value !== 'string' || value.length === 0) {
        throw new BadRequestException(`Expected a ${expectedType} identifier.`);
      }
      if (this.publicIdService.looksLikeUuid(value)) {
        return value;
      }
      if (this.publicIdService.isValidShape(value, expectedType)) {
        return value;
      }
      throw new BadRequestException(
        `Malformed ${expectedType} identifier — expected a uuid or a ${expectedType}_… publicId.`,
      );
    }
  }

  return mixin(Pipe);
}
