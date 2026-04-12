import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';

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
      <MemoryRouter initialEntries={options.initialEntries ?? ['/']}>
        {ui}
      </MemoryRouter>,
    ),
  };
}
