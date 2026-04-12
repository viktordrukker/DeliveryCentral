import { ReportingLine } from '@src/modules/organization/domain/entities/reporting-line.entity';

export async function expectDomainError(
  action: () => Promise<unknown> | unknown,
  expectedMessage: string | RegExp,
): Promise<void> {
  try {
    await action();
    throw new Error('Expected domain error was not thrown.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (expectedMessage instanceof RegExp) {
      expect(message).toMatch(expectedMessage);
      return;
    }

    expect(message).toBe(expectedMessage);
  }
}

export function expectSinglePrimarySolidLineManager(
  lines: ReportingLine[],
  expectedManagerId: string,
): void {
  const primarySolidLines = lines.filter(
    (line) => line.type.value === 'SOLID_LINE' && line.isPrimary,
  );

  expect(primarySolidLines).toHaveLength(1);
  expect(primarySolidLines[0]?.managerId.value).toBe(expectedManagerId);
}
