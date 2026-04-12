import { signPlatformJwt } from '@src/modules/identity-access/application/platform-jwt';

interface ParsedArgs {
  personId?: string;
  roles: string[];
  subject: string;
}

const args = parseArgs(process.argv.slice(2));
const issuer = process.env.AUTH_ISSUER ?? 'deliverycentral-local';
const audience = process.env.AUTH_AUDIENCE ?? 'deliverycentral-api';
const secret = process.env.AUTH_JWT_SECRET ?? 'deliverycentral-local-dev-secret';

const token = signPlatformJwt(
  {
    person_id: args.personId,
    roles: args.roles,
    sub: args.subject,
  },
  {
    audience,
    issuer,
    secret,
  },
);

process.stdout.write(`${token}\n`);

function parseArgs(argv: string[]): ParsedArgs {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      values.set(key, 'true');
      continue;
    }

    values.set(key, next);
    index += 1;
  }

  return {
    personId: values.get('person-id'),
    roles: (values.get('roles') ?? 'admin').split(',').map((role) => role.trim()).filter(Boolean),
    subject: values.get('subject') ?? 'local-dev-user',
  };
}
