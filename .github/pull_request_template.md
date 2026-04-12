## What

<!-- One sentence: what does this PR do? -->

## Why / JTBD

<!-- Name the persona and job this serves. Example: "Resource Manager — see idle people before conflicts escalate" -->
<!-- If this is infrastructure/tooling, state the operational reason. -->

## How

<!-- Brief description of the approach. Skip if obvious from the diff. -->

## Checklist

- [ ] JTBD is named above (or infra reason is stated)
- [ ] Backend tests pass locally (`npm run test:unit && npm run test:domain && npm run test:integration`)
- [ ] Frontend tests pass locally (`npm --prefix frontend test`)
- [ ] No new env vars added without updating `.env.example` and `docker-compose.prod.yml`
- [ ] No new Docker services added without updating `docker-compose.prod.yml`
- [ ] No changes to Dockerfile without verifying production build still works
- [ ] API contracts preserved (or breaking change is explicitly discussed)
- [ ] Bounded context ownership respected (Team ≠ OrgUnit ≠ Project)
- [ ] Docs updated if meaningful behaviour changed
