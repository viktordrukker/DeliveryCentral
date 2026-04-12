export interface ApiClientConfig {
  authTokenStorageKey: string;
  baseUrl: string;
}

export const apiClientConfig: ApiClientConfig = {
  authTokenStorageKey:
    import.meta.env.VITE_AUTH_TOKEN_STORAGE_KEY ?? 'deliverycentral.authToken',
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
};
