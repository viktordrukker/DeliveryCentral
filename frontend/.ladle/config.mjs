/**
 * Ladle config — DC Design System component playground.
 * Phase DS-1-3.
 *
 * Stories live alongside their components as `*.stories.tsx`, scoped to the
 * design-system surface (`src/components/ds/**`). As DS-2..DS-5 ship more
 * components, expand the `stories` glob.
 */
export default {
  stories: 'src/components/ds/**/*.stories.{ts,tsx}',
  defaultStory: 'button--primary',
  // Phase DS-1-3 — Ladle's default `hmrHost: "localhost"` resolves to
  // IPv6 loopback (::1) inside the container, which Docker port-forward
  // can't reach. Bind HMR to all interfaces. Vite's client falls back to
  // the page's location host when this is 0.0.0.0, so the browser will
  // connect to `ws://localhost:24678` (forwarded by Docker → container
  // 0.0.0.0:24678).
  hmrHost: '0.0.0.0',
  hmrPort: Number(process.env.LADLE_HMR_PORT ?? 24678),
  addons: {
    theme: {
      enabled: true,
      defaultState: 'light',
    },
    width: {
      enabled: true,
      // Phase DS — match the breakpoint tokens in design-tokens.ts.
      options: {
        sm: 640,
        md: 1024,
        lg: 1280,
        full: 0,
      },
      defaultState: 0,
    },
    rtl: {
      enabled: false,
    },
    a11y: {
      enabled: true,
    },
    action: {
      enabled: true,
    },
  },
};
