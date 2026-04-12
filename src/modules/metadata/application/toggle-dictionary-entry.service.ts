import { Injectable } from '@nestjs/common';

import { MetadataEntry } from '../domain/entities/metadata-entry.entity';
import { MetadataEntryRepositoryPort } from '../domain/repositories/metadata-entry-repository.port';

interface ToggleDictionaryEntryCommand {
  entryId: string;
  isEnabled: boolean;
}

@Injectable()
export class ToggleDictionaryEntryService {
  public constructor(
    private readonly metadataEntryRepository: MetadataEntryRepositoryPort,
  ) {}

  public async execute(command: ToggleDictionaryEntryCommand): Promise<MetadataEntry> {
    const entry = await this.metadataEntryRepository.findById(command.entryId);

    if (!entry) {
      throw new Error('Metadata dictionary entry not found.');
    }

    if (command.isEnabled) {
      entry.activate();
    } else {
      entry.deactivate();
    }

    await this.metadataEntryRepository.save(entry);

    return entry;
  }
}
