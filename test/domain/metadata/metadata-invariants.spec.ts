import { CustomFieldDefinition } from '@src/modules/metadata/domain/entities/custom-field-definition.entity';
import { MetadataDictionary } from '@src/modules/metadata/domain/entities/metadata-dictionary.entity';
import { MetadataEntry } from '@src/modules/metadata/domain/entities/metadata-entry.entity';
import { ValidationRule } from '@src/modules/metadata/domain/entities/validation-rule.entity';
import { expectDomainError } from '../../helpers/domain-assertions.helper';

describe('metadata domain invariants', () => {
  it('supports dictionary and entry activation state without hardcoded business values', () => {
    const dictionary = MetadataDictionary.create(
      {
        description: 'Project type vocabulary.',
        dictionaryKey: 'project-types',
        displayName: 'Project Types',
        entityType: 'Project',
      },
      'dictionary-1',
    );
    const entry = MetadataEntry.create(
      {
        displayName: 'Internal Initiative',
        entryKey: 'internal',
        entryValue: 'INTERNAL',
        metadataDictionaryId: dictionary.id,
        sortOrder: 1,
      },
      'entry-1',
    );

    entry.deactivate();
    expect(entry.isEnabled).toBe(false);

    entry.activate();
    expect(entry.isEnabled).toBe(true);
    expect(dictionary.dictionaryKey).toBe('project-types');
  });

  it('binds validation rules to custom fields for valid entity types only', async () => {
    const field = CustomFieldDefinition.create(
      {
        dataType: 'ENUM',
        displayName: 'Project Type',
        entityType: 'Project',
        fieldKey: 'projectType',
        metadataDictionaryId: 'dictionary-1',
      },
      'field-1',
    );
    const rule = ValidationRule.create(
      {
        fieldKey: 'projectType',
        ruleKey: 'requiredWhenActive',
        ruleSchema: { required: true },
      },
      'rule-1',
    );

    field.bindValidationRule(rule);

    expect(field.entityType).toBe('Project');
    expect(field.validationRules).toHaveLength(1);
    expect(field.validationRules[0]?.ruleKey).toBe('requiredWhenActive');

    await expectDomainError(
      () =>
        CustomFieldDefinition.create({
          dataType: 'TEXT',
          displayName: 'Unsupported Target',
          entityType: 'JiraIssue',
          fieldKey: 'jiraIssueKey',
        }),
      /Custom field definition entity type must be one of:/,
    );
  });
});
