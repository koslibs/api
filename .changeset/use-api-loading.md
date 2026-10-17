---
'@koslibs/api': patch
---

Fix useApi loading state under React StrictMode and overlapping requests by ignoring stale completions and cancellations. Reset and unmount invalidate pending requests, cancellation no longer triggers onError, and request failures expose their actual message instead of a placeholder.
