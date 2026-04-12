export interface RepositoryPort<TAggregate> {
  delete(id: string): Promise<void>;
  findById(id: string): Promise<TAggregate | null>;
  save(aggregate: TAggregate): Promise<void>;
}
