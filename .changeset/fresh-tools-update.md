---
'@koslibs/api': patch
---

Update shared build and release tooling to @koslibs/builder 1.0.0 and @koslibs/configs 1.0.0, including the reusable release workflows, to resolve vulnerabilities in development dependencies. Enable TypeScript module interoperability for compatibility with the updated compiler.

Fix useApi loading state under React StrictMode and overlapping requests by ignoring stale completions and cancellations. Reset and unmount invalidate pending requests, cancellation no longer triggers onError, and request failures expose their actual message instead of a placeholder.
