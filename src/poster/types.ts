/**
 * The overview's vocabulary.
 *
 * A block is anything drawn as a box on the poster. Where it sits comes from
 * its kind and from the wiring in data.ts, never from coordinates typed by
 * hand, so moving a tool between the front door and its own sign-in is a
 * one-line change.
 */

export type Kind = 'outside' | 'backbone' | 'tool'

export type Category = 'chat' | 'studio' | 'media' | 'api'

export interface Part {
  name: string
  note: string
}

export interface Block {
  id: string
  kind: Kind
  name: string
  /** One short line, readable on the poster without opening anything. */
  tag: string
  /** Plain language, for a colleague who has never heard of any of this. */
  whatItDoes: string
  /** The one decision a technical reader would otherwise wonder about. */
  howItsBuilt?: string
  /** For backbone blocks: the smaller parts the detailed map draws separately. */
  inside?: Part[]
  /** The live address, for tools people can open. */
  href?: string
  /** For outside blocks: who runs it. */
  runBy?: string
  category?: Category
}

export interface Step {
  block: string
  text: string
}

export interface Journey {
  id: string
  name: string
  steps: Step[]
  /** Blocks to light without a step number, e.g. a second possible host. */
  also?: string[]
  /** Connector ids to light, from the ids the poster gives its lines. */
  lines: string[]
}
