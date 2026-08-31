import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const now = new Date()

async function main() {
  // ── Documents ──────────────────────────────────────────────────────
  const doc1 = await prisma.document.create({
    data: {
      id: 'doc-1',
      title: 'AI-Powered Onboarding Flow — PRD',
      type: 'prd',
      tags: JSON.stringify(['onboarding', 'ai', 'growth']),
      content: `<h1>AI-Powered Onboarding Flow</h1>
<h2>Problem Statement</h2>
<p>New users struggle to understand the product's value within the first session, leading to a 62% drop-off before completing setup. The current static onboarding ignores user role, goals, and prior tool experience.</p>
<h2>Goals &amp; Success Metrics</h2>
<ul>
  <li>Activation rate (completes setup) | 38% → 60% | Q3 2026</li>
  <li>Time-to-first-value | 8 min → 4 min | Q3 2026</li>
  <li>Day-7 retention | 41% → 55% | Q3 2026</li>
</ul>
<h2>User Stories</h2>
<ul>
  <li>As a <strong>first-time user</strong>, I want the checklist to reflect my role so that I complete relevant steps only.</li>
  <li>As a <strong>returning user</strong>, I want to resume exactly where I left off so that I don't repeat completed steps.</li>
</ul>
<h2>Scope</h2>
<h3>In Scope</h3>
<ul><li>Role detection from sign-up form</li><li>Dynamic checklist generation</li><li>Progress persistence</li></ul>
<h3>Out of Scope</h3>
<ul><li>In-app video tutorials</li><li>Multi-language support</li></ul>
<h2>Functional Requirements</h2>
<ol>
  <li>System detects user role (PM / Engineer / Designer / Other) during sign-up</li>
  <li>Checklist renders 5–8 role-specific tasks within 500ms of login</li>
  <li>Progress syncs across devices in real time</li>
  <li>AI suggests next best action when user is idle for 2+ minutes</li>
</ol>
<h2>Open Questions</h2>
<ol>
  <li>Should we gate certain features behind checklist completion?</li>
  <li>How do we handle users who skip role selection?</li>
</ol>`,
      createdAt: now,
    },
  })

  await prisma.document.create({
    data: {
      id: 'doc-2',
      title: 'User Research: Activation Drop-off',
      type: 'research',
      tags: JSON.stringify(['research', 'activation', 'ux']),
      content: `<h1>User Research: Activation Drop-off</h1>
<h2>Research Summary</h2>
<p>20 moderated user interviews conducted across SMB and enterprise segments. Focus: where and why users abandon onboarding before completing setup.</p>
<h2>Key Themes</h2>
<h3>Theme 1: Onboarding Confusion</h3>
<p><strong>Frequency:</strong> 14 out of 20 participants</p>
<p><strong>Summary:</strong> Users couldn't identify what to do first. The flat list of tasks gave no sense of priority or sequence.</p>
<blockquote><p>"I didn't really know what to do first."</p></blockquote>
<blockquote><p>"There were too many options — I just closed it."</p></blockquote>
<h3>Theme 2: Email Re-engagement Works</h3>
<p><strong>Frequency:</strong> 9 out of 20 participants</p>
<p><strong>Summary:</strong> Users who received a follow-up email within 24 hours of sign-up were 3x more likely to return.</p>
<blockquote><p>"The reminder email was actually helpful."</p></blockquote>
<h2>Recommended Actions</h2>
<ol>
  <li>Redesign onboarding with role-based task ordering</li>
  <li>Add a 24-hour re-engagement email for users who didn't complete setup</li>
  <li>Add a progress indicator to the sidebar</li>
</ol>`,
      createdAt: now,
    },
  })

  await prisma.document.create({
    data: {
      id: 'doc-3',
      title: 'Q2 2026 Roadmap',
      type: 'roadmap',
      tags: JSON.stringify(['roadmap', 'q2', 'planning']),
      content: `<h1>Q2 2026 Product Roadmap</h1>
<h2>Strategic Theme</h2>
<p>Reduce time-to-value for new users while expanding power features for established teams.</p>
<h2>Now (April – May)</h2>
<ul>
  <li><strong>Smart Onboarding Checklist</strong> — personalised by role, reduces setup friction</li>
  <li><strong>Activation Email Sequence</strong> — automated drip for drop-off recovery</li>
</ul>
<h2>Next (June – July)</h2>
<ul>
  <li><strong>In-app Tooltip Coach</strong> — contextual AI guidance during complex workflows</li>
  <li><strong>Bulk CSV Import</strong> — enterprise teams need faster data migration</li>
</ul>
<h2>Later (August+)</h2>
<ul>
  <li><strong>Dark Mode</strong> — high-demand cosmetic feature</li>
  <li><strong>SSO / SAML</strong> — required for enterprise deals in pipeline</li>
</ul>
<h2>Dependencies &amp; Risks</h2>
<ul>
  <li>AI checklist depends on role-detection data model — must ship in April</li>
  <li>SSO blocked on security audit scheduled for July</li>
</ul>`,
      createdAt: now,
    },
  })

  await prisma.document.create({
    data: {
      id: 'doc-4',
      title: 'User Story: Onboarding Checklist',
      type: 'user-story',
      tags: JSON.stringify(['user-story', 'onboarding']),
      content: `<h2>User Story</h2>
<p><strong>As a</strong> first-time PM using the product<br>
<strong>I want to</strong> see a checklist tailored to my role<br>
<strong>So that</strong> I can complete setup quickly without wading through irrelevant steps.</p>
<h2>Acceptance Criteria</h2>
<pre><code>Scenario: PM role selected during sign-up
  Given the user selected "Product Manager" during registration
  When they log in for the first time
  Then the checklist shows PM-specific tasks
  And engineering-specific tasks are hidden

Scenario: Progress persists on refresh
  Given the user completed 3 of 6 checklist items
  When they refresh the page
  Then completed items remain checked
  And the progress bar reflects 50%</code></pre>
<h2>Story Points</h2>
<p>Estimate: <strong>5</strong> — requires role-detection integration + dynamic rendering logic</p>
<h2>Definition of Done</h2>
<ul>
  <li>Code reviewed and merged</li>
  <li>Acceptance criteria passing in staging</li>
  <li>Unit tests written for role-mapping logic</li>
  <li>QA sign-off on all 5 supported roles</li>
</ul>`,
      createdAt: now,
    },
  })

  // ── Payments & Billing documents ───────────────────────────────────
  await prisma.document.create({
    data: {
      id: 'doc-5',
      title: 'Subscription Management Overhaul — PRD',
      type: 'prd',
      tags: JSON.stringify(['billing', 'subscriptions', 'revenue']),
      content: `<h1>Subscription Management Overhaul</h1>
<h2>Problem Statement</h2>
<p>The current billing flow has a 34% drop-off at the plan selection screen and a 21% failed upgrade rate due to a confusing 4-step checkout. Support tickets related to billing account for 38% of all inbound volume, consuming 2 full-time support engineers.</p>
<h2>Goals &amp; Success Metrics</h2>
<ul>
  <li>Upgrade conversion rate | 21% → 40% | Q3 2026</li>
  <li>Billing-related support tickets | −50% | Q3 2026</li>
  <li>Failed payment recovery rate | 12% → 35% | Q3 2026</li>
  <li>MRR from plan upgrades | +$48k/month | Q4 2026</li>
</ul>
<h2>User Stories</h2>
<ul>
  <li>As a <strong>team admin</strong>, I want to upgrade my plan in one click so that I don't need to re-enter payment details every time.</li>
  <li>As an <strong>accountant</strong>, I want to download invoices as PDF so that I can submit them for reimbursement.</li>
  <li>As a <strong>team admin</strong>, I want to see a clear breakdown of what I'm being charged for so that I can audit our spend.</li>
</ul>
<h2>Scope</h2>
<h3>In Scope</h3>
<ul>
  <li>One-click plan upgrade with saved payment method</li>
  <li>PDF invoice generation and email delivery</li>
  <li>Self-serve plan downgrade with prorated credit</li>
  <li>Failed payment retry logic with Dunning emails</li>
  <li>Billing portal with usage breakdown by seat</li>
</ul>
<h3>Out of Scope</h3>
<ul>
  <li>Multi-currency support (tracked separately)</li>
  <li>Custom enterprise contracts</li>
</ul>
<h2>Functional Requirements</h2>
<ol>
  <li>Upgrade flow completes in ≤2 clicks when payment method is on file</li>
  <li>Invoice PDF generated within 30 seconds of payment confirmation</li>
  <li>Dunning sequence: 3 emails over 7 days before subscription cancellation</li>
  <li>Proration calculated to the hour for mid-cycle downgrades</li>
</ol>
<h2>Open Questions</h2>
<ol>
  <li>Do we offer annual billing discounts at checkout or only on the pricing page?</li>
  <li>Should downgraded users retain access to premium features for the remainder of their billing period?</li>
</ol>`,
      createdAt: now,
    },
  })

  await prisma.document.create({
    data: {
      id: 'doc-6',
      title: 'User Research: Payment Friction',
      type: 'research',
      tags: JSON.stringify(['research', 'billing', 'payments', 'ux']),
      content: `<h1>User Research: Payment Friction</h1>
<h2>Research Summary</h2>
<p>15 interviews + 200 session recordings analysed. Focus: where users abandon the upgrade flow and why they contact support about billing.</p>
<h2>Key Themes</h2>
<h3>Theme 1: Plan Comparison Paralysis</h3>
<p><strong>Frequency:</strong> 11 out of 15 participants</p>
<p><strong>Summary:</strong> Users couldn't determine which plan was right for their team size. Feature comparison tables were too long and jargon-heavy.</p>
<blockquote><p>"I genuinely couldn't figure out what 'advanced analytics' meant versus 'basic analytics'."</p></blockquote>
<blockquote><p>"I went back and forth between Pro and Business for 10 minutes and then just gave up."</p></blockquote>
<h3>Theme 2: Invoice Accessibility</h3>
<p><strong>Frequency:</strong> 9 out of 15 participants</p>
<p><strong>Summary:</strong> Finance teams need PDF invoices for reimbursement but the current system only sends HTML emails that don't pass expense systems.</p>
<blockquote><p>"My finance team won't accept a screenshot of an email as an invoice."</p></blockquote>
<blockquote><p>"I had to contact support 3 times just to get a proper invoice."</p></blockquote>
<h3>Theme 3: Failed Payment Anxiety</h3>
<p><strong>Frequency:</strong> 7 out of 15 participants</p>
<p><strong>Summary:</strong> When a payment failed, users received no clear guidance on how to fix it. Several lost access without warning.</p>
<blockquote><p>"I woke up one morning and the tool just wasn't working. No email, nothing."</p></blockquote>
<h2>Recommended Actions</h2>
<ol>
  <li>Simplify plan comparison to 3 key differentiators per plan</li>
  <li>Add a "What plan is right for me?" interactive quiz</li>
  <li>Implement PDF invoice generation</li>
  <li>Build a clear failed-payment recovery flow with in-app banner + email</li>
</ol>`,
      createdAt: now,
    },
  })

  await prisma.document.create({
    data: {
      id: 'doc-7',
      title: 'User Story: Invoice PDF Export',
      type: 'user-story',
      tags: JSON.stringify(['user-story', 'billing', 'invoices']),
      content: `<h2>User Story</h2>
<p><strong>As a</strong> team admin or accountant<br>
<strong>I want to</strong> download a PDF invoice for any past payment<br>
<strong>So that</strong> I can submit it to our finance team for reimbursement.</p>
<h2>Acceptance Criteria</h2>
<pre><code>Scenario: Download invoice from billing history
  Given the user is on the Billing page
  And at least one payment has been processed
  When they click "Download Invoice" on any line item
  Then a PDF is generated within 5 seconds
  And the PDF includes: company name, billing address, VAT number, line items, and total

Scenario: Invoice delivered by email
  Given a successful payment has been processed
  When the payment clears
  Then an email is sent within 60 seconds
  And the email contains the PDF as an attachment

Scenario: Invoice for failed payment attempt
  Given a payment failed
  When the user views billing history
  Then failed payments are marked clearly
  And no invoice PDF is available for failed payments</code></pre>
<h2>Story Points</h2>
<p>Estimate: <strong>3</strong> — PDF generation via headless browser or template engine; Stripe webhook integration already in place</p>
<h2>Definition of Done</h2>
<ul>
  <li>PDF renders correctly for all plan types and currencies</li>
  <li>Email delivery confirmed in staging with <5s latency</li>
  <li>Tested against 5 different browser/OS combinations</li>
  <li>VAT handling validated with finance team</li>
</ul>`,
      createdAt: now,
    },
  })

  // ── API & Integrations documents ───────────────────────────────────
  await prisma.document.create({
    data: {
      id: 'doc-8',
      title: 'Public API v2 — PRD',
      type: 'prd',
      tags: JSON.stringify(['api', 'integrations', 'platform', 'developer']),
      content: `<h1>Public API v2</h1>
<h2>Problem Statement</h2>
<p>Our v1 API is used by 340 active integrations but has a 23% error rate on complex queries, no webhook support, and rate limits that are too low for enterprise automation workflows. Developers report spending 40% of their integration time working around API limitations rather than building features.</p>
<h2>Goals &amp; Success Metrics</h2>
<ul>
  <li>API error rate | 23% → &lt;2% | Q4 2026</li>
  <li>Developer time-to-first-call | 2 days → 30 min | Q3 2026</li>
  <li>Active integrations | 340 → 800 | Q4 2026</li>
  <li>Enterprise API plan revenue | $0 → $120k ARR | Q4 2026</li>
</ul>
<h2>User Stories</h2>
<ul>
  <li>As a <strong>developer</strong>, I want interactive API docs so that I can test endpoints without leaving the browser.</li>
  <li>As an <strong>enterprise customer</strong>, I want webhook events for all data changes so that I can keep my internal systems in sync.</li>
  <li>As a <strong>developer</strong>, I want a rate limit dashboard so that I can see my usage before I hit the ceiling.</li>
</ul>
<h2>Scope</h2>
<h3>In Scope</h3>
<ul>
  <li>RESTful v2 endpoints with consistent error responses</li>
  <li>Webhook support for 12 event types</li>
  <li>Interactive documentation (Swagger/Redoc)</li>
  <li>Per-key rate limit dashboard</li>
  <li>API key rotation without downtime</li>
</ul>
<h3>Out of Scope</h3>
<ul>
  <li>GraphQL API (tracked for H1 2027)</li>
  <li>SDK generation (post-v2 launch)</li>
</ul>
<h2>Functional Requirements</h2>
<ol>
  <li>All v2 endpoints return structured JSON errors with machine-readable codes</li>
  <li>Webhook delivery retried up to 5 times with exponential backoff</li>
  <li>Rate limit headers returned on every response (X-RateLimit-Remaining)</li>
  <li>v1 API remains available for 12 months after v2 GA with deprecation warnings</li>
</ol>
<h2>Open Questions</h2>
<ol>
  <li>Should webhook secret verification be HMAC-SHA256 or RSA? (security team to advise)</li>
  <li>Do we charge for webhooks separately or include in API plan tiers?</li>
</ol>`,
      createdAt: now,
    },
  })

  await prisma.document.create({
    data: {
      id: 'doc-9',
      title: 'Q3 2026 Roadmap',
      type: 'roadmap',
      tags: JSON.stringify(['roadmap', 'q3', 'planning', 'api']),
      content: `<h1>Q3 2026 Product Roadmap</h1>
<h2>Strategic Theme</h2>
<p>Platform maturity: make the product the connective tissue of every team's workflow through a best-in-class API and deep integrations with the tools teams already use.</p>
<h2>Now (July – August)</h2>
<ul>
  <li><strong>Webhook Support</strong> — event-driven integrations for enterprise automation</li>
  <li><strong>Interactive API Docs</strong> — reduce time-to-first-call from 2 days to 30 minutes</li>
  <li><strong>Subscription Upgrade Flow</strong> — one-click upgrade when payment method is saved</li>
</ul>
<h2>Next (September)</h2>
<ul>
  <li><strong>Rate Limit Dashboard</strong> — self-serve visibility into API usage</li>
  <li><strong>Jira Integration</strong> — sync features and user stories bidirectionally</li>
  <li><strong>Slack Notifications</strong> — alert channels when roadmap items ship</li>
</ul>
<h2>Later (Q4)</h2>
<ul>
  <li><strong>Figma Plugin</strong> — attach design files directly to feature cards</li>
  <li><strong>Multi-currency Billing</strong> — support EUR, GBP, AUD for international expansion</li>
  <li><strong>GitHub Integration</strong> — link PRs to features for automatic status updates</li>
</ul>
<h2>Dependencies &amp; Risks</h2>
<ul>
  <li>Webhook infrastructure requires Redis cluster — DevOps provisioning by July 1</li>
  <li>Jira integration blocked on OAuth app approval (submitted May 15, ETA 6 weeks)</li>
  <li>Multi-currency requires Stripe configuration — 2 week setup time</li>
</ul>`,
      createdAt: now,
    },
  })

  // ── Features ───────────────────────────────────────────────────────
  await prisma.feature.createMany({
    data: [
      // Onboarding features
      {
        id: 'feat-1',
        title: 'Smart Onboarding Checklist',
        description: 'Personalised checklist that adapts based on user role and goals detected during sign-up.',
        status: 'Now', priority: 'P0',
        reach: 5000, impact: 3, confidence: 80, effort: 2,
        riceScore: Math.round((5000 * 3 * 0.8) / 2),
        moscow: 'Must', assignee: 'Alice', dueDate: '2026-04-30', linkedDocId: 'doc-1',
      },
      {
        id: 'feat-2',
        title: 'In-app Tooltip Coach',
        description: 'Contextual tooltips powered by AI that guide users through complex workflows.',
        status: 'Next', priority: 'P1',
        reach: 3000, impact: 2, confidence: 70, effort: 3,
        riceScore: Math.round((3000 * 2 * 0.7) / 3),
        moscow: 'Should', assignee: 'Bob', dueDate: '2026-06-15', linkedDocId: 'doc-1',
      },
      {
        id: 'feat-3',
        title: 'Activation Email Sequence',
        description: 'Automated email drip triggered by key in-app actions to re-engage users who dropped off.',
        status: 'Now', priority: 'P1',
        reach: 8000, impact: 2, confidence: 90, effort: 1,
        riceScore: Math.round((8000 * 2 * 0.9) / 1),
        moscow: 'Must', assignee: 'Carol', dueDate: '2026-05-20', linkedDocId: null,
      },
      {
        id: 'feat-4',
        title: 'Bulk CSV Import',
        description: 'Allow enterprise teams to import existing data via CSV for faster migration.',
        status: 'Next', priority: 'P1',
        reach: 2500, impact: 3, confidence: 75, effort: 4,
        riceScore: Math.round((2500 * 3 * 0.75) / 4),
        moscow: 'Should', assignee: 'Dave', dueDate: '2026-07-01', linkedDocId: null,
      },
      {
        id: 'feat-5',
        title: 'Dark Mode',
        description: 'Full dark mode support across the application.',
        status: 'Later', priority: 'P3',
        reach: 2000, impact: 1, confidence: 95, effort: 2,
        riceScore: Math.round((2000 * 1 * 0.95) / 2),
        moscow: 'Could', assignee: '', dueDate: '', linkedDocId: null,
      },
      {
        id: 'feat-6',
        title: 'SSO / SAML Integration',
        description: 'Enterprise single sign-on support required for large account deals in the sales pipeline.',
        status: 'Later', priority: 'P2',
        reach: 1200, impact: 3, confidence: 60, effort: 5,
        riceScore: Math.round((1200 * 3 * 0.6) / 5),
        moscow: 'Must', assignee: 'Eve', dueDate: '2026-08-15', linkedDocId: null,
      },
      {
        id: 'feat-7',
        title: 'Progress Bar in Sidebar',
        description: 'Visual indicator of onboarding completion shown persistently in the left sidebar.',
        status: 'Now', priority: 'P2',
        reach: 5000, impact: 1, confidence: 90, effort: 1,
        riceScore: Math.round((5000 * 1 * 0.9) / 1),
        moscow: 'Should', assignee: 'Alice', dueDate: '2026-05-05', linkedDocId: 'doc-1',
      },
      {
        id: 'feat-8',
        title: 'Analytics Dashboard',
        description: 'PM-facing dashboard showing activation funnel metrics, drop-off points, and cohort retention.',
        status: 'Done', priority: 'P0',
        reach: 50, impact: 3, confidence: 100, effort: 3,
        riceScore: Math.round((50 * 3 * 1.0) / 3),
        moscow: 'Must', assignee: 'Bob', dueDate: '2026-03-31', linkedDocId: null,
      },
      // Payments & Billing features
      {
        id: 'feat-9',
        title: 'One-click Plan Upgrade',
        description: 'Allow users with a saved payment method to upgrade their subscription in a single click without re-entering card details.',
        status: 'Now', priority: 'P0',
        reach: 6200, impact: 3, confidence: 85, effort: 2,
        riceScore: Math.round((6200 * 3 * 0.85) / 2),
        moscow: 'Must', assignee: 'Carol', dueDate: '2026-05-15', linkedDocId: 'doc-5',
      },
      {
        id: 'feat-10',
        title: 'Invoice PDF Export',
        description: 'Generate downloadable PDF invoices for every payment, delivered by email and available in the billing portal.',
        status: 'Now', priority: 'P1',
        reach: 4800, impact: 2, confidence: 90, effort: 1,
        riceScore: Math.round((4800 * 2 * 0.9) / 1),
        moscow: 'Must', assignee: 'Dave', dueDate: '2026-05-30', linkedDocId: 'doc-7',
      },
      {
        id: 'feat-11',
        title: 'Dunning Email Sequence',
        description: 'Automated 3-email sequence triggered by failed payments, guiding users to update their card before access is suspended.',
        status: 'Next', priority: 'P1',
        reach: 3100, impact: 3, confidence: 80, effort: 2,
        riceScore: Math.round((3100 * 3 * 0.8) / 2),
        moscow: 'Should', assignee: 'Alice', dueDate: '2026-06-30', linkedDocId: 'doc-5',
      },
      {
        id: 'feat-12',
        title: 'Multi-currency Support',
        description: 'Accept payments in EUR, GBP, AUD, and CAD to support international expansion without manual currency conversion.',
        status: 'Later', priority: 'P2',
        reach: 2200, impact: 3, confidence: 65, effort: 4,
        riceScore: Math.round((2200 * 3 * 0.65) / 4),
        moscow: 'Could', assignee: 'Eve', dueDate: '2026-09-30', linkedDocId: 'doc-5',
      },
      // API & Integrations features
      {
        id: 'feat-13',
        title: 'Webhook Support',
        description: 'Event-driven webhooks for 12 event types (feature created, status changed, document updated, etc.) enabling enterprise automation workflows.',
        status: 'Now', priority: 'P0',
        reach: 1800, impact: 3, confidence: 75, effort: 4,
        riceScore: Math.round((1800 * 3 * 0.75) / 4),
        moscow: 'Must', assignee: 'Bob', dueDate: '2026-07-15', linkedDocId: 'doc-8',
      },
      {
        id: 'feat-14',
        title: 'Interactive API Docs',
        description: 'Swagger/Redoc-powered documentation with live try-it-now functionality, reducing time-to-first-API-call from 2 days to 30 minutes.',
        status: 'Now', priority: 'P1',
        reach: 2800, impact: 2, confidence: 95, effort: 1,
        riceScore: Math.round((2800 * 2 * 0.95) / 1),
        moscow: 'Must', assignee: 'Dave', dueDate: '2026-07-01', linkedDocId: 'doc-8',
      },
      {
        id: 'feat-15',
        title: 'Rate Limit Dashboard',
        description: 'Self-serve dashboard showing per-API-key usage, rate limit headroom, and historical call volume with daily/monthly breakdowns.',
        status: 'Next', priority: 'P2',
        reach: 1400, impact: 2, confidence: 80, effort: 2,
        riceScore: Math.round((1400 * 2 * 0.8) / 2),
        moscow: 'Should', assignee: 'Carol', dueDate: '2026-08-15', linkedDocId: 'doc-8',
      },
      {
        id: 'feat-16',
        title: 'Jira Bidirectional Sync',
        description: 'Sync features and user stories between Prodify and Jira in both directions — changes in either tool propagate automatically.',
        status: 'Next', priority: 'P1',
        reach: 3400, impact: 3, confidence: 60, effort: 5,
        riceScore: Math.round((3400 * 3 * 0.6) / 5),
        moscow: 'Should', assignee: 'Eve', dueDate: '2026-09-01', linkedDocId: null,
      },
      {
        id: 'feat-17',
        title: 'Public API v1 → v2 Migration',
        description: 'Refactor all v1 endpoints to v2 with consistent error codes, improved pagination, and breaking-change deprecation notices.',
        status: 'Done', priority: 'P0',
        reach: 340, impact: 3, confidence: 100, effort: 5,
        riceScore: Math.round((340 * 3 * 1.0) / 5),
        moscow: 'Must', assignee: 'Bob', dueDate: '2026-04-15', linkedDocId: 'doc-8',
      },
      {
        id: 'feat-18',
        title: 'Figma Plugin',
        description: 'Native Figma plugin allowing designers to attach design files and prototypes directly to feature cards in Prodify.',
        status: 'Later', priority: 'P3',
        reach: 1600, impact: 2, confidence: 55, effort: 4,
        riceScore: Math.round((1600 * 2 * 0.55) / 4),
        moscow: 'Could', assignee: '', dueDate: '', linkedDocId: null,
      },
    ],
  })

  // ── Research Insights ──────────────────────────────────────────────
  await prisma.researchInsight.createMany({
    data: [
      // Onboarding insights
      {
        id: 'insight-1',
        theme: 'Onboarding Confusion',
        summary: 'Users struggle to understand the value proposition within the first session, leading to abandonment before completing setup.',
        quotes: JSON.stringify([
          "I didn't really know what to do first.",
          "There were too many options — I just closed it.",
          "I couldn't figure out if it was for me.",
        ]),
        frequency: 14,
        linkedFeatures: JSON.stringify(['feat-1', 'feat-2', 'feat-7']),
      },
      {
        id: 'insight-2',
        theme: 'Email Re-engagement Works',
        summary: 'Users who received a follow-up email within 24 hours of sign-up were 3x more likely to return and complete activation.',
        quotes: JSON.stringify([
          "The reminder email was actually helpful.",
          "I had forgotten about it until I got the email.",
        ]),
        frequency: 9,
        linkedFeatures: JSON.stringify(['feat-3']),
      },
      {
        id: 'insight-3',
        theme: 'Role-based Expectations',
        summary: 'Engineers and designers felt the default onboarding was built for PMs and found many steps irrelevant to their workflow.',
        quotes: JSON.stringify([
          "Half of these steps don't apply to me as a developer.",
          "Why is it asking me about roadmaps? I just want the API docs.",
        ]),
        frequency: 11,
        linkedFeatures: JSON.stringify(['feat-1']),
      },
      // Billing insights
      {
        id: 'insight-4',
        theme: 'Plan Comparison Paralysis',
        summary: 'Users couldn\'t determine which plan was right for their team. Feature comparison tables were too long and filled with jargon, causing 34% to abandon the upgrade flow before selecting a plan.',
        quotes: JSON.stringify([
          "I genuinely couldn't figure out what 'advanced analytics' meant versus 'basic analytics'.",
          "I went back and forth between Pro and Business for 10 minutes and then just gave up.",
          "Just tell me which plan is for a team of 8 people who need integrations. Why is this so hard?",
          "I ended up picking the cheaper one and hoping for the best.",
        ]),
        frequency: 11,
        linkedFeatures: JSON.stringify(['feat-9']),
      },
      {
        id: 'insight-5',
        theme: 'Invoice Accessibility Blocks Finance Teams',
        summary: 'Finance and ops teams cannot process HTML email receipts through standard expense systems. This generates a disproportionate support burden — billing tickets represent 38% of all inbound volume.',
        quotes: JSON.stringify([
          "My finance team won't accept a screenshot of an email as an invoice.",
          "I had to contact support 3 times just to get a proper invoice for Q1.",
          "We're a 200-person company. I can't manually forward emails to accounts payable every month.",
          "A PDF with our company name and VAT number is literally all I need. How is this not a thing yet?",
        ]),
        frequency: 9,
        linkedFeatures: JSON.stringify(['feat-10']),
      },
      {
        id: 'insight-6',
        theme: 'Silent Churn from Failed Payments',
        summary: 'Users who experienced a failed payment received no clear in-app guidance. Several churned silently after losing access without a warning. The lack of a recovery flow is directly costing MRR.',
        quotes: JSON.stringify([
          "I woke up one morning and the tool just wasn't working. No email, nothing.",
          "I assumed it was a bug, not that my card had expired. I just stopped using it.",
          "By the time I realised what happened I'd already moved to another tool.",
        ]),
        frequency: 7,
        linkedFeatures: JSON.stringify(['feat-11']),
      },
      // API insights
      {
        id: 'insight-7',
        theme: 'API Discovery Gap',
        summary: 'Developers building integrations reported spending the majority of their integration time reading source code or contacting support rather than using documentation. The absence of interactive docs is the single biggest barrier to API adoption.',
        quotes: JSON.stringify([
          "I spent 2 days figuring out the auth flow. Interactive docs would have cut that to 20 minutes.",
          "Your API is actually really clean — I just couldn't figure that out from the static docs.",
          "I ended up reading your GitHub issues to understand the pagination model. That's not how it should work.",
          "Every other tool I integrate with has a 'Try it' button. Why doesn't this?",
        ]),
        frequency: 13,
        linkedFeatures: JSON.stringify(['feat-14', 'feat-13']),
      },
      {
        id: 'insight-8',
        theme: 'Webhook Demand from Automation-Heavy Teams',
        summary: 'Enterprise customers with automation workflows are blocked by the absence of webhooks. They are currently polling the API every 60 seconds — inefficient, expensive, and approaching rate limits. Three enterprise deals explicitly list webhooks as a contract requirement.',
        quotes: JSON.stringify([
          "We poll your API every minute to keep our internal tools in sync. That's not sustainable.",
          "Webhooks are table stakes for any B2B SaaS in 2026. We're surprised this isn't there yet.",
          "Our legal team flagged this as a blocker. Without webhooks we can't sign.",
          "We'd double our API spend if you had webhooks — right now we have to over-poll just to stay current.",
        ]),
        frequency: 8,
        linkedFeatures: JSON.stringify(['feat-13']),
      },
    ],
  })

  // ── File Tree ──────────────────────────────────────────────────────
  await prisma.fileNode.create({
    data: {
      id: 'folder-1', name: 'Onboarding Project', type: 'folder',
      parentId: null, children: JSON.stringify(['doc-1', 'doc-2', 'doc-4']), createdAt: now,
    },
  })
  await prisma.fileNode.create({
    data: {
      id: 'folder-2', name: 'Planning', type: 'folder',
      parentId: null, children: JSON.stringify(['doc-3', 'doc-9']), createdAt: now,
    },
  })
  await prisma.fileNode.create({
    data: {
      id: 'folder-3', name: 'Payments & Billing', type: 'folder',
      parentId: null, children: JSON.stringify(['doc-5', 'doc-6', 'doc-7']), createdAt: now,
    },
  })
  await prisma.fileNode.create({
    data: {
      id: 'folder-4', name: 'API & Integrations', type: 'folder',
      parentId: null, children: JSON.stringify(['doc-8']), createdAt: now,
    },
  })
  await prisma.fileNode.createMany({
    data: [
      { id: 'doc-1', name: 'AI-Powered Onboarding Flow — PRD',       type: 'prd',        parentId: 'folder-1', children: '[]', createdAt: now },
      { id: 'doc-2', name: 'User Research: Activation Drop-off',      type: 'research',   parentId: 'folder-1', children: '[]', createdAt: now },
      { id: 'doc-4', name: 'User Story: Onboarding Checklist',        type: 'user-story', parentId: 'folder-1', children: '[]', createdAt: now },
      { id: 'doc-3', name: 'Q2 2026 Roadmap',                         type: 'roadmap',    parentId: 'folder-2', children: '[]', createdAt: now },
      { id: 'doc-9', name: 'Q3 2026 Roadmap',                         type: 'roadmap',    parentId: 'folder-2', children: '[]', createdAt: now },
      { id: 'doc-5', name: 'Subscription Management Overhaul — PRD',  type: 'prd',        parentId: 'folder-3', children: '[]', createdAt: now },
      { id: 'doc-6', name: 'User Research: Payment Friction',         type: 'research',   parentId: 'folder-3', children: '[]', createdAt: now },
      { id: 'doc-7', name: 'User Story: Invoice PDF Export',          type: 'user-story', parentId: 'folder-3', children: '[]', createdAt: now },
      { id: 'doc-8', name: 'Public API v2 — PRD',                     type: 'prd',        parentId: 'folder-4', children: '[]', createdAt: now },
    ],
  })

  console.log('✓ Seed complete')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
