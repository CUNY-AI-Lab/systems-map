import type { Block, Journey } from './types'

/**
 * What the overview shows, written by hand.
 *
 * The wiring sets below decide every bar and line on the poster, so a change
 * here is a claim about the code. The drawing simplifies in two places: PDF
 * Accessibility is drawn on the gateway, where it is moving, and the
 * Sandbox's older direct provider settings are left out.
 */

/**
 * Left to right on the poster, from the tools anyone can open to the ones
 * behind the front door. The order keeps each bar's run contiguous and puts
 * both bars beside the access desk.
 */
export const TOOL_ORDER: readonly string[] = [
  'ai-disclosure',
  'pdf-accessibility',
  'sandbox',
  'agent-studio',
  'site-studio',
  'media-tools',
  'model-api',
]

/** Tools reached through the front door at tools.ailab.gc.cuny.edu. */
export const BEHIND_FRONT_DOOR: ReadonlySet<string> = new Set([
  'agent-studio',
  'site-studio',
  'media-tools',
  'model-api',
])

/** Tools with their own CUNY Login sign-in. */
export const OWN_SIGN_IN: ReadonlySet<string> = new Set(['sandbox'])

/** Tools whose model requests go through the Lab's gateway. */
export const CALLS_GATEWAY: ReadonlySet<string> = new Set([
  'pdf-accessibility',
  'sandbox',
  'agent-studio',
  'site-studio',
  'media-tools',
  'model-api',
])

export interface HostSpan {
  id: string
  /** Columns within the gateway's run, counted from its first tool. */
  from: number
  to: number
}

/** Model hosts under the gateway. */
export const MODEL_HOSTS: HostSpan[] = [
  { id: 'workers-ai', from: 0, to: 2 },
  { id: 'bedrock', from: 3, to: 5 },
]

/** Services a tool reaches on its own, drawn straight down from it. */
export const DIRECT_HOSTS: { id: string; tool: string }[] = []

export const BLOCKS: Block[] = [
  /* ------------------------------------------------------------ way in */
  {
    id: 'cuny-login',
    kind: 'outside',
    name: 'CUNY Login',
    runBy: 'run by CUNY',
    tag: 'The university’s sign-in. Only CUNY sees your password.',
    whatItDoes:
      'CUNY runs this single sign-on for the whole university. You type your password on CUNY’s ' +
      'own page, and CUNY confirms to us who you are. We never see or store your password.',
    howItsBuilt:
      'We connect to it over OpenID Connect in two places: the front door and the Sandbox.',
  },
  {
    id: 'front-door',
    kind: 'backbone',
    name: 'Front door',
    tag: 'One sign-in for the tools at tools.ailab.gc.cuny.edu',
    whatItDoes:
      'You sign in here once with CUNY Login and can then open any of the signed-in tools at ' +
      'tools.ailab.gc.cuny.edu. Each time you open one, we check your access first.',
    howItsBuilt:
      'You can reach those tools only through the front door, over private connections inside ' +
      'Cloudflare. Inside the tools you appear under a pseudonym: a stable stand-in for your CUNY ' +
      'account that can’t be turned back into it. We list every path we allow and refuse the rest.',
    inside: [
      {
        name: 'Sign-in exchange',
        note: 'We trade your CUNY sign-in for a pseudonym here.',
      },
      {
        name: 'Identity rules',
        note:
          'A small code library shared by every Lab service, so we derive pseudonyms and check tokens ' +
          'the same way everywhere.',
      },
      {
        name: 'Classes',
        note:
          'Instructors with an approved class make a link to hand to students, and watch the roster ' +
          'fill as students join.',
      },
    ],
  },

  /* ------------------------------------------------------------- tools */
  {
    id: 'ai-disclosure',
    kind: 'tool',
    category: 'writing',
    name: 'AI Use Disclosure',
    tag: 'Write a statement of how you used AI in your work',
    address: '/ai-disclosure',
    href: 'https://tools.ailab.gc.cuny.edu/ai-disclosure/',
    whatItDoes:
      'Pick the tasks you handed to generative AI and get a publication-ready declaration, using ' +
      'the GAIDeT taxonomy.',
    howItsBuilt:
      'You build the declaration in your browser, with no account needed. We host the page on the ' +
      'New Media Lab’s server at the Graduate Center.',
  },
  {
    id: 'pdf-accessibility',
    kind: 'tool',
    category: 'media',
    name: 'PDF Accessibility',
    tag: 'Check and fix PDFs for screen readers',
    address: '/pdf-accessibility',
    href: 'https://tools.ailab.gc.cuny.edu/pdf-accessibility/',
    whatItDoes:
      'Upload a PDF and get back a tagged version that screen readers and other assistive ' +
      'technology can read, along with a list of anything left to fix by hand.',
    howItsBuilt:
      'We use a language model to draft alt text and to read the hardest parts of a page, and our ' +
      'own code to write the tags. We check every file with veraPDF, the standard validator, before ' +
      'calling it finished. The app runs on the New Media Lab’s server at the Graduate Center, and ' +
      'you can use it without signing in.',
  },
  {
    id: 'sandbox',
    kind: 'tool',
    category: 'chat',
    name: 'CAIL Sandbox',
    tag: 'Chat with open-weight models and keep your conversations',
    address: 'chat.ailab',
    href: 'https://chat.ailab.gc.cuny.edu/',
    whatItDoes:
      'Most people who use the Lab use the Sandbox. You sign in with CUNY Login, pick a model and ' +
      'chat with it, and your conversations and documents stay in your account. Instructors also ' +
      'build course-specific models here from a system prompt and their course materials.',
    howItsBuilt:
      'The Sandbox is Open WebUI, an open-source chat app, with a small set of our own patches. We ' +
      'host it on AWS, sign you in to it directly with CUNY Login, and route its model requests ' +
      'through the gateway. The first time you sign in, we check your access with the access desk ' +
      'and set your role.',
  },
  {
    id: 'agent-studio',
    kind: 'tool',
    category: 'studio',
    name: 'Agent Studio',
    tag: 'Hand a research task to an agent that writes and runs code',
    address: '/agent-studio',
    href: 'https://tools.ailab.gc.cuny.edu/agent-studio/',
    whatItDoes:
      'You describe a research task in chat, and an AI agent writes and runs code to carry it out. ' +
      'You can have it search library catalogs and scholarly databases like OpenAlex, Crossref and ' +
      'PubMed, and build tables and charts from what it finds. You keep the results as panels on a ' +
      'canvas and arrange them however you like.',
    howItsBuilt:
      'We run the code the agent writes in a disposable worker and throw it away afterward. The ' +
      'studio reaches the gateway over a private connection.',
  },
  {
    id: 'site-studio',
    kind: 'tool',
    category: 'studio',
    name: 'Site Studio',
    tag: 'Build and publish an academic website by conversation',
    address: '/site-studio',
    href: 'https://tools.ailab.gc.cuny.edu/site-studio/',
    whatItDoes:
      'You describe a change in chat and see the edit as a diff to the site’s HTML and CSS. Nothing ' +
      'is saved until you accept it. When you’re ready, you publish the site to a public address. ' +
      'Templates include a CV, a course page and a portfolio.',
    howItsBuilt:
      'We connect Site Studio to the gateway at its public address. Before you can save a ' +
      'generated image, we have a vision model check it.',
  },
  {
    id: 'media-tools',
    kind: 'tool',
    category: 'media',
    name: 'Media Tools',
    tag: 'Transcribe recordings, describe images, read scanned text',
    address: '/media',
    href: 'https://tools.ailab.gc.cuny.edu/media/',
    whatItDoes:
      'Transcribe audio and video up to 1 GB, with optional speaker labels, and export the ' +
      'transcript as text, SRT, VTT or JSON. Write alt text and longer descriptions for images, or ' +
      'pull searchable text from scanned documents and archival images. Your use counts against ' +
      'your monthly allowance.',
    howItsBuilt:
      'We use Whisper for transcription and Qwen 3 VL for images, both through the gateway. For ' +
      'speaker labels, we run a separate container on Cloudflare.',
  },
  {
    id: 'model-api',
    kind: 'tool',
    category: 'api',
    name: 'Model API',
    tag: 'A personal key for calling models from your own code',
    address: '/model-access',
    href: 'https://tools.ailab.gc.cuny.edu/model-access',
    whatItDoes:
      'On this dashboard you create, rotate and revoke your own key for the model gateway, and see ' +
      'an estimate of your spending. You can then point any OpenAI-compatible script or app at the ' +
      'gateway with that key.',
    howItsBuilt:
      'We keep only a hash of your key, so you see it once, when you create it. Scripts have no ' +
      'browser to sign in with, so you call the gateway directly with the key, and we check your ' +
      'access on every request.',
  },

  /* ---------------------------------------------------------- backbone */
  {
    id: 'gateway',
    kind: 'backbone',
    name: 'Model gateway',
    tag: 'One API for every model we offer',
    whatItDoes:
      'We send every model request from our tools to this one address, and you can send your own ' +
      'here with a personal key. For each request, we confirm who is asking and that they have ' +
      'access and budget left, then pass the request to the company hosting the model.',
    howItsBuilt:
      'The gateway uses the OpenAI-compatible API, so you can use it with most existing software as ' +
      'is. We keep our provider keys and spending records in Cloudflare’s AI Gateway, and can ' +
      'switch providers there without changing any tool.',
    inside: [
      {
        name: 'Credential check',
        note:
          'We work out who is asking: a person with a key, a person signed in through the front door, ' +
          'or the Sandbox on someone’s behalf. Forged identity headers are rejected first.',
      },
      {
        name: 'Key vault',
        note: 'A hash of each key, with its spending limit.',
      },
      {
        name: 'Provider dispatch',
        note:
          'We hand each request to the company hosting the model and translate between their formats.',
      },
    ],
  },
  {
    id: 'access-desk',
    kind: 'backbone',
    name: 'Access desk',
    tag: 'One list of members and their budgets',
    whatItDoes:
      'Our list of current members and their budgets. We check it whenever you open a tool, use a ' +
      'model or manage your key. When you apply on the Lab’s website, our staff review your ' +
      'application here and approve it with a role, a budget and an expiry date. You get the ' +
      'decision by email.',
    howItsBuilt:
      'We keep it on private connections, reachable only from our own services. ' +
      'Applications, decisions, memberships and class rosters sit in one database, with a log of ' +
      'who changed what.',
    inside: [
      {
        name: 'Review console',
        note:
          'Our staff approve or decline applications here and manage classes and keys. Staff can also ' +
          'work from an AI assistant through a connector, and we confirm their role each time they ' +
          'use it.',
      },
      {
        name: 'The ledger',
        note: 'One database for applications, decisions, memberships, class rosters and the audit log.',
      },
      {
        name: 'Decision email',
        note:
          'We queue decision emails and send them afterward, so if mail is down you get the email ' +
          'late and the decision still stands.',
      },
    ],
  },

  /* ----------------------------------------------------------- outside */
  {
    id: 'workers-ai',
    kind: 'outside',
    name: 'Workers AI',
    runBy: 'Cloudflare',
    tag: 'Open-weight models and Whisper, hosted by Cloudflare',
    whatItDoes:
      'Cloudflare hosts just over half of our models on its Workers AI service, including Whisper ' +
      'for transcription and the DeepSeek model Site Studio uses.',
    howItsBuilt:
      'Every model we offer is open-weight, so we can move any of them to another host if we need ' +
      'to.',
  },
  {
    id: 'bedrock',
    kind: 'outside',
    name: 'Amazon Bedrock',
    runBy: 'AWS',
    tag: 'More open-weight models, hosted by Amazon',
    whatItDoes:
      'Amazon hosts the rest of our models on Bedrock, including Mistral, Gemma and the Qwen vision ' +
      'model Media Tools uses for images.',
    howItsBuilt:
      'We reach Bedrock through Cloudflare’s AI Gateway, the same way we reach Workers AI, and track ' +
      'spending for both in one place.',
  },
  {
    id: 'email',
    kind: 'outside',
    name: 'Amazon SES',
    runBy: 'AWS',
    tag: 'Delivery for our decision emails',
    whatItDoes:
      'We send our emails about applications and classes through Amazon’s email service, from ' +
      'ailab@gc.cuny.edu.',
  },
]

export const JOURNEYS: Journey[] = [
  {
    id: 'ask',
    name: 'Ask the Sandbox a question',
    steps: [
      { block: 'cuny-login', text: 'You sign in to the Sandbox with your CUNY account.' },
      { block: 'sandbox', text: 'You pick a model and type a question.' },
      { block: 'gateway', text: 'We send your question to the gateway.' },
      { block: 'access-desk', text: 'We check that your access is current and you have budget left.' },
      { block: 'workers-ai', text: 'You get the answer from the model you picked, hosted by Cloudflare or Amazon.' },
    ],
    also: ['bedrock'],
    lines: ['login>sandbox', 'sandbox>gateway', 'gateway~desk', 'gateway>workers-ai', 'gateway>bedrock'],
  },
  {
    id: 'transcribe',
    name: 'Transcribe a recording',
    steps: [
      { block: 'cuny-login', text: 'You sign in once with your CUNY account.' },
      { block: 'front-door', text: 'You open Media Tools through the front door.' },
      { block: 'access-desk', text: 'We confirm you’re a current member.' },
      { block: 'media-tools', text: 'You upload the recording and choose whether to label speakers.' },
      { block: 'gateway', text: 'We send the audio to Whisper through the gateway and count it against your allowance.' },
      { block: 'workers-ai', text: 'You get back a transcript with timings, ready to export.' },
    ],
    lines: ['login>door', 'door~desk', 'door>media-tools', 'media-tools>gateway', 'gateway>workers-ai'],
  },
  {
    id: 'build',
    name: 'Build a website',
    steps: [
      { block: 'cuny-login', text: 'You sign in once with your CUNY account.' },
      { block: 'front-door', text: 'You open Site Studio through the front door, under your pseudonym.' },
      { block: 'site-studio', text: 'You describe the change you want.' },
      { block: 'gateway', text: 'We ask a model for the edit, through the gateway.' },
      { block: 'workers-ai', text: 'You get the edit back from a DeepSeek model on Workers AI.' },
      { block: 'site-studio', text: 'You accept the diff, and publish when you’re ready.' },
    ],
    lines: ['login>door', 'door~desk', 'door>site-studio', 'site-studio>gateway', 'gateway>workers-ai'],
  },
  {
    id: 'own-code',
    name: 'Call a model from your own code',
    steps: [
      { block: 'cuny-login', text: 'You sign in once with your CUNY account.' },
      { block: 'front-door', text: 'You open the Model API dashboard through the front door.' },
      { block: 'model-api', text: 'You create a key and copy it. We keep only a hash, so you won’t see the key again.' },
      { block: 'gateway', text: 'You call the gateway from your script, using the key.' },
      { block: 'access-desk', text: 'On every call, we check that your access is still current.' },
      { block: 'workers-ai', text: 'You get the answer from the model you named, and we record the cost.' },
    ],
    also: ['bedrock'],
    lines: [
      'login>door',
      'door~desk',
      'door>model-api',
      'model-api>gateway',
      'gateway~desk',
      'gateway>workers-ai',
      'gateway>bedrock',
    ],
  },
  {
    id: 'apply',
    name: 'Apply for access',
    steps: [
      { block: 'front-door', text: 'You apply with the form on the Lab’s website, and we receive it through the front door.' },
      { block: 'access-desk', text: 'We add your application to the review queue.' },
      { block: 'access-desk', text: 'Our staff approve it with a role, a budget and an expiry date.' },
      { block: 'email', text: 'You get the decision by email.' },
    ],
    lines: ['door~desk', 'desk>email'],
  },
]
