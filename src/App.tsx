import { useCallback, useEffect, useRef, useState } from 'react'
import { BLOCKS, JOURNEYS } from './poster/data'
import Poster from './poster/Poster'
import type { Block } from './poster/types'

/**
 * The overview page: everything the Lab runs, on one screen.
 *
 * The poster carries the whole story without a click. Picking a request
 * lights its path with numbered steps; clicking a box opens a panel with the
 * plain description and the technical detail.
 */

const byId = new Map(BLOCKS.map((block) => [block.id, block]))

function kindLabel(block: Block): string {
  if (block.kind === 'tool') return 'A tool you can open'
  if (block.kind === 'backbone') return 'Shared service, run by the Lab'
  return `Run outside the Lab · ${block.runBy ?? ''}`
}

function Drawer({
  block,
  onClose,
  onJourney,
}: {
  block: Block
  onClose: () => void
  onJourney: (id: string) => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [block.id])

  const journeys = JOURNEYS.filter((journey) => journey.steps.some((step) => step.block === block.id))

  return (
    <aside className="drawer" aria-labelledby="drawer-title">
      <button type="button" className="drawer__close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <p className="drawer__kind">{kindLabel(block)}</p>
      <h2 id="drawer-title" ref={heading} tabIndex={-1}>
        {block.name}
      </h2>
      <p className="drawer__tag">{block.tag}</p>
      <p>{block.whatItDoes}</p>
      {block.href !== undefined && (
        <a className="drawer__open" href={block.href} target="_blank" rel="noopener noreferrer">
          Open {block.name} <span aria-hidden="true">→</span>
        </a>
      )}
      {block.howItsBuilt !== undefined && (
        <>
          <h3>Technical details</h3>
          <p>{block.howItsBuilt}</p>
        </>
      )}
      {block.inside !== undefined && (
        <>
          <h3>Parts</h3>
          <ul className="drawer__parts">
            {block.inside.map((part) => (
              <li key={part.name}>
                <strong>{part.name}</strong>
                {part.note}
              </li>
            ))}
          </ul>
        </>
      )}
      {journeys.length > 0 && (
        <>
          <h3>Requests through it</h3>
          <div className="drawer__journeys">
            {journeys.map((journey) => (
              <button
                key={journey.id}
                type="button"
                className="journey-btn"
                onClick={() => onJourney(journey.id)}
              >
                {journey.name}
              </button>
            ))}
          </div>
        </>
      )}
    </aside>
  )
}

export default function App() {
  const [journeyId, setJourneyId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)

  const journey = JOURNEYS.find((candidate) => candidate.id === journeyId) ?? null
  const selectedBlock = selected === null ? null : (byId.get(selected) ?? null)

  const close = useCallback(() => {
    const opener = selected
    setSelected(null)
    if (opener !== null) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(`[data-block="${opener}"]`)?.focus()
      })
    }
  }, [selected])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (selected !== null) close()
      else setJourneyId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, close])

  return (
    <>
      <a className="skip-link" href="#overview">
        Skip to the overview
      </a>

      <header className="page-head">
        <div className="shell">
          <p className="eyebrow">CUNY AI Lab</p>
          <div className="page-head__grid">
            <h1>Systems map</h1>
            <p className="page-head__lede">
              You sign in once with your CUNY account and can use any of the Lab’s tools. We run one
              gateway to language models for all of them, and keep one list of members.
            </p>
          </div>
        </div>
      </header>

      <main id="overview" className="shell">
        <section className="journeys" aria-label="Follow a request">
          <div className="journeys__row">
            <span className="journeys__label">Follow a request</span>
            {JOURNEYS.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className="journey-btn"
                aria-pressed={candidate.id === journeyId}
                onClick={() => setJourneyId(candidate.id === journeyId ? null : candidate.id)}
              >
                {candidate.name}
              </button>
            ))}
            {journey !== null && (
              <button type="button" className="journey-btn journey-btn--clear" onClick={() => setJourneyId(null)}>
                Show everything
              </button>
            )}
          </div>
          {journey !== null ? (
            <ol className="steps" aria-live="polite">
              {journey.steps.map((step, index) => (
                <li
                  key={index}
                  onMouseEnter={() => setFocused(step.block)}
                  onMouseLeave={() => setFocused(null)}
                >
                  {step.text}
                </li>
              ))}
            </ol>
          ) : (
            <p className="hint">
              Click any box for a plain description and the technical details, or pick a request
              above to follow its path.
            </p>
          )}
        </section>

        <div className="sheet">
          <div className="legend" aria-label="Key">
            <span>
              <i className="k-backbone" /> Shared services the Lab runs
            </span>
            <span>
              <i className="k-tool" /> Tools you open
            </span>
            <span>
              <i className="k-outside" /> Run by someone else
            </span>
            <span>
              <i className="k-check" /> Access check
            </span>
          </div>
          <Poster
            journey={journey}
            selected={selected}
            focused={focused}
            onSelect={(id) => setSelected(id === selected ? null : id)}
          />
        </div>

        <section className="below">
          <div>
            <h2>Privacy</h2>
            <p>
              Inside the tools you appear under a pseudonym, a stand-in for your CUNY account that
              can’t be traced back to it. We set every model request to zero data retention and
              forbid providers to train on it. We offer only open-weight models, which we can move
              to another host.
            </p>
          </div>
          <div>
            <h2>Access</h2>
            <p>
              Apply for yourself or for a class on the{' '}
              <a href="https://ailab.gc.cuny.edu/request-access/">Lab’s website</a>. If you teach,
              you get a class link to hand to students once your class is approved.
            </p>
          </div>
        </section>
      </main>

      {selectedBlock !== null && (
        <Drawer
          block={selectedBlock}
          onClose={close}
          onJourney={(id) => {
            setJourneyId(id)
            setSelected(null)
          }}
        />
      )}

      <footer className="page-foot">
        <div className="shell">
          <p>
            We drew the connections from the Lab’s source code, simplifying in places, and wrote
            the descriptions by hand.
          </p>
          <p>
            Questions about the Lab: <a href="mailto:ailab@gc.cuny.edu">ailab@gc.cuny.edu</a>
          </p>
        </div>
      </footer>
    </>
  )
}
