import { RepositoryPort } from '@src/shared/domain/repository-port';

import { PersonExternalIdentityLink } from '../entities/person-external-identity-link.entity';

export interface PersonExternalIdentityLinkRepositoryPort
  extends RepositoryPort<PersonExternalIdentityLink> {
  countByProvider(provider: string): Promise<number>;
  findByExternalUserId(
    provider: string,
    externalUserId: string,
  ): Promise<PersonExternalIdentityLink | null>;
  findByPersonId(provider: string, personId: string): Promise<PersonExternalIdentityLink | null>;
  listByProvider(provider: string): Promise<PersonExternalIdentityLink[]>;
}
