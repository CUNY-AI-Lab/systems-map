# Fleet map

An interactive map of the CUNY AI Lab's software, built to be shown to
colleagues: what each service does, and the route a request actually travels
through the fleet.

Built with the [architecture-map](https://github.com/almendili/skills/tree/main/architecture-map)
skill, adapted from its single-repository design to span nine.

## The rule this map keeps

**Prose, groups and flows are authored. Counts, geometry and heights are
measured.**

No scanner can say what a subsystem is *for*, and nobody can keep file counts
honest by hand. So every building's size and shape falls out of
`scripts/fleet-measure.mjs` reading the real repositories, and every sentence
about what a service does was written by reading its code.

The second half of the rule matters more: **no edge is drawn that cannot be
traced to a line of code.** A plausible arrow is worse than a missing one,
because the map's whole authority is that everything on it is real. Where a
connection people expect turns out not to exist — the studios do not call the
container service, for instance — the map says so rather than drawing it.

## Layout

| Path | What it is |
|---|---|
| `src/architecture/graph.ts` | The authored half: groups, nodes, edges, flows, prose |
| `coverage.json` | Which node claims which files, per repo |
| `fleet.config.json` | The repos measured, and what counts as source |
| `scripts/fleet-measure.mjs` | The measurer; writes `measured.generated.ts` |
| `src/architecture/core`, `stores`, `components` | Vendored from the skill — do not edit except `components/theme.ts` |
| `src/theme.css` | The whole adaptation: the Lab's palette, handed over as `--am-*` tokens |

## Working on it

```bash
bun install
bun run dev
```

To refresh the measurements, have the nine repositories checked out beside this
one and run:

```bash
bun run measure
```

It reads `origin/main` in each repo rather than the working copy, so a dirty
checkout cannot move a building — and it reports any source file no node
claims. Set `FLEET_SRC_ROOT` if the repos live elsewhere, or `FLEET_REF` to
measure a different ref.

`bun run measure:check` fails when the committed numbers are stale. It is not
wired into CI, because CI has no access to the other nine repositories; run it
locally after a change lands in the fleet.

## Editing the map

Adding or re-describing a service is a change to `graph.ts` and `coverage.json`
only. Nothing else needs to move — the geometry re-derives itself.

Two things to hold to when editing:

- Say what a thing does before what it is made of. `whatItDoes` is plain
  language for a colleague who has never heard of any of this; `howItsBuilt` is
  the one decision a technical reader would otherwise wonder about.
- If you cannot point at the code that makes a call, do not add the edge.

## Publishing

Pushes to `main` build and deploy to GitHub Pages via
`.github/workflows/pages.yml`. The site is deliberately public so it can be
handed to colleagues by link; it describes architecture only, and carries no
account identifiers, hostnames of private services, or credentials.
