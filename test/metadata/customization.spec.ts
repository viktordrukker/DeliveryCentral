import { CustomFieldDefinition } from '@src/modules/metadata/domain/entities/custom-field-definition.entity';
import { MetadataDictionary } from '@src/modules/metadata/domain/entities/metadata-dictionary.entity';
import { MetadataEntry } from '@src/modules/metadata/domain/entities/metadata-entry.entity';
import { ValidationRule } from '@src/modules/metadata/domain/entities/validation-rule.entity';
import { WorkflowDefinition } from '@src/modules/metadata/domain/entities/workflow-definition.entity';
import { CustomFieldDefinitionRepositoryPort } from '@src/modules/metadata/domain/repositories/custom-field-definition-repository.port';
import { InMemoryCustomFieldDefinitionRepository } from '@src/modules/metadata/infrastructure/repositories/in-memory/in-memory-custom-field-definition.repository';
import { InMemoryMetadataDictionaryRepository } from '@src/modules/metadata/infrastructure/repositories/in-memory/in-memory-metadata-dictionary.repository';
import { InMemoryWorkflowDefinitionRepository } from '@src/modules/metadata/infrastructure/repositories/in-memory/in-memory-workflow-definition.repository';

describe('Customization and metadata', () => {
  it('creates a metadata dictionary', async () => {
    const repository = new InMemoryMetadataDictionaryRepository();
    const dictionary = MetadataDictionary.create({
      dictionaryKey: 'grades',
      displayName: 'Grades',
      entityType: 'Person',
    });

    await repository.save(dictionary);

    const persisted = await repository.findByDictionaryKey('Person', 'grades');
    expect(persisted?.displayName).toBe('Grades');
  });

  it('supports metadata entry activation and deactivation', () => {
    const entry = MetadataEntry.create({
      displayName: 'Grade 7',
      entryKey: 'g7',
      entryValue: 'G7',
      metadataDictionaryId: 'dictionary-1',
      sortOrder: 1,
    });

    expect(entry.isEnabled).toBe(true);
    entry.deactivate();
    expect(entry.isEnabled).toBe(false);
    entry.activate();
    expect(entry.isEnabled).toBe(true);
  });

  it('attaches a custom field definition to an entity type', async () => {
    const repository: CustomFieldDefinitionRepositoryPort =
      new InMemoryCustomFieldDefinitionRepository();
    const definition = CustomFieldDefinition.create({
      dataType: 'TEXT',
      displayName: 'Request Grade',
      entityType: 'ProjectAssignment',
      fieldKey: 'request_grade',
      scopeOrgUnitId: 'org-1',
    });

    await repository.save(definition);

    const fields = await repository.findByEntityType('ProjectAssignment', 'org-1');
    expect(fields.map((item) => item.fieldKey)).toEqual(['request_grade']);
  });

  it('binds validation rules to a custom field definition', () => {
    const definition = CustomFieldDefinition.create({
      dataType: 'TEXT',
      displayName: 'Band',
      entityType: 'Person',
      fieldKey: 'band',
    });
    const rule = ValidationRule.create({
      fieldKey: 'band',
      ruleKey: 'allowed-values',
      ruleSchema: {
        allowedValues: ['A', 'B', 'C'],
      },
    });

    definition.bindValidationRule(rule);

    expect(definition.validationRules).toHaveLength(1);
    expect(definition.validationRules[0]?.ruleKey).toBe('allowed-values');
  });

  it('supports workflow definition versioning', async () => {
    const repository = new InMemoryWorkflowDefinitionRepository();
    const firstVersion = WorkflowDefinition.create({
      displayName: 'Standard Assignment Approval',
      entityType: 'ProjectAssignment',
      version: 1,
      workflowKey: 'assignment_approval',
    });
    const secondVersion = WorkflowDefinition.create({
      displayName: 'Project Type Specific Approval',
      entityType: 'ProjectAssignment',
      version: 2,
      workflowKey: 'assignment_approval',
    });

    await repository.save(firstVersion);
    await repository.save(secondVersion);

    const latest = await repository.findLatestByWorkflowKey(
      'ProjectAssignment',
      'assignment_approval',
    );
    expect(latest?.version).toBe(2);
  });
});
