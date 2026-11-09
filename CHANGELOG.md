# @koslibs/api

## 2.1.0

### Minor Changes

- [#6](https://github.com/koslibs/api/pull/6) [`405be33`](https://github.com/koslibs/api/commit/405be3336224bd229829ea4da1d0c96be46e2708) Thanks [@holypower777](https://github.com/holypower777)! - Expose a typed `*Pending` flag from `useApi` for initial loading placeholders and active requests.

## 2.0.0

### Major Changes

- [#5](https://github.com/koslibs/api/pull/5) [`3ba0861`](https://github.com/koslibs/api/commit/3ba0861c12fd126192f93c37309fe0aeaec18d25) Thanks [@holypower777](https://github.com/holypower777)! - Preserve backend error codes with a shared ApiError contract for createApi and
  useApi. Hook error state and onError now receive ApiError instead of strings;
  direct requests reject with ApiError instead of raw AxiosError. ApiError exposes
  errorCode, errorMessage, status, type and the original cause. Distinguish network,
  timeout, invalid-response and unexpected local failures with CLIENT\_\* codes.

    Migrate displayed strings and callbacks to error.errorMessage, branch on
    error.errorCode, and read direct-call HTTP status from error.status. See the
    README migration guide. Cancellation, request lifecycle and successful HTTP
    responses (including failed background jobs in HTTP 200 bodies) are preserved.

## 1.0.0

### Major Changes

- [#4](https://github.com/koslibs/api/pull/4) [`767d224`](https://github.com/koslibs/api/commit/767d224f01e7694214a081326253b44305374d70) Thanks [@holypower777](https://github.com/holypower777)! - Expose describeRequest(params, transportConfig) and ApiRequestDescription on createApi methods. Resolve the live base URL, query serialization and declaration/global/local extenders through the same configuration pipeline as real requests without sending traffic or running Axios interceptors. Enable typed browser mocks without a runtime dependency on the API package. Support builder/configs 2 tooling.

## 0.2.2

### Patch Changes

- [#3](https://github.com/koslibs/api/pull/3) [`c6e0510`](https://github.com/koslibs/api/commit/c6e051071bfcac3653bcdb88848dac2efc5a78bd) Thanks [@holypower777](https://github.com/holypower777)! - Fix useApi loading state under React StrictMode and overlapping requests by ignoring stale completions and cancellations. Reset and unmount invalidate pending requests, cancellation no longer triggers onError, and request failures expose their actual message instead of a placeholder.

## 0.2.1

### Patch Changes

- [`63c4fc7`](https://github.com/koslibs/api/commit/63c4fc722a0653311ba0e1bfd86186ce38cadf07) Thanks [@holypower777](https://github.com/holypower777)! - Update shared build and release tooling to @koslibs/builder 1.0.0 and @koslibs/configs 1.0.0, including the reusable release workflows, to resolve vulnerabilities in development dependencies. Enable TypeScript module interoperability for compatibility with the updated compiler.

## 0.2.0

### Minor Changes

- [#1](https://github.com/koslibs/api/pull/1) [`a8e8d9f`](https://github.com/koslibs/api/commit/a8e8d9f5f1491f741bd05c8b49e6bbcb180066c7) Thanks [@holypower777](https://github.com/holypower777)! - Add disposable global API extenders and per-API extenders to createApi. Apply globals on each request, including previously created APIs. Preserve existing createApi calls and infer local extender parameters.

### Patch Changes

- [#2](https://github.com/koslibs/api/pull/2) [`afd5931`](https://github.com/koslibs/api/commit/afd59318255bd928281685ffa4655691b5658c53) Thanks [@holypower777](https://github.com/holypower777)! - Migrate library builds, typechecking and tests to @koslibs/builder. Upgrade @koslibs/configs to 0.2.12 and use its shared release commands, Git hooks and GitHub workflows to require committed changesets before pushing and generate release versions and CHANGELOG.md from changeset descriptions.

All notable changes to this project will be documented in this file.
