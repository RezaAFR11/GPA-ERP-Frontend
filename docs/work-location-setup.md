# Work location selection

The Add Work Location form defaults to **Lokasi saat ini**. The administrator
clicks **Gunakan lokasi saat ini** and permits browser location access while
physically at the work site. No Google API key is needed for this option.
HTTPS (or localhost), browser permission, and device location services are required.
Accuracy is shown before saving; check the Google Maps link if GPS is imprecise.

The second option uses Google's Place Autocomplete widget to search Indonesian
addresses. Selecting a result supplies coordinates automatically. Typing an
address alone does not select a location. The API contract still stores latitude
and longitude; there is no backend schema migration.

## Enable address search in Railway staging

1. In Google Cloud, configure billing and enable Maps JavaScript API and
   Places API (New) for the project.
2. Create a browser API key restricted to these APIs and HTTP referrers for the
   frontend, for example `https://gpa-erp-frontend-staging.up.railway.app/*`.
3. In the **frontend staging service**, set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
   This is a public browser key, included in the bundle. Do not use an unrestricted
   key or a backend secret.
4. Rebuild and deploy the frontend. Docker passes this variable into `next build`.
   A restart alone does not update the bundled key or generated CSP headers.

Without this variable, current-location selection remains available and the
address-search option explains that it has not been enabled. Google requests are
only initiated when the address-search option is opened. Google may charge for
Places usage; configure quotas in the Google Cloud project.

With a key configured, the CSP allows Google's documented Maps SDK domains and
`unsafe-eval`, required by Google's documented allowlist policy. Without a key,
the production script policy retains its existing restrictions.

Implementation was reviewed statically only; no tests, builds, browser GPS
requests, or live Google API calls were run as requested.

References:
- https://developers.google.com/maps/documentation/javascript/place-autocomplete-new
- https://developers.google.com/maps/documentation/javascript/get-api-key
- https://developers.google.com/maps/documentation/javascript/content-security-policy
