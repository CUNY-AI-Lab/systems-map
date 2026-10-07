import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { BEHIND_FRONT_DOOR, BLOCKS, CALLS_GATEWAY, MODEL_HOSTS, OWN_SIGN_IN, TOOL_ORDER } from './data'
import type { Block, Journey } from './types'

/**
 * The overview, drawn as one grid.
 *
 * Every tool is a column. CUNY Login, the front door and the model gateway are
 * bars that span exactly the columns of the tools that use them, so which
 * tools sit behind which shared piece is read off the alignment instead of off
 * a tangle of lines. A tool with its own sign-in takes a line from CUNY Login
 * straight past the front door.
 *
 * Placement is computed from the wiring in data.ts. A bar must cover a
 * contiguous run of columns; if a change to the wiring breaks that, `run`
 * throws, and the fix is to reorder TOOL_ORDER rather than to draw a bar with
 * a hole in it.
 */

const ROW = {
  login: 1,
  c1: 2,
  door: 3,
  c2: 4,
  tools: 5,
  c3: 6,
  gateway: 7,
  c4: 8,
  hosts: 9,
} as const

const toolCol = (index: number) => index + 2

/** The first and last column index of a set of tools, which must be contiguous. */
function run(members: ReadonlySet<string>, label: string): [number, number] {
  const indexes = TOOL_ORDER.map((id, index) => (members.has(id) ? index : -1)).filter((i) => i >= 0)
  const first = indexes[0]
  const last = indexes[indexes.length - 1]
  if (first === undefined || last === undefined) throw new Error(`${label} covers no tools.`)
  if (last - first + 1 !== indexes.length) {
    throw new Error(`${label} would cover a non-contiguous run of tools. Reorder TOOL_ORDER.`)
  }
  return [first, last]
}

const DOOR_RUN = run(BEHIND_FRONT_DOOR, 'The front door')
const GATEWAY_RUN = run(CALLS_GATEWAY, 'The model gateway')
const LOGIN_RUN = run(new Set([...BEHIND_FRONT_DOOR, ...OWN_SIGN_IN]), 'CUNY Login')
const OWN = TOOL_ORDER.filter((id) => OWN_SIGN_IN.has(id))

const cols = (first: number, last: number) => `${toolCol(first)} / ${toolCol(last) + 1}`
const at = (col: string | number, row: number | string): CSSProperties =>
  ({ '--col': String(col), '--row': String(row) }) as CSSProperties

const byId = new Map(BLOCKS.map((block) => [block.id, block]))
function block(id: string): Block {
  const found = byId.get(id)
  if (found === undefined) throw new Error(`No block is authored for ${id}.`)
  return found
}

interface Highlight {
  stepsFor: (id: string) => number[]
  also: ReadonlySet<string>
  lit: ReadonlySet<string>
  selected: string | null
  focused: string | null
  onSelect: (id: string) => void
}

function Box({
  hl,
  id,
  style,
  className,
  children,
}: {
  hl: Highlight
  id: string
  style: CSSProperties
  className?: string
  children?: ReactNode
}) {
  const b = block(id)
  const steps = hl.stepsFor(id)
  const classes = [
    'blk',
    `blk--${b.kind}`,
    b.category !== undefined ? `cat--${b.category}` : '',
    className ?? '',
    steps.length > 0 || hl.also.has(id) ? 'is-on' : '',
    hl.selected === id ? 'is-selected' : '',
    hl.focused === id ? 'is-focused' : '',
  ]
  return (
    <button
      type="button"
      className={classes.filter(Boolean).join(' ')}
      style={style}
      onClick={() => hl.onSelect(id)}
      aria-pressed={hl.selected === id}
      data-block={id}
    >
      {steps.length > 0 && (
        <span className="blk__steps" aria-label={`Step ${steps.join(' and ')}`}>
          {steps.map((n) => (
            <span key={n} className="blk__step">
              {n}
            </span>
          ))}
        </span>
      )}
      <span className="blk__name">{b.name}</span>
      {b.runBy !== undefined && <span className="blk__runby">{b.runBy}</span>}
      <span className="blk__tag">{b.tag}</span>
      {children}
    </button>
  )
}

/** A vertical connector in one grid cell, or across a span of them. */
function Line({
  hl,
  id,
  col,
  row,
  kind = 'down',
}: {
  hl: Highlight
  id: string
  col: string | number
  row: number
  kind?: 'down' | 'through'
}) {
  return (
    <span
      className={`line line--${kind}${hl.lit.has(id) ? ' is-lit' : ''}`}
      style={at(col, row)}
      data-line={id}
      aria-hidden="true"
    />
  )
}

interface PosterProps {
  journey: Journey | null
  selected: string | null
  focused: string | null
  onSelect: (id: string) => void
}

export default function Poster({ journey, selected, focused, onSelect }: PosterProps) {
  const hl: Highlight = {
    stepsFor: (id) =>
      journey === null ? [] : journey.steps.flatMap((step, index) => (step.block === id ? [index + 1] : [])),
    also: new Set(journey?.also ?? []),
    lit: new Set(journey?.lines ?? []),
    selected,
    focused,
    onSelect,
  }

  return (
    <div
      className={`poster${journey !== null ? ' has-journey' : ''}`}
      style={{ '--tools': TOOL_ORDER.length } as CSSProperties}
      role="group"
      aria-label="The Lab's tools and the shared services under them"
    >
      {/* --------------------------------------------------- 1 · sign in */}
      <div className="rail" style={at(1, `${ROW.login} / ${ROW.door + 1}`)}>
        <span className="rail__n">1</span>
        <span className="rail__text">Sign in</span>
      </div>
      <Box hl={hl} id="cuny-login" style={at(cols(...LOGIN_RUN), ROW.login)} className="bar" />
      <Box hl={hl} id="front-door" style={at(cols(...DOOR_RUN), ROW.door)} className="bar" />

      {/* ------------------------------------------------ 2 · open a tool */}
      <div className="rail" style={at(1, ROW.tools)}>
        <span className="rail__n">2</span>
        <span className="rail__text">Open a tool</span>
      </div>
      <div className="tools">
        {TOOL_ORDER.map((id, index) => (
          <Box key={id} hl={hl} id={id} style={at(toolCol(index), ROW.tools)} className="tool">
            <span className="blk__chips">
              {BEHIND_FRONT_DOOR.has(id) && <span className="chip">front door</span>}
              {OWN_SIGN_IN.has(id) && <span className="chip">CUNY Login, direct</span>}
              {CALLS_GATEWAY.has(id) && <span className="chip">model gateway</span>}
            </span>
          </Box>
        ))}
      </div>

      {/* ----------------------------------------------- 3 · use a model */}
      <div className="rail" style={at(1, ROW.gateway)}>
        <span className="rail__n">3</span>
        <span className="rail__text">Use a model</span>
      </div>
      <Box hl={hl} id="gateway" style={at(cols(...GATEWAY_RUN), ROW.gateway)} className="bar" />

      {/* ----------------------------------------------- 4 · model hosts */}
      <div className="rail" style={at(1, ROW.hosts)}>
        <span className="rail__n">4</span>
        <span className="rail__text">Model hosts</span>
      </div>
      <div className="hosts">
        {MODEL_HOSTS.map((host) => (
          <Box
            key={host.id}
            hl={hl}
            id={host.id}
            style={at(cols(GATEWAY_RUN[0] + host.from, GATEWAY_RUN[0] + host.to), ROW.hosts)}
          />
        ))}
      </div>

      {/* ------------------------------------------------------ connectors */}
      <Line hl={hl} id="login>door" col={cols(...DOOR_RUN)} row={ROW.c1} />
      {/* A tool with its own sign-in takes the line from CUNY Login straight past the front door. */}
      {OWN.map((id) => (
        <Fragment key={id}>
          <Line hl={hl} id={`login>${id}`} col={toolCol(TOOL_ORDER.indexOf(id))} row={ROW.c1} kind="through" />
          <Line hl={hl} id={`login>${id}`} col={toolCol(TOOL_ORDER.indexOf(id))} row={ROW.door} kind="through" />
        </Fragment>
      ))}
      {TOOL_ORDER.map((id, index) => (
        <Line
          key={id}
          hl={hl}
          id={BEHIND_FRONT_DOOR.has(id) ? `door>${id}` : `login>${id}`}
          col={toolCol(index)}
          row={ROW.c2}
        />
      ))}
      {TOOL_ORDER.filter((id) => CALLS_GATEWAY.has(id)).map((id) => (
        <Line key={id} hl={hl} id={`${id}>gateway`} col={toolCol(TOOL_ORDER.indexOf(id))} row={ROW.c3} />
      ))}
      {MODEL_HOSTS.map((host) => (
        <Line
          key={host.id}
          hl={hl}
          id={`gateway>${host.id}`}
          col={cols(GATEWAY_RUN[0] + host.from, GATEWAY_RUN[0] + host.to)}
          row={ROW.c4}
        />
      ))}
    </div>
  )
}
