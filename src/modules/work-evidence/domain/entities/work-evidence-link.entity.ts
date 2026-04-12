import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

interface WorkEvidenceLinkProps {
  externalKey: string;
  externalUrl?: string;
  linkType: string;
  provider: string;
}

export class WorkEvidenceLink extends AggregateRoot<WorkEvidenceLinkProps> {
  public static create(props: WorkEvidenceLinkProps, id?: string): WorkEvidenceLink {
    return new WorkEvidenceLink(props, id ?? randomUUID());
  }
}
