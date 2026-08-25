import type { ArchitectureData } from './components/ArchitectureMap'
import { deriveArchetype, deriveHeight, deriveSize, packLayout, type Measure } from './core/layout'
import type { ArchEdge, ArchFlow, ArchNode, Group } from './core/types'
import { MEASURED, UNCLAIMED } from './measured.generated'

/**
 * What the fleet is, written by hand.
 *
 * Prose, groups and flows are authored; counts, geometry and heights are
 * measured. Nothing below sets a building's height: that comes from
 * scripts/fleet-measure.mjs reading the repositories. Add no edge that cannot
 * be traced to a call in the code, including when the missing connection is
 * one people expect to find.
 */

export const GROUPS: Group[] = [
  { id: 'front-door', label: 'The front door' },
  { id: 'access-desk', label: 'The access desk' },
  { id: 'model-plane', label: 'The model plane' },
  { id: 'workshops', label: 'Where people work' },
  { id: 'outside', label: 'Outside the Lab' },
]

type Authored = Omit<ArchNode, 'archetype' | 'params' | 'footprint' | 'height' | 'count' | 'loc'>

const AUTHORED: Authored[] = [
  /* ---------------------------------------------------------- front door */
  {
    id: 'doorway-front',
    code: 'DW',
    name: 'Doorway',
    role: 'the front door',
    group: 'front-door',
    whatItDoes:
      'Everything at tools.ailab.gc.cuny.edu arrives here first. Doorway is the only part of the ' +
      'Lab that talks to [[CUNY Login]]. Once you have signed in, it passes you through to ' +
      'whichever tool you asked for, so you never sign in to the tools themselves.',
    howItsBuilt:
      'Tools are reached over private Worker-to-Worker bindings, so none of them can be called ' +
      'directly from the internet. The route table lists the paths that are allowed; its default ' +
      'decision is deny.',
    files: ['src/doorway.ts', 'src/worker.ts', 'config/route-policy.json'],
    stack: ['Cloudflare Workers', 'service bindings', 'signed session cookie'],
  },
  {
    id: 'doorway-signin',
    code: 'SI',
    name: 'Sign-in exchange',
    role: 'the CUNY sign-in step',
    group: 'front-door',
    whatItDoes:
      'Runs the conversation with CUNY Login and turns the answer into a stable pseudonym. That ' +
      'pseudonym stands in for your CUNY account everywhere else in the Lab.',
    howItsBuilt:
      'The pseudonym is a [[salted derivation]] of the CUNY subject. It cannot be reversed to ' +
      'recover the account behind it, and it stays the same for you week to week.',
    files: ['src/oidc.ts', 'src/identity.ts'],
    stack: ['OpenID Connect', 'Web Crypto', 'jose'],
  },
  {
    id: 'doorway-agent',
    code: 'AG',
    name: 'Agent access',
    role: 'the gate for automated callers',
    group: 'front-door',
    whatItDoes:
      'Lets an approved staff member point an AI assistant at the Lab\'s admissions tools, so ' +
      'reviewing applications can happen from a coding agent as well as in a browser.',
    howItsBuilt:
      'It is a full [[OAuth]] server with consent stored in a durable object. Every token ' +
      'exchange re-checks the operator\'s membership before it issues anything.',
    files: ['src/worker.ts', 'src/admission-mcp.ts', 'src/admission-oauth.ts', 'src/admission-agent.ts'],
    stack: ['OAuth 2.1', 'Model Context Protocol', 'Durable Objects'],
  },
  {
    id: 'doorway-classes',
    code: 'CL',
    name: 'Classes',
    role: 'class links and rosters',
    group: 'front-door',
    whatItDoes:
      'Where an instructor whose class was approved creates the link they hand to students. The ' +
      'roster fills as students join, and the instructor can close or replace the link at the end ' +
      'of term.',
    howItsBuilt:
      'A class link is a reusable secret. Issuing one invitation per student would mean ' +
      'collecting student email addresses.',
    files: ['src/my-classes.ts', 'src/owner-ui.ts'],
    stack: ['Cloudflare Workers', 'QR generation'],
  },
  {
    id: 'identity-library',
    code: 'ID',
    name: 'Identity rules',
    role: 'shared identity rules',
    group: 'front-door',
    whatItDoes:
      'The small shared library that keeps every service agreeing on who a person is. It has one ' +
      'way to turn a CUNY login into a Lab pseudonym, and one way to check a token.',
    howItsBuilt:
      'It exists so no service invents its own version of either. The derivation and the token ' +
      'shape are published as JSON files that fix the format, and a change to either shows up as ' +
      'a failing test.',
    files: ['src/index.ts', 'contract/identity-jwt-claims-v1.json', 'contract/subject-derivation-v2.json'],
    stack: ['TypeScript', 'Web Crypto', 'published to GitHub Packages'],
  },

  /* --------------------------------------------------------- access desk */
  {
    id: 'admission-desk',
    code: 'AD',
    name: 'Access desk',
    role: 'the answer to "is this person allowed?"',
    group: 'access-desk',
    whatItDoes:
      'Holds the Lab\'s answer to whether a given person has access right now, and what they are ' +
      'allowed to spend. Every other service asks this one instead of keeping a list of its own.',
    howItsBuilt:
      'Only another Lab service can reach it, over a private binding; it has no public address. ' +
      'The answer is fetched fresh on every request.',
    files: ['src/index.ts', 'src/intake-identity.ts', 'src/membership-policy.ts'],
    stack: ['Cloudflare Workers', 'named entrypoints', 'Turnstile'],
  },
  {
    id: 'admission-ledger',
    code: 'LG',
    name: 'The ledger',
    role: 'where membership is stored',
    group: 'access-desk',
    whatItDoes:
      'Every application, decision, membership and expiry date the Lab holds, along with class ' +
      'rosters and a log of who changed what.',
    howItsBuilt:
      'All of it sits in a single [[durable object]] with its own SQLite database, addressed by ' +
      'one fixed name. One writer serializes the decisions, which arrive from both a browser and ' +
      'an agent.',
    files: ['src/registry.ts', 'src/registry-schema-v4.ts', 'src/schema.ts'],
    stack: ['Durable Objects', 'SQLite', 'versioned rows'],
  },
  {
    id: 'admission-console',
    code: 'RC',
    name: 'Review console',
    role: 'the queue an administrator reads',
    group: 'access-desk',
    whatItDoes:
      'The page where Lab staff see who has applied and approve or decline them. Each approval ' +
      'carries a role, a budget and an expiry date.',
    howItsBuilt:
      'Server-rendered by the same worker that owns the data, so staff read the queue from the ' +
      'ledger itself.',
    files: ['src/admin-ui.ts'],
    stack: ['server-rendered HTML'],
  },
  {
    id: 'admission-email',
    code: 'EM',
    name: 'Decision email',
    role: 'the notifier',
    group: 'access-desk',
    whatItDoes:
      'Writes and sends the messages people receive, telling them their application arrived, ' +
      'their access was approved, or their class is ready.',
    howItsBuilt:
      'Messages are queued in the ledger and sent afterwards, so a mail outage delays delivery ' +
      'rather than the decision.',
    files: ['src/email.ts'],
    stack: ['Amazon SES', 'queued delivery'],
  },

  /* --------------------------------------------------------- model plane */
  {
    id: 'gateway-endpoint',
    code: 'GW',
    name: 'Model endpoint',
    role: 'the one address for models',
    group: 'model-plane',
    whatItDoes:
      'The Lab\'s single API for talking to language models. Point any OpenAI-compatible tool at ' +
      'it with a Lab key and it works, and you never need a credential from the model vendor.',
    howItsBuilt:
      'Requests to it do [[not]] pass through Doorway, unlike every other tool on the domain. ' +
      'Scripts and desktop apps carry a bearer token and have no browser session, so the endpoint ' +
      'authenticates callers itself.',
    files: ['src/index.ts', 'src/catalog.ts', 'src/quota.ts'],
    stack: ['Cloudflare Workers', 'OpenAI-compatible API'],
  },
  {
    id: 'gateway-auth',
    code: 'GA',
    name: 'Credential check',
    role: 'where a caller is authenticated',
    group: 'model-plane',
    whatItDoes:
      'Works out who is calling. That might be a person with a Lab key, a signed-in browser ' +
      'session, or the chat sandbox acting on someone\'s behalf. It then decides whether the ' +
      'caller may spend anything.',
    howItsBuilt:
      'Permissions are fetched from the key vault on every call. The token the caller presents is ' +
      'never asked what it may spend, and forged identity headers are rejected before anything ' +
      'else happens.',
    files: ['src/auth.ts'],
    stack: ['RS256 verification', '@cuny-ai-lab/cail-identity'],
  },
  {
    id: 'gateway-upstream',
    code: 'UP',
    name: 'Provider dispatch',
    role: 'the dispatcher',
    group: 'model-plane',
    whatItDoes:
      'Sends an admitted request on to whichever company runs the model, and translates between ' +
      'their dialects so callers see one consistent API.',
    howItsBuilt:
      'The vendor keys live in Cloudflare\'s AI Gateway. Changing provider is a change there, not ' +
      'in any tool that calls this one.',
    files: ['src/upstream.ts', 'src/provider-adapters.ts'],
    stack: ['Workers AI', 'OpenRouter', 'Cloudflare AI Gateway'],
  },
  {
    id: 'model-access-api',
    code: 'KD',
    name: 'Key desk',
    role: 'where you collect your key',
    group: 'model-plane',
    whatItDoes:
      'The page where a signed-in person creates, rotates and revokes their own key for the model ' +
      'endpoint, and sees a rough estimate of what they have spent.',
    howItsBuilt:
      'It holds no memberships and no permissions of its own. It asks the access desk who you are ' +
      'and the vault for your keys, which keeps the question of who may have a key in one place.',
    files: ['model-access-api/src/index.ts', 'model-access-api/src/page.ts'],
    stack: ['Cloudflare Workers', 'server-rendered HTML'],
  },
  {
    id: 'model-access-registry',
    code: 'KV',
    name: 'Key vault',
    role: 'where credentials live',
    group: 'model-plane',
    whatItDoes:
      'Stores the keys themselves and what each one is allowed to do. It also links a chat- ' +
      'sandbox account to the person behind it.',
    howItsBuilt:
      'Keys are kept as [[hashes]], and the vault cannot show one again after the moment it is ' +
      'created. It has no HTTP surface; access is controlled by which services hold the binding.',
    files: ['model-access-registry/src/registry.ts', 'model-access-registry/src/entrypoints.ts'],
    stack: ['Durable Objects', 'SQLite', 'hashed credentials'],
  },

  /* ----------------------------------------------------------- workshops */
  {
    id: 'chat-sandbox',
    code: 'CH',
    name: 'Chat sandbox',
    role: 'the everyday chat tool',
    group: 'workshops',
    whatItDoes:
      'The chat interface most people mean when they say they use the Lab. Sign in with CUNY ' +
      'Login, pick a model, talk to it, and keep your conversations and documents.',
    howItsBuilt:
      'It is [[Open WebUI]], an open-source project, run with a small set of the Lab\'s own ' +
      'patches instead of a fork. The patches re-apply to a pinned upstream commit and fail with ' +
      'an error when upstream has moved.',
    files: ['image/patches/cail-oauth-activation.py', 'src/openwebui/cail_model_access.py'],
    stack: ['Open WebUI', 'AWS Fargate', 'PostgreSQL'],
  },
  {
    id: 'chat-rollout',
    code: 'RO',
    name: 'Sandbox releases',
    role: 'how the chat tool gets updated',
    group: 'workshops',
    whatItDoes:
      'Builds the chat sandbox\'s image and rolls it out, to a test environment first and then to ' +
      'the one people use.',
    howItsBuilt:
      'Deploys move an exact image [[digest]] rather than a tag. Twenty policy-managed settings ' +
      'are re-applied on every rollout, over the top of anything edited by hand.',
    files: ['scripts/rollout-ecs.sh', 'src/policy.ts', 'policy.json'],
    stack: ['GitHub Actions', 'Amazon ECS', 'pinned digests'],
  },
  {
    id: 'agent-studio-service',
    code: 'AS',
    name: 'Agent Studio',
    role: 'the research workspace',
    group: 'workshops',
    whatItDoes:
      'A workspace where you describe a research task in chat and an agent writes and runs code ' +
      'to do it. It searches library catalogs and article databases, then builds the tables and ' +
      'charts you keep.',
    howItsBuilt:
      'The code the agent writes runs in a [[disposable worker]] with no network access of its ' +
      'own; every outbound request goes through an allowlist. Database credentials are attached ' +
      'outside that sandbox.',
    files: [
      'cloudflare/src/agent/workspace-agent.ts',
      'cloudflare/src/server.ts',
      'cloudflare/src/skills/index.ts',
    ],
    stack: ['Cloudflare Workers', 'Worker Loaders', 'Durable Objects', 'R2'],
  },
  {
    id: 'agent-studio-ui',
    code: 'AC',
    name: 'Studio canvas',
    role: 'what the researcher sees',
    group: 'workshops',
    whatItDoes:
      'The workspace you look at. Tables, charts, documents and file previews arrive as panels on ' +
      'a canvas you can rearrange and connect.',
    howItsBuilt:
      'Panels persist on the canvas between sessions.',
    files: ['frontend/src/App.tsx', 'frontend/src/components/canvas/CanvasFlow.tsx'],
    stack: ['React', 'React Flow', 'Tailwind'],
  },
  {
    id: 'site-studio-service',
    code: 'SS',
    name: 'Site Studio',
    role: 'the website builder',
    group: 'workshops',
    whatItDoes:
      'Builds academic websites by conversation. You describe a change, it edits the HTML and CSS ' +
      'files directly, and it publishes to a public address when you are ready. The templates ' +
      'cover a CV, a course page and a portfolio, among others.',
    howItsBuilt:
      'It reaches the model endpoint at its [[public address]], while the other tools use private ' +
      'bindings. Every generated image is screened by a vision model before it can be saved.',
    files: [
      'packages/app/src/agents/site-builder.ts',
      'packages/app/src/routes/publish.ts',
      'packages/app/src/storage/r2.ts',
    ],
    stack: ['Cloudflare Workers', 'Durable Objects', 'R2', 'Worker Loaders'],
  },
  {
    id: 'site-studio-ui',
    code: 'ED',
    name: 'Site editor',
    role: 'the split-screen editor',
    group: 'workshops',
    whatItDoes:
      'Chat sits beside a live view of the site, with each change shown as a diff.',
    howItsBuilt:
      'Nothing is written to the project until the diff is accepted.',
    files: [
      'packages/frontend/src/lib/components/AgentChat.svelte',
      'packages/frontend/src/routes/editor/[projectId]/+page.svelte',
    ],
    stack: ['Svelte', 'CodeMirror', 'Tailwind'],
  },
  {
    id: 'sandbox-service',
    code: 'SB',
    name: 'Container service',
    role: 'the machine that runs code',
    group: 'workshops',
    whatItDoes:
      'Hands a signed-in person a short-lived Linux container to run commands in, with a daily ' +
      'budget so one person cannot exhaust the shared capacity.',
    howItsBuilt:
      'Its caller is the Workbench, which this map does not cover. The two studios do not use it; ' +
      'they run untrusted code in disposable workers instead.',
    files: ['src/subject-policy.ts', 'src/http.ts', 'src/cloudflare-sandbox.ts'],
    stack: ['Cloudflare Containers', 'Durable Objects', 'leases and quotas'],
  },

  /* ------------------------------------------------------------- outside */
  {
    id: 'cuny-login',
    code: 'CU',
    name: 'CUNY Login',
    role: 'the university’s sign-in',
    group: 'outside',
    whatItDoes:
      'The university\'s own single sign-on, run by CUNY. The Lab never sees or stores your CUNY ' +
      'password.',
    howItsBuilt:
      'Both the front door and the chat sandbox authenticate against it independently.',
    files: [],
    stack: ['CUNY Central IT'],
  },
  {
    id: 'workers-ai',
    code: 'WA',
    name: 'Workers AI',
    role: 'the open-weight models',
    group: 'outside',
    whatItDoes:
      'Cloudflare\'s model hosting, which serves most of the open-weight models the Lab offers.',
    howItsBuilt:
      'A model whose weights are published can be moved to another host, which is why the Lab ' +
      'prefers them for teaching.',
    files: [],
    stack: ['Cloudflare'],
  },
  {
    id: 'openrouter',
    code: 'OR',
    name: 'OpenRouter',
    role: 'the commercial models',
    group: 'outside',
    whatItDoes:
      'A broker that reaches the commercial models the Lab cannot host itself, including the ' +
      'frontier models from Anthropic and OpenAI.',
    howItsBuilt:
      'Reached through Cloudflare\'s AI Gateway, which is where the credential and the spending ' +
      'record live.',
    files: [],
    stack: ['OpenRouter'],
  },
  {
    id: 'amazon-ses',
    code: 'MX',
    name: 'Email delivery',
    role: 'the mail sender',
    group: 'outside',
    whatItDoes: 'Sends the Lab’s decision emails, as ailab@gc.cuny.edu.',
    howItsBuilt: 'Amazon SES, in the same AWS account that runs the chat sandbox.',
    files: [],
    stack: ['Amazon SES'],
  },
]

export const EDGES: ArchEdge[] = [
  /* sign-in */
  {
    id: 'e-signin-cuny',
    from: 'doorway-signin',
    to: 'cuny-login',
    kind: 'call',
    label: 'authorization code exchange',
    flowIds: ['signin'],
  },
  {
    id: 'e-signin-subject',
    from: 'doorway-signin',
    to: 'identity-library',
    kind: 'call',
    label: 'salted pseudonym derivation',
    flowIds: ['signin'],
  },
  {
    id: 'e-signin-link',
    from: 'doorway-signin',
    to: 'admission-desk',
    kind: 'call',
    label: 'verified identity, linked once',
    flowIds: ['signin'],
  },
  {
    id: 'e-doorway-admission',
    from: 'doorway-front',
    to: 'admission-desk',
    kind: 'call',
    label: 'membership check on every request, and new applications',
    flowIds: ['signin', 'apply'],
  },
  {
    id: 'e-doorway-agentstudio',
    from: 'doorway-front',
    to: 'agent-studio-service',
    kind: 'call',
    label: 'the request, with a 300-second identity token',
    flowIds: ['signin'],
  },
  {
    id: 'e-doorway-sitestudio',
    from: 'doorway-front',
    to: 'site-studio-service',
    kind: 'call',
    label: 'the request, with a 300-second identity token',
    flowIds: ['build'],
  },
  {
    id: 'e-doorway-keys',
    from: 'doorway-front',
    to: 'model-access-api',
    kind: 'call',
    label: 'the request, with a 300-second identity token',
    flowIds: ['key'],
  },
  {
    id: 'e-doorway-console',
    from: 'doorway-front',
    to: 'admission-console',
    kind: 'call',
    label: 'the review queue, for administrators only',
    flowIds: [],
  },
  {
    id: 'e-classes-admission',
    from: 'doorway-classes',
    to: 'admission-desk',
    kind: 'call',
    label: 'rosters, invitations and share links',
    flowIds: [],
  },
  {
    id: 'e-agent-admission',
    from: 'doorway-agent',
    to: 'admission-desk',
    kind: 'call',
    label: 'is this operator still an administrator?',
    flowIds: [],
  },

  /* the desk */
  {
    id: 'e-desk-ledger',
    from: 'admission-desk',
    to: 'admission-ledger',
    kind: 'data',
    label: 'applications, decisions, memberships',
    flowIds: ['apply'],
  },
  {
    id: 'e-ledger-email',
    from: 'admission-ledger',
    to: 'admission-email',
    kind: 'data',
    label: 'a queued decision message',
    flowIds: ['apply'],
  },
  {
    id: 'e-email-ses',
    from: 'admission-email',
    to: 'amazon-ses',
    kind: 'call',
    label: 'the email itself',
    flowIds: ['apply'],
  },
  {
    id: 'e-desk-registry',
    from: 'admission-desk',
    to: 'model-access-registry',
    kind: 'call',
    label: 'budget administration',
    flowIds: [],
  },
  {
    id: 'e-desk-quota',
    from: 'admission-desk',
    to: 'gateway-endpoint',
    kind: 'support',
    label: 'spend readback',
    flowIds: [],
  },

  /* the model plane */
  {
    id: 'e-gateway-auth',
    from: 'gateway-endpoint',
    to: 'gateway-auth',
    kind: 'call',
    label: 'the caller’s credential',
    flowIds: ['ask'],
  },
  {
    id: 'e-auth-registry',
    from: 'gateway-auth',
    to: 'model-access-registry',
    kind: 'call',
    label: 'scopes and budget — never taken from the token',
    flowIds: ['ask'],
  },
  {
    id: 'e-registry-admission',
    from: 'model-access-registry',
    to: 'admission-desk',
    kind: 'call',
    label: 'is this membership still active?',
    flowIds: ['ask'],
  },
  {
    id: 'e-gateway-upstream',
    from: 'gateway-endpoint',
    to: 'gateway-upstream',
    kind: 'call',
    label: 'the admitted call',
    flowIds: ['ask', 'build'],
  },
  {
    id: 'e-upstream-workersai',
    from: 'gateway-upstream',
    to: 'workers-ai',
    kind: 'call',
    label: 'prompt and completion',
    flowIds: ['ask', 'build'],
  },
  {
    id: 'e-upstream-openrouter',
    from: 'gateway-upstream',
    to: 'openrouter',
    kind: 'call',
    label: 'prompt and completion, through the AI Gateway',
    flowIds: [],
  },

  /* keys */
  {
    id: 'e-keys-admission',
    from: 'model-access-api',
    to: 'admission-desk',
    kind: 'call',
    label: 'who is this, and are they active?',
    flowIds: ['key'],
  },
  {
    id: 'e-keys-registry',
    from: 'model-access-api',
    to: 'model-access-registry',
    kind: 'call',
    label: 'create, rotate, revoke',
    flowIds: ['key'],
  },
  {
    id: 'e-keys-doorway',
    from: 'model-access-api',
    to: 'doorway-front',
    kind: 'support',
    label: 'subject lookup',
    flowIds: [],
  },
  {
    id: 'e-keys-quota',
    from: 'model-access-api',
    to: 'gateway-endpoint',
    kind: 'support',
    label: 'spend estimate',
    flowIds: [],
  },

  /* the workshops */
  {
    id: 'e-chat-cuny',
    from: 'chat-sandbox',
    to: 'cuny-login',
    kind: 'call',
    label: 'its own sign-in, not through the front door',
    flowIds: [],
  },
  {
    id: 'e-chat-activate',
    from: 'chat-sandbox',
    to: 'model-access-api',
    kind: 'call',
    label: 'first-login activation',
    flowIds: [],
  },
  {
    id: 'e-chat-gateway',
    from: 'chat-sandbox',
    to: 'gateway-endpoint',
    kind: 'call',
    label: 'the question you typed',
    flowIds: ['ask'],
  },
  {
    id: 'e-rollout-chat',
    from: 'chat-rollout',
    to: 'chat-sandbox',
    kind: 'data',
    label: 'a pinned image digest',
    flowIds: [],
  },
  {
    id: 'e-agentstudio-gateway',
    from: 'agent-studio-service',
    to: 'gateway-endpoint',
    kind: 'call',
    label: 'model call, over a private binding',
    flowIds: [],
  },
  {
    id: 'e-agentui-service',
    from: 'agent-studio-ui',
    to: 'agent-studio-service',
    kind: 'call',
    label: 'workspace and chat requests',
    flowIds: [],
  },
  {
    id: 'e-sitestudio-gateway',
    from: 'site-studio-service',
    to: 'gateway-endpoint',
    kind: 'call',
    label: 'model call, over the public address',
    flowIds: ['build'],
  },
  {
    id: 'e-siteui-service',
    from: 'site-studio-ui',
    to: 'site-studio-service',
    kind: 'call',
    label: 'edit requests and diffs',
    flowIds: [],
  },

  /* the shared rulebook */
  {
    id: 'e-identity-gateway',
    from: 'identity-library',
    to: 'gateway-auth',
    kind: 'support',
    label: 'token verification rules',
    flowIds: [],
  },
  {
    id: 'e-identity-agentstudio',
    from: 'identity-library',
    to: 'agent-studio-service',
    kind: 'support',
    label: 'token verification rules',
    flowIds: [],
  },
  {
    id: 'e-identity-sitestudio',
    from: 'identity-library',
    to: 'site-studio-service',
    kind: 'support',
    label: 'token verification rules',
    flowIds: [],
  },
  {
    id: 'e-identity-sandbox',
    from: 'identity-library',
    to: 'sandbox-service',
    kind: 'support',
    label: 'token verification rules',
    flowIds: [],
  },
]

export const FLOWS: ArchFlow[] = [
  {
    id: 'signin',
    name: 'Sign in',
    payload: 'your CUNY identity',
    summary:
      'Signing in with CUNY Login produces a Lab pseudonym. The front door then checks the ' +
      'membership and mints a token for the one tool you asked for.',
    route: [
      'e-signin-cuny',
      'e-signin-subject',
      'e-signin-link',
      'e-doorway-admission',
      'e-doorway-agentstudio',
    ],
  },
  {
    id: 'ask',
    name: 'Ask a model a question',
    payload: 'a prompt',
    summary:
      'A question typed in the chat sandbox reaches a model. On the way, the gateway checks the ' +
      'person\'s membership, which it reads from the vault on every call.',
    route: [
      'e-chat-gateway',
      'e-gateway-auth',
      'e-auth-registry',
      'e-registry-admission',
      'e-gateway-upstream',
      'e-upstream-workersai',
    ],
  },
  {
    id: 'apply',
    name: 'Apply for access',
    payload: 'an application',
    summary:
      'Someone applies on the Lab\'s website. The desk records the application, a person reviews ' +
      'it, and the Lab emails the decision.',
    route: ['e-doorway-admission', 'e-desk-ledger', 'e-ledger-email', 'e-email-ses'],
  },
  {
    id: 'key',
    name: 'Get a key for your own code',
    payload: 'a personal key',
    summary:
      'A researcher who wants to call models from their own scripts collects a key. The vault ' +
      'stores it as a hash.',
    route: ['e-doorway-keys', 'e-keys-admission', 'e-keys-registry', 'e-keys-quota'],
  },
  {
    id: 'build',
    name: 'Build a website',
    payload: 'an edit request',
    summary:
      'You describe a change, and Site Studio turns it into a model call and an edit to the ' +
      'site\'s HTML. It calls the model endpoint at its public address; the other tools use ' +
      'private bindings.',
    route: ['e-doorway-sitestudio', 'e-sitestudio-gateway', 'e-gateway-upstream', 'e-upstream-workersai'],
  },
]

const NO_MEASURE: Measure = { count: 0, loc: 0 }

const sized = AUTHORED.map((node) => {
  const measure = MEASURED[node.id] ?? NO_MEASURE
  const { archetype, params } = deriveArchetype(measure)
  return {
    node,
    measure,
    archetype,
    params,
    size: deriveSize(archetype, params, measure),
  }
})

const footprints = packLayout(
  sized.map(({ node, size }) => ({ item: node.id, group: node.group, size })),
  GROUPS.map((group) => group.id),
)

export const NODES: ArchNode[] = sized.map(({ node, measure, archetype, params }) => {
  const footprint = footprints.get(node.id)
  if (footprint === undefined) throw new Error(`No footprint was packed for ${node.id}.`)
  return {
    ...node,
    archetype,
    params,
    footprint,
    height: deriveHeight(measure),
    count: measure.count,
    loc: measure.loc,
  }
})

export const ARCHITECTURE: ArchitectureData = {
  groups: GROUPS,
  nodes: NODES,
  edges: EDGES,
  flows: FLOWS,
  intro: {
    title: 'The CUNY AI Lab',
    lede: 'The nine repositories that make up the Lab\'s software',
    whatItDoes:
      'The Lab runs shared AI tools for CUNY: a chat sandbox, a research workspace and a ' +
      'website builder, with one model endpoint underneath all three. A person signs in once ' +
      'with their CUNY account, and the tools work from a pseudonym rather than a name.',
    howItsBuilt:
      'Almost everything runs on Cloudflare Workers. Services reach each other over private ' +
      'bindings, so none of them answers on a public address. One front door handles CUNY Login ' +
      'and one access desk answers whether a person is allowed. The chat sandbox is the ' +
      'exception: it runs on AWS and signs people in itself.',
  },
  unmapped: UNCLAIMED,
  repo: 'CUNY-AI-Lab',
}
