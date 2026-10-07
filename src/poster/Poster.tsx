import { Fragment, type CSSProperties, type ReactNode } from 'react'
import {
  BEHIND_FRONT_DOOR,
  BLOCKS,
  CALLS_GATEWAY,
  DIRECT_HOSTS,
  MODEL_HOSTS,
  OWN_SIGN_IN,
  TOOL_ORDER,
  type HostSpan,
} from './data'
import type { Block, Journey } from './types'

/**
 * The overview, drawn as one grid.
 *
 * Every tool is a column. The front door and the model gateway are bars that
 * span exactly the columns of the tools that use them, so which tools sit
 * behind which shared piece is read off the alignment instead of off a tangle
 * of lines. The access desk stands at the right, beside both bars, because
 * both of them ask it the same question.
 *
 * Placement is computed from the wiring in data.ts. A bar must cover a
 * contiguous run of columns; if a change to the wiring breaks that, `run`
 * throws, and the fix is to reorder TOOL_ORDER rather than to draw a bar with
 * a hole in it.
 */

const ROW = {
  you: 1,
  login: 2,
  c1: 3,
  door: 4,
  c2: 5,
  tools: 6,
  c3: 7,
  gateway: 8,
  c4: 9,
  hosts: 10,
} as const

const N = TOOL_ORDER.length
const toolCol = (index: number) => index + 2
const DESK_COL = N + 2

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
const NO_SIGN_IN = new Set(TOOL_ORDER.filter((id) => !BEHIND_FRONT_DOOR.has(id) && !OWN_SIGN_IN.has(id)))
const OPEN_RUN = NO_SIGN_IN.size > 0 ? run(NO_SIGN_IN, 'The open tools') : null

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
      {b.address !== undefined && <span className="blk__address">{b.address}</span>}
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

/** A dotted run along a row to the access desk. */
function Leader({ hl, id, col, row, label }: { hl: Highlight; id: string; col: string; row: number; label?: string }) {
  return (
    <span className={`leader${hl.lit.has(id) ? ' is-lit' : ''}`} style={at(col, row)} data-line={id} aria-hidden="true">
      {label !== undefined && <span className="leader__label">{label}</span>}
    </span>
  )
}

interface PosterProps {
  journey: Journey | null
  selected: string | null
  focused: string | null
  onSelect: (id: string) => void
}

export default function Poster({ journey, selected, focused, onSelect }: PosterProps) {
  const lit = new Set(journey?.lines ?? [])
  const hl: Highlight = {
    stepsFor: (id) =>
      journey === null ? [] : journey.steps.flatMap((step, index) => (step.block === id ? [index + 1] : [])),
    also: new Set(journey?.also ?? []),
    lit,
    selected,
    focused,
    onSelect,
  }

  const doorReachesDesk = DOOR_RUN[1] === N - 1
  const gatewayReachesDesk = GATEWAY_RUN[1] === N - 1
  const ownSignIn = TOOL_ORDER.filter((id) => OWN_SIGN_IN.has(id))

  return (
    <div
      className={`poster${journey !== null ? ' has-journey' : ''}`}
      style={{ '--tools': N } as CSSProperties}
      role="group"
      aria-label="The Lab's tools and the shared services under them"
    >
      {/* ------------------------------------------------------------ you */}
      <p className="you" style={at(`2 / ${DESK_COL + 1}`, ROW.you)}>
        <span className="you__mark" aria-hidden="true" />
        Anyone at CUNY with approved access: students, instructors, researchers and staff.
      </p>

      {/* --------------------------------------------------- 1 · sign in */}
      <div className="rail" style={at(1, `${ROW.login} / ${ROW.door + 1}`)}>
        <span className="rail__n">1</span>
        <span className="rail__text">Sign in</span>
      </div>
      <Box hl={hl} id="cuny-login" style={at(cols(...LOGIN_RUN), ROW.login)} className="bar" />
      <Box
        hl={hl}
        id="front-door"
        style={at(cols(...DOOR_RUN), ROW.door)}
        className={`bar${doorReachesDesk ? ' reaches-desk' : ''}${lit.has('door~desk') ? ' desk-lit' : ''}`}
      />
      {OPEN_RUN !== null && (
        <span className="open-note" style={at(cols(...OPEN_RUN), `${ROW.login} / ${ROW.door + 1}`)}>
          Open to anyone, no sign-in
        </span>
      )}

      {/* ----------------------------------------------- 2 · pick a tool */}
      <div className="rail" style={at(1, ROW.tools)}>
        <span className="rail__n">2</span>
        <span className="rail__text">Open a tool</span>
      </div>
      <div className="tools">
        {TOOL_ORDER.map((id, index) => (
          <Box hl={hl} key={id} id={id} style={at(toolCol(index), ROW.tools)} className="tool">
            <span className="blk__chips">
              {BEHIND_FRONT_DOOR.has(id) && <span className="chip">front door</span>}
              {OWN_SIGN_IN.has(id) && <span className="chip">CUNY Login, direct</span>}
              {NO_SIGN_IN.has(id) && <span className="chip">no sign-in</span>}
              {CALLS_GATEWAY.has(id) && <span className="chip">model gateway</span>}
              {DIRECT_HOSTS.filter((host) => host.tool === id).map((host) => (
                <span key={host.id} className="chip">
                  {block(host.id).name}
                </span>
              ))}
            </span>
          </Box>
        ))}
      </div>

      {/* --------------------------------------------- 3 · reach a model */}
      <div className="rail" style={at(1, ROW.gateway)}>
        <span className="rail__n">3</span>
        <span className="rail__text">Use a model</span>
      </div>
      <Box
        hl={hl}
        id="gateway"
        style={at(cols(...GATEWAY_RUN), ROW.gateway)}
        className={`bar${gatewayReachesDesk ? ' reaches-desk' : ''}${lit.has('gateway~desk') ? ' desk-lit' : ''}`}
      />
      {!gatewayReachesDesk && (
        <Leader
          hl={hl}
          id="gateway~desk"
          col={`${toolCol(GATEWAY_RUN[1] + 1)} / ${DESK_COL}`}
          row={ROW.gateway}
          label="access checked on every model request"
        />
      )}
      {!doorReachesDesk && (
        <Leader
          hl={hl}
          id="door~desk"
          col={`${toolCol(DOOR_RUN[1] + 1)} / ${DESK_COL}`}
          row={ROW.door}
          label="access checked whenever you open a tool"
        />
      )}

      {/* ------------------------------------------------ the access desk */}
      <Box hl={hl} id="access-desk" style={at(DESK_COL, `${ROW.door} / ${ROW.gateway + 1}`)} className="desk">
        <span className="desk__asks">
          <span>Checked whenever you open a tool</span>
          <span className="desk__low">Checked on every model request</span>
        </span>
      </Box>

      {/* ---------------------------------------------- 4 · run the model */}
      <div className="rail" style={at(1, ROW.hosts)}>
        <span className="rail__n">4</span>
        <span className="rail__text">Model hosts</span>
      </div>
      <div className="hosts">
        {MODEL_HOSTS.map((host: HostSpan) => (
          <Box
            hl={hl}
            key={host.id}
            id={host.id}
            style={at(cols(GATEWAY_RUN[0] + host.from, GATEWAY_RUN[0] + host.to), ROW.hosts)}
          />
        ))}
        {DIRECT_HOSTS.map((host) => (
          <Box hl={hl} key={host.id} id={host.id} style={at(toolCol(TOOL_ORDER.indexOf(host.tool)), ROW.hosts)} />
        ))}
      </div>
      <Box hl={hl} id="email" style={at(DESK_COL, ROW.hosts)} />

      {/* ------------------------------------------------------ connectors */}
      <Line hl={hl} id="login>door" col={cols(...DOOR_RUN)} row={ROW.c1} />
      {/* A tool with its own sign-in takes the line from CUNY Login straight past the front door. */}
      {ownSignIn.map((id) => (
        <Fragment key={id}>
          <Line hl={hl} id={`login>${id}`} col={toolCol(TOOL_ORDER.indexOf(id))} row={ROW.c1} kind="through" />
          <Line hl={hl} id={`login>${id}`} col={toolCol(TOOL_ORDER.indexOf(id))} row={ROW.door} kind="through" />
        </Fragment>
      ))}
      {TOOL_ORDER.map((id, index) => (
        <Line
          hl={hl}
          key={id}
          id={BEHIND_FRONT_DOOR.has(id) ? `door>${id}` : OWN_SIGN_IN.has(id) ? `login>${id}` : `open>${id}`}
          col={toolCol(index)}
          row={ROW.c2}
        />
      ))}
      {TOOL_ORDER.filter((id) => CALLS_GATEWAY.has(id)).map((id) => (
        <Line hl={hl} key={id} id={`${id}>gateway`} col={toolCol(TOOL_ORDER.indexOf(id))} row={ROW.c3} />
      ))}
      {DIRECT_HOSTS.map((host) => {
        const col = toolCol(TOOL_ORDER.indexOf(host.tool))
        return (
          <Fragment key={host.id}>
            <Line hl={hl} id={`${host.tool}>${host.id}`} col={col} row={ROW.c3} />
            <Line hl={hl} id={`${host.tool}>${host.id}`} col={col} row={ROW.gateway} kind="through" />
            <Line hl={hl} id={`${host.tool}>${host.id}`} col={col} row={ROW.c4} />
          </Fragment>
        )
      })}
      {MODEL_HOSTS.map((host) => (
        <Line
          hl={hl}
          key={host.id}
          id={`gateway>${host.id}`}
          col={cols(GATEWAY_RUN[0] + host.from, GATEWAY_RUN[0] + host.to)}
          row={ROW.c4}
        />
      ))}
      <Line hl={hl} id="desk>email" col={DESK_COL} row={ROW.c4} />
    </div>
  )
}
