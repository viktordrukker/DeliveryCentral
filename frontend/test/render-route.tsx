import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import { DrilldownProvider } from '@/app/drilldown-context';
import { TitleBarProvider, useTitleBarActions } from '@/app/title-bar-context';
import { TipsProvider } from '@/components/common/TipBalloon';

function TitleBarActionsSlot(): JSX.Element {
  const { actions } = useTitleBarActions();
  return <div data-testid="title-bar-actions">{actions}</div>;
}

interface RenderRouteOptions {
  initialEntries?: MemoryRouterProps['initialEntries'];
}

export function renderRoute(
  ui: ReactNode,
  options: RenderRouteOptions = {},
) {
  return {
    user: userEvent.setup(),
    ...render(
      <TipsProvider>
        <TitleBarProvider>
          <MemoryRouter initialEntries={options.initialEntries ?? ['/']}>
            <DrilldownProvider>
              <TitleBarActionsSlot />
              {ui}
            </DrilldownProvider>
          </MemoryRouter>
        </TitleBarProvider>
      </TipsProvider>,
    ),
  };
}
