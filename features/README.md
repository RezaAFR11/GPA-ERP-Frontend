# Feature Structure

The frontend uses feature-first ownership while preserving Next.js App Router URLs.

## Boundaries

- `app/` defines routes, layouts, and framework entry points. Route pages should stay thin.
- `features/` owns business screens, feature components, and feature-only calculations.
- `components/` contains reusable UI, layout, authentication, and command-palette components.
- `lib/api/` contains HTTP clients grouped by backend domain.
- `lib/types/` contains API contracts shared by multiple features.
- Other files in `lib/` are technical utilities used across feature boundaries.

## Feature Layout

Use only the folders needed by a feature:

```text
features/<domain>/<feature>/
|-- <feature>-page.tsx
|-- components/
|-- lib/
|-- hooks/
`-- types.ts
```

Keep calculations or configuration beside their owning feature when no other domain uses them.
Promote code to `components/` or `lib/` only after it is genuinely shared.

## Route Pattern

Route files retain stable URLs and re-export their feature page:

```tsx
"use client";

export { default } from "@/features/finance/revenue/revenue-page";
```

This separation allows feature code to be reorganized without changing navigation behavior.
