import { ExternalSyncState } from '../domain/entities/external-sync-state.entity';
import { ExternalSyncStateRepositoryPort } from '../domain/repositories/external-sync-state-repository.port';

interface UpdateExternalSyncStateInput {
  lastError?: string;
  lastPayloadFingerprint?: string;
  lastSuccessfulSyncedAt?: Date;
  lastSyncedAt?: Date;
  projectExternalLinkId: string;
  syncStatus: 'FAILED' | 'IDLE' | 'PARTIAL' | 'RUNNING' | 'SUCCEEDED';
}

export class UpdateExternalSyncStateService {
  public constructor(
    private readonly externalSyncStateRepository: ExternalSyncStateRepositoryPort,
  ) {}

  public async execute(input: UpdateExternalSyncStateInput): Promise<ExternalSyncState> {
    const existing = await this.externalSyncStateRepository.findByProjectExternalLinkId(
      input.projectExternalLinkId,
    );

    if (existing) {
      existing.mark(input);
      await this.externalSyncStateRepository.save(existing);
      return existing;
    }

    const syncState = ExternalSyncState.create({
      lastError: input.lastError,
      lastPayloadFingerprint: input.lastPayloadFingerprint,
      lastSuccessfulSyncedAt: input.lastSuccessfulSyncedAt,
      lastSyncedAt: input.lastSyncedAt,
      projectExternalLinkId: input.projectExternalLinkId,
      syncStatus: input.syncStatus,
    });

    await this.externalSyncStateRepository.save(syncState);
    return syncState;
  }
}
