import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * R2 — publicId-resolution contract (charter §8).
 *
 * Recurring bug class: a controller accepts a publicId via the
 * `ParsePublicIdOrUuid` pipe (which only VALIDATES the shape, it does not
 * resolve), and the backing service then passes the raw `usr_…` / `pos_…`
 * string into `prisma.<model>.findUnique({ where: { id } })` against a UUID
 * column → `PrismaClientKnownRequestError: Error creating UUID` → 500. This bit
 * the position /history route (#685), was half-fixed controller-only (#719),
 * and required a service fix (#721) for /people/:id/profile +
 * /suggested-positions. A 2026-06-16 live sweep confirmed the Person publicId
 * surface (5 GET endpoints) now resolves (5/5 → 200).
 *
 * This contract test is the durable, CI-runnable guard (staging is unreachable
 * from CI): it enumerates every `ParsePublicIdOrUuid` controller param and
 * asserts (a) the count is the reviewed baseline — so a NEW such endpoint
 * forces a conscious update here — and (b) every module exposing one carries a
 * publicId→uuid resolution idiom in its service/infrastructure layer.
 */

const MODULES_DIR = join(__dirname, '..', '..', '..', 'src', 'modules');

function walk(dir: string, pred: (f: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p, pred));
    else if (pred(p)) out.push(p);
  }
  return out;
}

// The same idiom the directory repos + the #721 fix use to resolve id-or-publicId.
const RESOLUTION_IDIOM =
  /looksLikeUuid|where:\s*\{\s*publicId|ByIdOrPublicId|publicId:\s*idOrPublicId|publicIdService|resolve\w*([Pp]ublicId|InternalId)/;

interface Site {
  file: string;
  module: string;
  aggregate: string;
  param: string;
}

function collectSites(): Site[] {
  const controllers = walk(MODULES_DIR, (f) => f.endsWith('.controller.ts'));
  const re = /@Param\(\s*'([^']+)'\s*,\s*ParsePublicIdOrUuid\(AggregateType\.(\w+)\)/g;
  const sites: Site[] = [];
  for (const file of controllers) {
    const txt = readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = re.exec(txt)) !== null) {
      const module = file.split(`${join('src', 'modules')}/`)[1]?.split('/')[0] ?? file.split('/modules/')[1].split('/')[0];
      sites.push({ file, module, aggregate: m[2], param: m[1] });
    }
  }
  return sites;
}

describe('publicId-resolution contract (R2)', () => {
  const sites = collectSites();

  // Reviewed baseline 2026-06-16 (Person surface live-swept 5/5 → 200). When a
  // new ParsePublicIdOrUuid endpoint is added, bump this AND confirm its backing
  // service resolves publicId (see #721 for the pattern + a unit test example).
  const EXPECTED_SITE_COUNT = 11;

  it(`enumerates exactly ${EXPECTED_SITE_COUNT} ParsePublicIdOrUuid endpoints (a new one must be reviewed here)`, () => {
    expect(sites.length).toBe(EXPECTED_SITE_COUNT);
  });

  it('finds ParsePublicIdOrUuid sites only for known aggregates', () => {
    const aggregates = [...new Set(sites.map((s) => s.aggregate))].sort();
    expect(aggregates).toEqual(['Person', 'ProjectPosition', 'Skill']);
  });

  it('every module exposing a ParsePublicIdOrUuid endpoint resolves publicId in its service/infra layer', () => {
    const modules = [...new Set(sites.map((s) => s.module))];
    const offenders: string[] = [];
    for (const mod of modules) {
      const layerFiles = [
        ...walk(join(MODULES_DIR, mod, 'application'), (f) => f.endsWith('.ts') && !/\.(spec|test)\.ts$/.test(f)),
        ...walk(join(MODULES_DIR, mod, 'infrastructure'), (f) => f.endsWith('.ts') && !/\.(spec|test)\.ts$/.test(f)),
      ];
      const resolves = layerFiles.some((f) => RESOLUTION_IDIOM.test(readFileSync(f, 'utf8')));
      if (!resolves) offenders.push(mod);
    }
    expect(offenders).toEqual([]);
  });
});
