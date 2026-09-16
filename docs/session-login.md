# Browser session routing

The browser calls `/api` on the frontend origin. Next.js forwards those requests
to the backend configured in `NEXT_PUBLIC_API_URL`. Backend login and logout
responses set/clear the host-only HttpOnly cookie on the frontend domain. This
avoids depending on third-party cookies between separate Railway domains.

`/uploads` is also proxied, and backend file URLs used by the authenticated file
helper are mapped to the frontend origin. The local `/api/health` route remains
available for the frontend health check.

## Deployment

- Keep `NEXT_PUBLIC_API_URL` as the absolute backend API URL for the same
  environment, including `/api`. Do not change this variable to `/api` or the
  frontend URL: it is the upstream destination, not the browser request URL.
- Rebuild/redeploy the frontend to apply the proxy configuration. Docker embeds
  this configuration at build time.
- Keep the frontend origin in backend `ALLOWED_ORIGINS`. The backend still
  validates the Origin header for cookie-authenticated writes.
- Production uses HTTPS and `DEBUG=false` so the session cookie remains Secure.
  Keep the existing HttpOnly cookie settings; no token storage in browser JS is
  required.
- Users sign in again after this deployment because the frontend domain does
  not receive cookies previously stored on the backend domain.

Login only navigates to the application after both the user and menu permissions
have loaded successfully. If session loading fails, the login form displays an
error. A late session restoration response cannot overwrite a newer login or
logout state.

Implementation was reviewed statically. No tests or build were run, as requested.
