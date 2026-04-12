import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { EmployeeCreatedEvent } from '../events/employee-created.event';
import { EmployeeDeactivatedEvent } from '../events/employee-deactivated.event';
import { OrgUnitId } from '../value-objects/org-unit-id';
import { PersonId } from '../value-objects/person-id';

export type PersonStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

interface PersonProps {
  archivedAt?: Date;
  displayName: string;
  employmentStatus?: PersonStatus;
  familyName: string;
  grade?: string;
  givenName: string;
  orgUnitId?: OrgUnitId;
  primaryEmail?: string;
  role?: string;
  skillsets?: string[];
  terminatedAt?: Date;
}

export class Person extends AggregateRoot<PersonProps> {
  public static register(props: PersonProps, personId: PersonId): Person {
    return new Person(
      {
        ...props,
        employmentStatus: props.employmentStatus ?? 'ACTIVE',
        skillsets: Person.normalizeSkillsets(props.skillsets),
      },
      personId.value,
    );
  }

  public static createEmployee(
    props: {
      email: string;
      grade?: string;
      name: string;
      orgUnitId: OrgUnitId;
      role?: string;
      skillsets?: string[];
      status?: PersonStatus;
    },
    personId: PersonId = PersonId.from(randomUUID()),
  ): Person {
    const normalizedName = props.name.trim();
    if (!normalizedName) {
      throw new Error('Employee name is required.');
    }

    const nameParts = normalizedName.split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) {
      throw new Error('Employee name must include at least given and family name.');
    }

    const normalizedEmail = Person.normalizeEmail(props.email);
    const familyName = nameParts[nameParts.length - 1] ?? '';
    const givenName = nameParts.slice(0, -1).join(' ');
    const employee = new Person(
      {
        displayName: normalizedName,
        employmentStatus: props.status ?? 'INACTIVE',
        familyName,
        grade: props.grade?.trim() || undefined,
        givenName,
        orgUnitId: props.orgUnitId,
        primaryEmail: normalizedEmail,
        role: props.role?.trim() || undefined,
        skillsets: Person.normalizeSkillsets(props.skillsets),
      },
      personId.value,
    );

    employee.addDomainEvent(
      EmployeeCreatedEvent.from({
        email: normalizedEmail,
        name: normalizedName,
        orgUnitId: props.orgUnitId.value,
        personId: employee.personId,
        status: employee.status,
      }),
    );

    return employee;
  }

  public get name(): string {
    return this.props.displayName;
  }

  public get personId(): PersonId {
    return PersonId.from(this.id);
  }

  public get displayName(): string {
    return this.props.displayName;
  }

  public get givenName(): string {
    return this.props.givenName;
  }

  public get familyName(): string {
    return this.props.familyName;
  }

  public get primaryEmail(): string | undefined {
    return this.props.primaryEmail;
  }

  public get status(): PersonStatus {
    return this.props.employmentStatus ?? 'ACTIVE';
  }

  public get orgUnitId(): OrgUnitId | undefined {
    return this.props.orgUnitId;
  }

  public get grade(): string | undefined {
    return this.props.grade;
  }

  public get role(): string | undefined {
    return this.props.role;
  }

  public get skillsets(): string[] {
    return [...(this.props.skillsets ?? [])];
  }

  public get archivedAt(): Date | undefined {
    return this.props.archivedAt;
  }

  public get terminatedAt(): Date | undefined {
    return this.props.terminatedAt;
  }

  public terminate(terminatedAt: Date = new Date()): void {
    if (this.status === 'TERMINATED') {
      throw new Error('Employee is already terminated.');
    }

    this.props.employmentStatus = 'TERMINATED';
    this.props.terminatedAt = terminatedAt;
  }

  public deactivate(): void {
    if (this.status === 'INACTIVE') {
      throw new Error('Employee is already inactive.');
    }

    this.props.employmentStatus = 'INACTIVE';
    this.addDomainEvent(
      EmployeeDeactivatedEvent.from({
        personId: this.personId,
      }),
    );
  }

  private static normalizeEmail(email: string): string {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error('Employee email is required.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Employee email is invalid.');
    }

    return normalizedEmail;
  }

  private static normalizeSkillsets(skillsets?: string[]): string[] {
    if (!skillsets) {
      return [];
    }

    return [...new Set(skillsets.map((skill) => skill.trim()).filter(Boolean))];
  }
}
