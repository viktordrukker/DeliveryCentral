import { RepositoryPort } from '@src/shared/domain/repository-port';

import { ExternalAccountLink } from '../entities/external-account-link.entity';

export interface ExternalAccountLinkRepositoryPort extends RepositoryPort<ExternalAccountLink> {
  countByProvider(provider: string): Promise<number>;
  countUnlinkedByProvider(provider: string): Promise<number>;
  findByExternalAccountId(
    provider: string,
    externalAccountId: string,
  ): Promise<ExternalAccountLink | null>;
  listByProvider(provider: string): Promise<ExternalAccountLink[]>;
}
