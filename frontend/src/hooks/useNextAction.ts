import { useCallback, useState } from 'react';

import type { NextActionProps } from '@/components/common/NextAction';

export function useNextAction(): {
  nextAction: NextActionProps | null;
  showNextAction: (props: NextActionProps) => void;
  dismiss: () => void;
} {
  const [nextAction, setNextAction] = useState<NextActionProps | null>(null);
  const showNextAction = useCallback((props: NextActionProps) => setNextAction(props), []);
  const dismiss = useCallback(() => setNextAction(null), []);
  return { nextAction, showNextAction, dismiss };
}
