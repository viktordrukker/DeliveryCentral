export interface EmailTransportMessage {
  from: string;
  replyTo?: string;
  subject: string;
  text: string;
  to: string;
}

export interface EmailTransportResult {
  messageId?: string;
}

export interface EmailTransport {
  isConfigured(): boolean;
  send(message: EmailTransportMessage): Promise<EmailTransportResult>;
}
