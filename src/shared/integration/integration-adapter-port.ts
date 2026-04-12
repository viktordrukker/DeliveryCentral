export interface IntegrationAdapterPort<TCommand = unknown, TResult = unknown> {
  execute(command: TCommand): Promise<TResult>;
  getProviderName(): string;
}
