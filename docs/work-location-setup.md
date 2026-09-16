# Work location selection

The Add Work Location form provides two options without a Google API key:

1. **Lokasi saat ini** (default): click **Gunakan lokasi saat ini** while at the
   work site and allow browser location access. HTTPS (or localhost) and device
   location services are required. Check the accuracy and map link before saving.
2. **Tempel titik Google Maps**: open Google Maps using the link, find the work
   site, right-click its exact point, then click the coordinates to copy them.
   Paste both numbers into the single field, for example:
   `1.999191006171762, 117.73438784788873`.

The field also accepts Google Maps URLs containing a coordinate pair in `q` or
`query`, or a place marker encoded as `!3dLAT!4dLNG`. Short links must be opened in
Google Maps first to copy the coordinates. Camera-centre `@lat,lng` URLs and
directions links are not used as workplace points because they may identify a
different position. Unsupported links show instructions for copying coordinates.

All parsing happens locally. No Google SDK, Places API, geocoding, or URL fetching
is used. There is no Google API charge for this implementation. The optional
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` Railway variable from the previous implementation
is no longer used and can be removed. Deploy the revised frontend to apply this.

The backend continues receiving latitude and longitude automatically; no schema
migration is needed. Changing sources or editing the pasted value clears the old
selection. Saving requires a valid point, location name, and radius of 10–50,000
metres. Radius and time zone remain administrator inputs.

Code was reviewed statically only. No tests, builds, or live location requests
were run, as requested.
