# @koslibs/api

Reusable API utilities and React hooks extracted into a standalone TypeScript package.

## Install

```bash
npm install @koslibs/api
```

## Usage

```ts
import { createApi, setBaseApiPath, useApi } from '@koslibs/api';
```

```ts
import { createApi } from '@koslibs/api/create-api';
```

## Base API Path

`getBaseApiPath()` now resolves the base URL in this order:

1. `setBaseApiPath(...)`
2. `process.env.API_BASE_PATH`
3. `http://localhost:34121`

Example:

```ts
import { createApi, setBaseApiPath } from '@koslibs/api';

setBaseApiPath('https://api.example.com');
```

If you want to use the environment variable instead:

```bash
API_BASE_PATH=https://api.example.com
```

In another project this works automatically in Node.js, because `process.env` exists at runtime. In browser apps it only works if the consuming build tool exposes or replaces `process.env.API_BASE_PATH`. If the target app uses Vite or another `import.meta.env`-style setup, the safer approach is to read that env in the app and call `setBaseApiPath(...)` yourself.

## Exports

- `@koslibs/api`
- `@koslibs/api/axios`
- `@koslibs/api/create-api`
- `@koslibs/api/create-api/api-base-path`
- `@koslibs/api/use-api`

## Development

Requires Node.js >= 24.13.0. Build and typechecking use `@koslibs/builder`;
`koslibs-builder.ts` contains the local build settings. The library is emitted
as ESM with preserved module paths and declarations in `dist`.

```bash
npm run typecheck
npm run build
npm test
npm run lint
```

## Global and per-API extenders

```ts
import { addGlobalApiExtenders, createApi } from '@koslibs/api';

// Register once at application startup. Read current state on every request.
const dispose = addGlobalApiExtenders((extenders) =>
    extenders.add((config) => ({
        ...config,
        headers: { ...config.headers, 'Profile-Id': String(getCurrentProfileId()) },
    }))
);

const tournaments = createApi(tournamentsDeclaration, 'api/v1/tournaments');
const special = createApi(specialDeclaration, 'api/v1/special', {
    extenders: (extenders) =>
        extenders.add((config) => ({
            ...config,
            headers: { ...config.headers, 'X-Special': 'yes' },
        })),
});

// Cleanup on application teardown; in Vite also use import.meta.hot?.dispose(dispose).
dispose();
```

The state getter and declarations above belong to the consuming application.
The library does not depend on profiles or a state manager. Decide in the app
whether an absent profile should omit the header or reject the request.

Order: declaration/transport options, built-in base URL/path, global extenders
in registration order, then per-API extenders. Later extenders may override
earlier settings; preserve unrelated headers when adding a header.

Global registration affects subsequent requests from all APIs using this module
instance, including APIs created earlier. A request snapshots registrations;
changes during execution affect the next request. Each registration returns its
own idempotent disposer. Register once, not on every render, and dispose during
tests/HMR cleanup. Multiple copies of the package have separate registries.
Do not register user-specific closures globally in a shared SSR server process.

Extenders are synchronous and execute on every request; thrown errors reject
before transport. Collection builders run at registration/API creation time.
Global extenders use closures and cannot add required request arguments, because
runtime registration cannot change TypeScript types of existing createApi calls.
Per-API extenders infer their additional parameters in the request's second
argument. Required parameters are enforced; signal/cancelToken remain supported.

The legacy createApi(declaration, path) signature remains supported.
There is no initCreatorApi. No Axios interceptors are installed.
createApi, addGlobalApiExtenders and CreateApiOptions are available from the
root and @koslibs/api/create-api. RequestConfigExtender and
ConfigExtendersCollection types are exported from the root.

Run npm test for build (pretest), runtime tests through Rstest and TypeScript inference tests (posttest).
Runtime tests import the built package, so they also exercise its public exports.
Run npm run test:types to check inference against an existing build.

## Changesets and releases

Release commands and Git hooks come from `@koslibs/configs@1.0.0` through
`koslibs-release`. The local `lefthook.yml` extends the shared preset;
Changesets and Lefthook do not need separate project dependencies.
The formatter is `@koslibs/configs/changelog`, configured for `koslibs/api`.

Before pushing a branch, run `npm run changeset`. Select `@koslibs/api`, choose
`patch`, `minor` or `major`, and describe the change. Commit the generated
`.changeset/*.md` file together with your changes, then push.

`npm run changeset:check` checks committed changes against `origin/main`.
Run `git fetch origin main` if that reference is unavailable or outdated.
The pre-push hook checks the actual commits being pushed, so an untracked or
staged changeset does not count. Every branch with new commits needs a new,
non-empty changeset; documentation and tooling changes also follow this rule.
Branch deletion, tag pushes and commits already included in `origin/main` do
not need another changeset. Git hooks are installed by `npm install` / `npm ci`
through `prepare`; run `npm run prepare` to reinstall them.

PRs targeting `main` also run the shared `Changeset required` check. Make the
check emitted by the reusable workflow required in GitHub branch protection
for `main` to block merges when it fails. After migrating from the standalone
workflow, select the new check in the ruleset if the old check was required.
Keep an allowed path for automated release commits to `main`; otherwise branch
protection will reject the version/changelog push. Repositories that require a
PR for every write may need a release GitHub App with an explicit ruleset bypass.
Local hooks can be bypassed with `--no-verify`; the PR check still runs.

After merging into `main`, the release workflow runs `changeset version`, which
updates the package version and `CHANGELOG.md` and removes consumed changesets.
The workflow refreshes `package-lock.json`, commits all release changes, then
publishes to npm and pushes release tags. The largest pending version bump wins;
several patch changesets produce one patch release. Only the automated release
commit bypasses local hooks, because its changesets have just been consumed.
Changelog generation uses the workflow's `GITHUB_TOKEN` for GitHub links.

The release, snapshot and PR-check workflows call the shared workflows from
`koslibs/configs`, pinned to the Git tag `v1.0.0`. The npm dependency and GitHub
workflow reference are updated separately. Both publication workflows map the
existing `NPM_TOKEN` secret to the shared workflow's `npm_token` input.
If branch protection requires a release GitHub App, pass its token as the
optional `release_token` secret in the release caller.
