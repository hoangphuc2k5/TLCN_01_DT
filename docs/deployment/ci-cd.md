# CI and container delivery

`.github/workflows/ci.yml` checks the API, React app, Playwright integration fixture,
and both production Docker images. Pull requests build images without registry
credentials or publishing. A push to `main` publishes the **same tested images**
only after all four jobs succeed for that workflow commit. Manual runs check only.
This delivers packages to GHCR; it does not deploy a server.

## GitHub setup

- Enable Actions and allow this repository's `GITHUB_TOKEN` to publish packages.
  Only the publish job receives `packages: write`; other jobs have `contents: read`.
  No PAT is required by the workflow. Existing GHCR packages may need this repository
  added under their Actions access settings.
- Protect `main` and require `Backend tests`, `Frontend tests and build`,
  `Playwright E2E (local fixture)`, `Container build (api)`, and
  `Container build (web)`. Configure this in GitHub; local files cannot enforce it.
- Optional repository Actions variables: `VITE_GOOGLE_CLIENT_ID` and
  `VITE_ALLOW_PASSWORD_LOGIN` (defaults to `false`). They are public build inputs.
  Never place passwords, signing keys, or other secrets in `VITE_*` variables.
  Changing them requires a new build/commit. The web image uses same-origin `/v1`.
- Actions are pinned to full commit SHAs with version comments. Pins were verified
  against the corresponding official GitHub repositories with `git ls-remote`.
  Update the SHA and comment together after reviewing an official release.

Images are `ghcr.io/hoangphuc2k5/tlcn_01_dt-api` and
`ghcr.io/hoangphuc2k5/tlcn_01_dt-web` (derived from the lowercase repository name).
Each release receives `sha-<full-commit-sha>` and, when still current main, `latest`.
Existing commit tags are reused on reruns rather than overwritten. GHCR does not
enforce tag immutability against other authorized publishers; use the image digest
when that guarantee is required. Both main workflows and publication are serialized.
A main-head check prevents stale reruns from moving `latest` backward. GitHub
concurrency may replace pending runs; it does not promise a release for every push.

Publishing two images is not an atomic registry operation. If a push fails, rerun
failed jobs for the same commit; the already-published commit tag is reused.
Deploy API and web using the same full SHA, never by independently resolving latest.
Package visibility is not changed by this workflow.

## Local checks

Run `npm ci` and `npm test` inside each app, then `npm run build` and
`npm run test:e2e` inside `ReactJS` (install Chromium with
`npx playwright install --with-deps chromium` first). Backend integration tests and
E2E use disposable MongoDB fixtures, not production databases.

With Docker installed, from the repository root:

```sh
docker build -t tlcn-api:local ExpressJS
docker build -t tlcn-web:local ReactJS
docker run --rm tlcn-api:local node -e "const b = require('bcrypt'); if (!b.compareSync('smoke', b.hashSync('smoke', 4))) process.exit(1)"
docker run --rm --add-host api:127.0.0.1 tlcn-web:local nginx -t
```

The API build installs only production dependencies and checks native bcrypt on
Linux. The runtime runs as the `node` user; scripts, fonts, views, and other `src`
assets remain available. The same API image runs a separate worker via `npm run worker`.
The frontend uses a multi-stage Vite build and Nginx SPA fallback with WebSocket
upgrade and unbuffered SSE forwarding for `/v1`. Base image tags receive upstream
updates on rebuild; commit image tags preserve the first published build.

## Run on a host later

Provision an external MongoDB replica set or Atlas database and TLS ingress before
production use. Copy `ExpressJS/.env.example` into a private runtime env file outside
the repository and replace placeholders. Set `NODE_ENV=production`, `PORT=8080`,
`MONGO_DB_URL`, a strong `JWT_SECRET`, the public `FRONTEND_URL`/allowed origins, and
the relevant mail/OAuth/payment/MFA/backup secrets. Use absolute
`FILE_LOCAL_ROOT=/app/storage/private` with local storage. Keep production credentials
out of build contexts and artifacts. MongoDB and user files are never image contents.

Example commands (POSIX shell; replace the full SHA and env-file path):

```sh
SHA=<full-commit-sha>
API=ghcr.io/hoangphuc2k5/tlcn_01_dt-api:sha-$SHA
WEB=ghcr.io/hoangphuc2k5/tlcn_01_dt-web:sha-$SHA
docker pull "$API"
docker pull "$WEB"
docker network create tlcn
docker volume create tlcn-files
docker run -d --name api --network tlcn --restart unless-stopped \
  --env-file /secure/tlcn.env -v tlcn-files:/app/storage/private "$API"
docker run -d --name worker --network tlcn --restart unless-stopped \
  --env-file /secure/tlcn.env -v tlcn-files:/app/storage/private "$API" npm run worker
docker run -d --name web --network tlcn --restart unless-stopped \
  -p 127.0.0.1:8088:80 "$WEB"
curl --fail http://127.0.0.1:8088/v1/api/health
```

For private packages, authenticate the host with a read-only package credential
using `docker login ghcr.io --password-stdin` before pulling. Runtime authentication
is separate from the short-lived workflow token. Start API before web because Nginx
resolves the `api` network name on startup; reload/restart web after recreating API
if its container IP changes. Persist and back up the shared volume; bind mounts must
be writable by UID/GID 1000. For S3 storage, configure both API and worker identically.
Review Nginx's 12 MiB request limit alongside `FILE_MAX_BYTES` and multipart overhead
for the chosen host. Configure TLS/proxy headers and public callback URLs there.

Record the previous working SHA and image digests before rollout. To roll back,
recreate API, worker, and web with the previous matching SHA and the same persistent
storage, then check health, login, file access, and realtime behavior. Database schema
or data changes require their own compatible rollback plan.

## Evidence and troubleshooting

The frontend bundle is retained for 7 days, Playwright reports/traces for 7 days,
and tested image archives for 1 day. Use Actions logs and the run's commit SHA to
investigate a failure. Rerun failed jobs from that run; do not bypass failed checks.
If the image archives have expired, rerun all jobs to rebuild and upload them.

Local Docker validation, a successful GitHub Actions run, successful registry push,
and a running deployment are separate evidence. Creating these files does not prove
any of the latter three, and no host or branch-protection setting is configured here.

References: [GitHub container publishing](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images),
[workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency),
and [Nginx WebSocket proxying](https://nginx.org/en/docs/http/websocket.html).
