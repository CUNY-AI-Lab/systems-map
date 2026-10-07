# Systems map

A one-screen map of the CUNY AI Lab's tools and the shared services under
them, built to be handed to colleagues by link.

The front page is the overview. Each tool is a column, and the front door and
model gateway are bars spanning the tools that use them, so a reader can see
which tool sits behind which shared service without following lines. Picking a
request lights its path with numbered steps; clicking a box opens the plain
description and the technical details.

## Editing the overview

Everything the overview says is in `src/poster/data.ts`:

| Export | Decides |
|---|---|
| `TOOL_ORDER` | The columns, left to right |
| `BEHIND_FRONT_DOOR`, `OWN_SIGN_IN`, `CALLS_GATEWAY` | Which bar spans which tools |
| `MODEL_HOSTS` | The hosts under the gateway |
| `BLOCKS` | Every box's text |
| `JOURNEYS` | The requests a reader can follow |

A bar must cover a contiguous run of columns. If a change to the wiring breaks
that, the page throws at load, and the fix is to reorder `TOOL_ORDER`.

The wiring follows the code, with two simplifications: PDF Accessibility is
drawn behind the front door and on the gateway, where it is moving, and the
Sandbox's older direct provider settings are left out.

Write the copy with people as the subjects (you, we, our staff, instructors),
and run it through prose-lint before publishing.

## Working on it

```bash
bun install
bun run dev
```

## Publishing

Pushes to `main` build and deploy to GitHub Pages via
`.github/workflows/pages.yml`. The site is public so it can be handed to
colleagues by link; it describes architecture only, and carries no account
identifiers, hostnames of private services, or credentials.
