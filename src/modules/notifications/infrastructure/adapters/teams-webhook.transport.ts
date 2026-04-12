export interface TeamsMessagePayload {
  '@context': 'https://schema.org/extensions';
  '@type': 'MessageCard';
  summary: string;
  title: string;
  text: string;
  themeColor?: string;
}

export interface TeamsWebhookTransport {
  post(webhookUrl: string, payload: TeamsMessagePayload): Promise<{ messageId?: string }>;
}
