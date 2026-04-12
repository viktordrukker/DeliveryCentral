import { useEffect, useMemo, useState } from 'react';

import {
  NotificationOutcome,
  NotificationTemplate,
  NotificationTestSendResponse,
  fetchNotificationOutcomes,
  fetchNotificationTemplates,
  sendNotificationTest,
} from '@/lib/api/notifications';

export interface NotificationTestFormValues {
  payload: string;
  recipient: string;
}

interface NotificationTemplatesState {
  error: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  outcomes: NotificationOutcome[];
  result: NotificationTestSendResponse | null;
  selectTemplate: (templateKey: string) => void;
  selectedTemplate: NotificationTemplate | null;
  selectedTemplateKey: string | null;
  submitTestSend: (values: NotificationTestFormValues) => Promise<boolean>;
  successMessage: string | null;
  templates: NotificationTemplate[];
}

export const initialNotificationTestFormValues: NotificationTestFormValues = {
  payload: '{\n  "personName": "Zoe Turner",\n  "projectName": "Atlas ERP Rollout"\n}',
  recipient: '',
};

export function useNotificationTemplates(): NotificationTemplatesState {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [outcomes, setOutcomes] = useState<NotificationOutcome[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NotificationTestSendResponse | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.templateKey === selectedTemplateKey) ?? null,
    [selectedTemplateKey, templates],
  );

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    void Promise.all([fetchNotificationTemplates(), fetchNotificationOutcomes()])
      .then(([templateResponse, outcomesResponse]) => {
        if (!isMounted) {
          return;
        }

        setTemplates(templateResponse);
        setOutcomes(outcomesResponse);
        setSelectedTemplateKey(templateResponse[0]?.templateKey ?? null);
      })
      .catch((reason: Error) => {
        if (!isMounted) {
          return;
        }

        setError(reason.message);
        setTemplates([]);
        setOutcomes([]);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function reloadOutcomes(): Promise<void> {
    const response = await fetchNotificationOutcomes();
    setOutcomes(response);
  }

  async function submitTestSend(values: NotificationTestFormValues): Promise<boolean> {
    if (!selectedTemplate) {
      setError('Select a template first.');
      return false;
    }

    if (!values.recipient.trim()) {
      setError('Recipient is required.');
      return false;
    }

    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(values.payload) as Record<string, unknown>;
    } catch {
      setError('Payload must be valid JSON.');
      return false;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setSuccessMessage(null);

    try {
      const response = await sendNotificationTest({
        channelKey: selectedTemplate.channelKey,
        payload,
        recipient: values.recipient.trim(),
        templateKey: selectedTemplate.templateKey,
      });

      setResult(response);
      setSuccessMessage(
        `Test notification ${response.status.toLowerCase()} for ${selectedTemplate.displayName}.`,
      );
      await reloadOutcomes();
      return true;
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Failed to send test notification.',
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    error,
    isLoading,
    isSubmitting,
    outcomes,
    result,
    selectTemplate: (templateKey: string) => {
      setSelectedTemplateKey(templateKey);
      setError(null);
      setResult(null);
      setSuccessMessage(null);
    },
    selectedTemplate,
    selectedTemplateKey,
    submitTestSend,
    successMessage,
    templates,
  };
}
