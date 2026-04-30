/**
 * Vite override for Ladle running inside Docker.
 *
 * In a containerized dev setup, Vite's default HMR WebSocket port (24678)
 * is not published outside the container, so the browser hits
 * `ws://localhost:24678` and gets ECONNREFUSED.
 *
 * The fix is to route HMR over the SAME publicly-mapped port the dev
 * server uses (61000), which Docker already forwards. Vite will handle
 * the WebSocket upgrade on the HTTP port — so HMR just works without
 * adding more port mappings to docker-compose.yml.
 *
 * `LADLE_PORT` mirrors the env var set by the `ladle` service in
 * docker-compose.yml; defaults to 61000 outside Docker.
 */
import { defineConfig } from 'vite';

const port = Number(process.env.LADLE_PORT ?? 61000);

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    hmr: {
      // Vite's HMR runs as a separate WS server (Ladle doesn't multiplex
      // it onto the HTTP port). We pin it to 24678 — the same port we now
      // expose in docker-compose — and rely on Vite binding to 0.0.0.0
      // because `server.host` is set to it. Browser connects directly to
      // ws://localhost:24678 which Docker forwards to the container.
      protocol: 'ws',
      port: 24678,
      clientPort: 24678,
    },
    // chokidar polling — Docker bind-mounted volumes don't always emit
    // inotify events on Linux. CHOKIDAR_USEPOLLING in the env covers
    // this for the main frontend service; we explicitly opt in here in
    // case the env var isn't propagated.
    watch: {
      usePolling: true,
      interval: 250,
    },
  },
});
