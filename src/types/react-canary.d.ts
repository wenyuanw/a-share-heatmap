// Load React canary channel types (ViewTransition, …) project-wide.
// The App Router resolves `react` to Next's bundled React build, which ships
// ViewTransition even though the installed @types/react marks it canary-only.
// See node_modules/@types/react/canary.d.ts for the loading instructions.
import {} from "react/canary";
