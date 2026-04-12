import { NotificationTemplate } from '../../../domain/entities/notification-template.entity';
import { NotificationTemplateRepositoryPort } from '../../../domain/repositories/notification-template-repository.port';

export class InMemoryNotificationTemplateRepository implements NotificationTemplateRepositoryPort {
  public constructor(private readonly items: NotificationTemplate[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findById(id: string): Promise<NotificationTemplate | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async findByTemplateKey(templateKey: string): Promise<NotificationTemplate | null> {
    return this.items.find((item) => item.templateKey === templateKey) ?? null;
  }

  public async listActive(): Promise<NotificationTemplate[]> {
    return [...this.items];
  }

  public async save(aggregate: NotificationTemplate): Promise<void> {
    const index = this.items.findIndex((item) => item.id === aggregate.id);
    if (index >= 0) {
      this.items.splice(index, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
