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
