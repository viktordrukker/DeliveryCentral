import { Global, Module } from '@nestjs/common';

import { LdapDirectoryAdapter } from './ldap-directory-adapter';

/**
 * F-4.7 / NEW C1-LDAP — global LDAP directory module.
 *
 * Exports the concrete `LdapDirectoryAdapter` for now. A typed
 * `LdapDirectoryConnector` interface can come later if a second
 * adapter shape (e.g. ApacheDS, FreeIPA with a different attribute
 * mapping) is needed.
 *
 * @Global() so future modules don't need to add LdapModule to imports.
 */
@Global()
@Module({
  providers: [LdapDirectoryAdapter],
  exports: [LdapDirectoryAdapter],
})
export class LdapModule {}
