import type { ResearchInsight } from '@/lib/types'

export const mockInsights: ResearchInsight[] = [
  // ── Onboarding ─────────────────────────────────────────────────────
  {
    id: 'insight-1',
    theme: 'Onboarding Confusion',
    summary: 'Users cannot identify the first meaningful action to take. The flat task list gives no sense of priority or role relevance — 14 of 20 participants abandoned setup before reaching their first "aha" moment.',
    quotes: [
      "I didn't really know what to do first. Everything looked equally important.",
      "There were too many options — I just closed it and came back later. Then never did.",
      "I couldn't figure out if it was built for someone like me.",
      "I'm a designer, not a PM. Half these steps felt irrelevant.",
    ],
    frequency: 14,
    linkedFeatures: ['feat-1', 'feat-2', 'feat-7'],
  },
  {
    id: 'insight-2',
    theme: 'Email Re-engagement Works',
    summary: 'Users who received a contextual follow-up email within 24 hours of sign-up were 3× more likely to return and complete activation. The key was specificity — generic "come back!" emails had no effect, but emails referencing the exact step they stopped at worked.',
    quotes: [
      "The reminder email was actually helpful — it told me exactly what I hadn't finished.",
      "I had completely forgotten about it until I got that email.",
      "It felt like the product actually knew where I was. That was impressive.",
    ],
    frequency: 9,
    linkedFeatures: ['feat-3'],
  },
  {
    id: 'insight-3',
    theme: 'Role-Based Expectation Mismatch',
    summary: 'Engineers and designers felt the default onboarding was built exclusively for PMs. Steps like "set up your roadmap" and "define your OKRs" felt irrelevant or presumptuous to non-PM personas, creating an immediate sense that the product wasn\'t for them.',
    quotes: [
      "Half of these steps don't apply to me. I just write code — why is it asking me about roadmaps?",
      "Why is it asking me about OKRs? I just want the API docs.",
      "It assumed I was a product manager from step one. I'm a designer.",
      "I completed the engineering steps in 3 minutes but there were 9 more 'PM steps' I had to skip.",
    ],
    frequency: 11,
    linkedFeatures: ['feat-1'],
  },
  // ── Payments & Billing ─────────────────────────────────────────────
  {
    id: 'insight-4',
    theme: 'Plan Comparison Paralysis',
    summary: 'Users couldn\'t determine which plan was right for their team. Feature comparison tables were too long and filled with jargon, causing 34% to abandon the upgrade flow before selecting a plan.',
    quotes: [
      "I genuinely couldn't figure out what 'advanced analytics' meant versus 'basic analytics'.",
      "I went back and forth between Pro and Business for 10 minutes and then just gave up.",
      "Just tell me which plan is for a team of 8 people who need integrations. Why is this so hard?",
      "I ended up picking the cheaper one and hoping for the best.",
    ],
    frequency: 11,
    linkedFeatures: ['feat-9'],
  },
  {
    id: 'insight-5',
    theme: 'Invoice Accessibility Blocks Finance Teams',
    summary: 'Finance and ops teams cannot process HTML email receipts through standard expense systems. This generates a disproportionate support burden — billing tickets represent 38% of all inbound volume.',
    quotes: [
      "My finance team won't accept a screenshot of an email as an invoice.",
      "I had to contact support 3 times just to get a proper invoice for Q1.",
      "We're a 200-person company. I can't manually forward emails to accounts payable every month.",
      "A PDF with our company name and VAT number is literally all I need. How is this not a thing yet?",
    ],
    frequency: 9,
    linkedFeatures: ['feat-10'],
  },
  {
    id: 'insight-6',
    theme: 'Silent Churn from Failed Payments',
    summary: 'Users who experienced a failed payment received no clear in-app guidance. Several churned silently after losing access without a warning. The lack of a recovery flow is directly costing MRR.',
    quotes: [
      "I woke up one morning and the tool just wasn't working. No email, nothing.",
      "I assumed it was a bug, not that my card had expired. I just stopped using it.",
      "By the time I realised what happened I'd already moved to another tool.",
    ],
    frequency: 7,
    linkedFeatures: ['feat-11'],
  },
  // ── API & Integrations ─────────────────────────────────────────────
  {
    id: 'insight-7',
    theme: 'API Discovery Gap',
    summary: 'Developers building integrations reported spending the majority of their integration time reading source code or contacting support rather than using documentation. The absence of interactive docs is the single biggest barrier to API adoption.',
    quotes: [
      "I spent 2 days figuring out the auth flow. Interactive docs would have cut that to 20 minutes.",
      "Your API is actually really clean — I just couldn't figure that out from the static docs.",
      "I ended up reading your GitHub issues to understand the pagination model. That's not how it should work.",
      "Every other tool I integrate with has a 'Try it' button. Why doesn't this?",
    ],
    frequency: 13,
    linkedFeatures: ['feat-14', 'feat-13'],
  },
  {
    id: 'insight-8',
    theme: 'Webhook Demand from Automation-Heavy Teams',
    summary: 'Enterprise customers with automation workflows are blocked by the absence of webhooks. They are currently polling the API every 60 seconds — inefficient, expensive, and approaching rate limits. Three enterprise deals explicitly list webhooks as a contract requirement.',
    quotes: [
      "We poll your API every minute to keep our internal tools in sync. That's not sustainable.",
      "Webhooks are table stakes for any B2B SaaS in 2026. We're surprised this isn't there yet.",
      "Our legal team flagged this as a blocker. Without webhooks we can't sign.",
      "We'd double our API spend if you had webhooks — right now we have to over-poll just to stay current.",
    ],
    frequency: 8,
    linkedFeatures: ['feat-13'],
  },
]
