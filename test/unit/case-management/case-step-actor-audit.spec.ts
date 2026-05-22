/**
 * F-116 / D-103-write-path round 26 — CaseStep actor-audit.
 * Source-shape assertions across CompleteCaseStepService + cases controller.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — CaseStep actor-audit (source-shape)', () => {
  const serviceSrc = readFileSync(
    'src/modules/case-management/application/complete-case-step.service.ts',
    'utf-8',
  );
  const controllerSrc = readFileSync(
    'src/modules/case-management/presentation/cases.controller.ts',
    'utf-8',
  );

  it('service signatures: initializeSteps + execute + addStep accept actorId', () => {
    expect(serviceSrc).toMatch(/initializeSteps\(\s*caseId:\s*string,\s*caseTypeKey[^,]*,\s*\/\/[^\n]*\n\s*actorId\?:\s*string,/);
    expect(serviceSrc).toMatch(/public async execute\(\s*caseId:\s*string,\s*stepKey:\s*string,\s*\/\/[^\n]*\n\s*actorId\?:\s*string,/);
    expect(serviceSrc).toMatch(/addStep\(\s*caseId:\s*string,\s*displayName:\s*string,\s*stepKey\?[^,]*,\s*\/\/[^\n]*\n\s*actorId\?:\s*string,/);
  });

  it('initializeSteps: createMany sets createdByPersonId + updatedByPersonId from actorId', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('public async initializeSteps'),
      serviceSrc.indexOf('public async execute'),
    );
    expect(section).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*null/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('execute: update data block sets updatedByPersonId', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('public async execute'),
      serviceSrc.indexOf('public async addStep'),
    );
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('addStep: create data block sets both cols', () => {
    const section = serviceSrc.slice(
      serviceSrc.indexOf('public async addStep'),
      serviceSrc.indexOf('public async removeStep'),
    );
    expect(section).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*null/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('controller: createCase forwards actor to initializeSteps', () => {
    expect(controllerSrc).toMatch(
      /completeCaseStepService\.initializeSteps\(caseRecord\.id,\s*caseRecord\.caseType\.key,\s*actorId\)/,
    );
  });

  it('controller: completeCaseStep + addCaseStep resolve actor from @Req principal', () => {
    const completeSection = controllerSrc.slice(
      controllerSrc.indexOf('public async completeCaseStep'),
      controllerSrc.indexOf('public async addCaseStep'),
    );
    expect(completeSection).toMatch(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/);
    expect(completeSection).toMatch(/this\.completeCaseStepService\.execute\(id,\s*stepKey,\s*actorId\)/);
    const addSection = controllerSrc.slice(
      controllerSrc.indexOf('public async addCaseStep'),
      controllerSrc.indexOf('public async removeCaseStep'),
    );
    expect(addSection).toMatch(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/);
    expect(addSection).toMatch(
      /this\.completeCaseStepService\.addStep\(id,\s*body\.displayName,\s*body\.stepKey,\s*actorId\)/,
    );
  });
});
