export interface QueryState<TData> {
  data?: TData;
  error?: string;
  isLoading: boolean;
}
