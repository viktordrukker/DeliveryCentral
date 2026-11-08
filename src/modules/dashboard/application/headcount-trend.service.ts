import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { HeadcountTrendPointDto } from './contracts/headcount-trend.dto';

interface HeadcountTrendQuery {
  asOf?: string;
  months?: number;
}

@Injectable()
export class HeadcountTrendService {
  public constructor(private readonly prisma: PrismaService) {}

  public async execute(query: HeadcountTrendQuery): Promise<HeadcountTrendPointDto[]> {
    const months = query.months ?? 6;
    if (!Number.isFinite(months) || months < 1 || months > 24) {
      throw new BadRequestException('months must be between 1 and 24.');
    }

    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('asOf is invalid.');
    }

    // W2-08: monthly headcount trend driven by Person.hiredAt / Person.terminatedAt.
    // A person is counted in month M when hiredAt <= last-day-of-M AND
    // (terminatedAt IS NULL OR terminatedAt > last-day-of-M).
    const people = await this.prisma.person.findMany({
      select: { hiredAt: true, terminatedAt: true, createdAt: true },
      where: { deletedAt: null },
    });

    const points: HeadcountTrendPointDto[] = [];
    for (let i = months - 1; i >= 0; i--) {
      // last day of (asOf month - i), end-of-day UTC
      const monthEnd = new Date(Date.UTC(
        asOf.getUTCFullYear(),
        asOf.getUTCMonth() - i + 1,
        0,
        23, 59, 59, 999,
      ));
      const count = people.reduce((acc, p) => {
        // Fall back to createdAt if hiredAt is null — same convention as
        // hr-manager-dashboard-query.service.ts uses for recentJoinerActivity.
        const hired = p.hiredAt ?? p.createdAt;
        if (!hired || hired > monthEnd) return acc;
        if (p.terminatedAt && p.terminatedAt <= monthEnd) return acc;
        return acc + 1;
      }, 0);
      points.push({
        month: monthEnd.toISOString().slice(0, 7),
        count,
      });
    }

    return points;
  }
}
