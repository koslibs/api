---
'@koslibs/api': major
---

Preserve backend error codes with a shared ApiError contract for createApi and
useApi. Hook error state and onError now receive ApiError instead of strings;
direct requests reject with ApiError instead of raw AxiosError. ApiError exposes
errorCode, errorMessage, status, type and the original cause. Distinguish network,
timeout, invalid-response and unexpected local failures with CLIENT_* codes.

Migrate displayed strings and callbacks to error.errorMessage, branch on
error.errorCode, and read direct-call HTTP status from error.status. See the
README migration guide. Cancellation, request lifecycle and successful HTTP
responses (including failed background jobs in HTTP 200 bodies) are preserved.
