# @koslibs/api

## 0.2.0

### Minor Changes

- [#1](https://github.com/koslibs/api/pull/1) [`a8e8d9f`](https://github.com/koslibs/api/commit/a8e8d9f5f1491f741bd05c8b49e6bbcb180066c7) Thanks [@holypower777](https://github.com/holypower777)! - Add disposable global API extenders and per-API extenders to createApi. Apply globals on each request, including previously created APIs. Preserve existing createApi calls and infer local extender parameters.

### Patch Changes

- [#2](https://github.com/koslibs/api/pull/2) [`afd5931`](https://github.com/koslibs/api/commit/afd59318255bd928281685ffa4655691b5658c53) Thanks [@holypower777](https://github.com/holypower777)! - Migrate library builds, typechecking and tests to @koslibs/builder. Upgrade @koslibs/configs to 0.2.12 and use its shared release commands, Git hooks and GitHub workflows to require committed changesets before pushing and generate release versions and CHANGELOG.md from changeset descriptions.

All notable changes to this project will be documented in this file.
