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

```bash
npm run typecheck
npm run build
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

Run npm test for build, runtime tests and TypeScript inference tests.
