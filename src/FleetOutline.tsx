import type { ArchitectureData } from './architecture/components/ArchitectureMap'

/**
 * The map, for screens that cannot hold it.
 *
 * The isometric view is a pan-and-zoom canvas flanked by a rail and a reading
 * panel; below about 1024px the canvas is squeezed to nothing and the page
 * scrolls sideways. Rather than shrink a spatial view until it is unusable,
 * narrow screens get the same authored content in the shape a phone is good
 * at: the journeys as numbered steps, and the services as a readable list.
 *
 * It reads the identical `graph.ts` data, so there is no second description of
 * the fleet to keep in sync — only a second way of laying it out.
 */

const MONO = '"IBM Plex Mono", ui-monospace, monospace'

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: '0.68rem',
        letterSpacing: '0.08em',
        border: '1px solid var(--rule)',
        padding: '0.15rem 0.4rem',
        color: '#565247',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

/** `[[term]]` marks the word the reading panel highlights; honour it here too. */
function prose(text: string) {
  return text.split(/\[\[(.+?)\]\]/g).map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} style={{ color: 'var(--navy)', fontWeight: 600 }}>
        {part}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}

export default function FleetOutline({ data }: { data: ArchitectureData }) {
  const nodeById = new Map(data.nodes.map((node) => [node.id, node]))
  const edgeById = new Map(data.edges.map((edge) => [edge.id, edge]))

  return (
    <div style={{ width: 'min(880px, calc(100% - 2.5rem))', margin: '0 auto', padding: '2.5rem 0 4rem' }}>
      <h2
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '1.5rem',
          letterSpacing: '-0.02em',
          margin: '0 0 0.4rem',
        }}
      >
        Journeys
      </h2>
      <p style={{ margin: '0 0 1.8rem', color: '#565247' }}>
        The routes a real request travels. Every step below is a call that exists in the code.
      </p>

      {data.flows.map((flow) => (
        <section key={flow.id} style={{ marginBottom: '2.2rem' }}>
          <h3
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '1.15rem',
              margin: '0 0 0.2rem',
              color: 'var(--navy)',
            }}
          >
            {flow.name}
          </h3>
          <p style={{ margin: '0 0 0.9rem', fontSize: '0.95rem' }}>{flow.summary}</p>
          <ol
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              borderLeft: '2px solid var(--rule)',
            }}
          >
            {flow.route.map((edgeId, index) => {
              const edge = edgeById.get(edgeId)
              if (edge === undefined) return null
              const to = nodeById.get(edge.to)
              return (
                <li key={edgeId} style={{ padding: '0.5rem 0 0.5rem 1rem', position: 'relative' }}>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: '0.7rem',
                      color: '#7d776a',
                      marginRight: '0.5rem',
                    }}
                  >
                    {index + 1}
                  </span>
                  <strong style={{ fontWeight: 600 }}>{to?.name ?? edge.to}</strong>
                  <span style={{ color: '#565247' }}> — {edge.label}</span>
                </li>
              )
            })}
          </ol>
        </section>
      ))}

      <h2
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '1.5rem',
          letterSpacing: '-0.02em',
          margin: '3rem 0 1.5rem',
          borderTop: '4px solid var(--navy)',
          paddingTop: '1.5rem',
        }}
      >
        The services
      </h2>

      {data.groups.map((group) => {
        const members = data.nodes.filter((node) => node.group === group.id)
        if (members.length === 0) return null
        return (
          <section key={group.id} style={{ marginBottom: '2.5rem' }}>
            <h3
              style={{
                fontFamily: MONO,
                fontSize: '0.72rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--action)',
                margin: '0 0 1rem',
              }}
            >
              {group.label}
            </h3>
            {members.map((node) => (
              <article
                key={node.id}
                style={{
                  borderTop: '1px solid var(--rule)',
                  padding: '1.1rem 0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    gap: '0.6rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <h4
                    style={{
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: '1.1rem',
                      margin: 0,
                    }}
                  >
                    {node.name}
                  </h4>
                  <span style={{ color: '#7d776a', fontSize: '0.9rem' }}>{node.role}</span>
                  {node.count !== undefined && node.count > 0 && (
                    <Chip>
                      {node.count} files · ~{(node.loc ?? 0).toLocaleString('en-US')} lines
                    </Chip>
                  )}
                </div>
                <p style={{ margin: '0 0 0.6rem' }}>{prose(node.whatItDoes)}</p>
                <p style={{ margin: 0, color: '#565247', fontSize: '0.95rem' }}>
                  {prose(node.howItsBuilt)}
                </p>
                {node.stack && node.stack.length > 0 && (
                  <p
                    style={{
                      margin: '0.7rem 0 0',
                      fontFamily: MONO,
                      fontSize: '0.75rem',
                      color: '#7d776a',
                    }}
                  >
                    {node.stack.join(' · ')}
                  </p>
                )}
              </article>
            ))}
          </section>
        )
      })}
    </div>
  )
}
