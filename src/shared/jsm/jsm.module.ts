import { Global, Module } from '@nestjs/common';

import { JSM_CONNECTOR } from './jsm-connector';
import { JsmCloudAdapter } from './jsm-cloud-adapter';

/**
 * F-4.6 / C1-JSM — global JSM connector module.
 *
 * Provides `JsmCloudAdapter` concrete + the `JSM_CONNECTOR` symbol
 * token aliased to it. A future `JsmDataCenterAdapter` will sit
 * alongside; module construction will pick one based on the
 * `integrations.jsm.deployment` PlatformSetting.
 *
 * @Global() so future modules don't need to add JsmModule to imports.
 */
@Global()
@Module({
  providers: [
    JsmCloudAdapter,
    {
      provide: JSM_CONNECTOR,
      useExisting: JsmCloudAdapter,
    },
  ],
  exports: [JSM_CONNECTOR, JsmCloudAdapter],
})
export class JsmModule {}
