import { Persona, PlatformConfig, SimulationTypeId } from '../types/clamir.ts';

export const BUILT_IN_PERSONAS: Persona[] = [
  {
    id: 'persona-experience-seekers',
    name: 'Experience Seekers',
    tagline: 'Prioritizes memorable interactions, emotional resonance, and novel product journeys.',
    description:
      'Experience Seekers evaluate products and services by how intuitive, engaging, and transformative they feel during onboarding and daily use. They are willing to pay a premium when a product removes friction and delivers an elevated user journey.',
    avatarCode: 'ES',
    segment: 'Design & Experience Driven Consumers',
    tags: ['UX Sensitive', 'Early Adopter', 'Premium Willingness', 'Story-Driven'],
    characteristics: [
      'Notices subtle interface and workflow polish immediately',
      'Shares standout product moments with peers and social communities',
      'Abandons utilitarian tools that feel clunky or overly bureaucratic',
    ],
    preferences: [
      'Guided interactive onboarding over dense documentation',
      'Tactile visual feedback and responsive customer support',
      'Clear emotional and lifestyle alignment with brand values',
    ],
    motivations: [
      'Discovering products that elevate daily productivity or enjoyment',
      'Feeling inspired and confident while using modern tools',
      'Avoiding repetitive, dull, or mechanical routines',
    ],
    purchasingBehavior:
      'Makes fast purchase decisions when an interactive demo or free trial creates an immediate "aha" moment. Willing to upgrade tiers for premium service layers.',
    decisionFactors: [
      'First-five-minutes onboarding clarity',
      'Visual and interaction craftsmanship',
      'Peer stories and authentic video walkthroughs',
    ],
    concerns: [
      'Cluttered dashboards or steep, unguided learning curves',
      'Impersonal support and rigid enterprise workflows',
      'Products that over-promise excitement but feel generic in practice',
    ],
    context:
      'Typically evaluates new digital products, consumer apps, hospitality concepts, and creative SaaS workflows on both desktop and mobile.',
    priceSensitivity: 'Low',
    decisionSpeed: 'Fast',
    brandLoyalty: 68,
    isBuiltIn: true,
    isFavorite: true,
  },
  {
    id: 'persona-value-optimizers',
    name: 'Value Optimizers',
    tagline: 'Calculates measurable return on investment, total cost of ownership, and practical utility.',
    description:
      'Value Optimizers scrutinize every pricing tier, feature matrix, and competitor benchmark before committing. They are not merely looking for the cheapest option—they demand clear, quantifiable payoff for every dollar spent.',
    avatarCode: 'VO',
    segment: 'ROI & Cost-Efficiency Evaluators',
    tags: ['ROI Focused', 'Comparison Shopper', 'Unit Economics', 'Pragmatic'],
    characteristics: [
      'Builds side-by-side comparison spreadsheets before buying',
      'Tests free tiers thoroughly to verify core claims',
      'Pushes back strongly against hidden fees or seat-minimum traps',
    ],
    preferences: [
      'Transparent, predictable usage or flat-rate pricing',
      'Self-serve calculators showing time or money saved',
      'Modular plans that scale without forced enterprise bundles',
    ],
    motivations: [
      'Maximizing budget impact across lean teams or households',
      'Eliminating redundant software or recurring subscription waste',
      'Proving clear payback periods to stakeholders',
    ],
    purchasingBehavior:
      'Deliberate evaluation cycle; compares 3–5 alternatives, reads critical reviews, and converts when ROI math is unmistakable.',
    decisionFactors: [
      'Price-to-feature ratio vs. direct competitors',
      'Contract flexibility and cancellation transparency',
      'Quantifiable time or cost savings within 30 days',
    ],
    concerns: [
      'Opaque "Contact Sales" pricing gates for core features',
      'Paywalls around data export or essential integrations',
      'Steep price jumps between starter and growth tiers',
    ],
    context:
      'Common among startup founders, operations leads, finance-conscious buyers, and independent professionals.',
    priceSensitivity: 'Very High',
    decisionSpeed: 'Deliberate',
    brandLoyalty: 42,
    isBuiltIn: true,
    isFavorite: true,
  },
  {
    id: 'persona-brand-loyalists',
    name: 'Brand Loyalists',
    tagline: 'Anchors decisions on institutional trust, proven reputation, and long-term relationship integrity.',
    description:
      'Brand Loyalists form deep attachments to companies that consistently deliver on their promises. Once won over, they have high lifetime retention and defend the brand, but they are skeptical of unproven newcomers.',
    avatarCode: 'BL',
    segment: 'High-Trust & Relationship Advocates',
    tags: ['High Retention', 'Trust-First', 'Ecosystem Buyer', 'Brand Advocate'],
    characteristics: [
      'Stays with trusted vendors across multiple product generations',
      'Values security certifications, founder credibility, and track record',
      'Requires strong proof before switching away from an incumbent brand',
    ],
    preferences: [
      'Dedicated account continuity and familiar design language',
      'Clear product roadmaps and transparent communication',
      'Loyalty recognition and community inclusion',
    ],
    motivations: [
      'Minimizing vendor risk and reputational exposure',
      'Building deep mastery within a single trusted ecosystem',
      'Aligning with respected industry leaders',
    ],
    purchasingBehavior:
      'Slow to switch from existing providers, but converts rapidly to new offerings from brands they already trust or those backed by strong institutional proof.',
    decisionFactors: [
      'Brand longevity, security posture, and customer references',
      'Consistency of customer service and executive transparency',
      'Alignment with existing ecosystem tools',
    ],
    concerns: [
      'Unproven startups that might pivot or shut down',
      'Sudden rebrands or disruptive workflow overhauls',
      'Inconsistent messaging or exaggerated marketing claims',
    ],
    context:
      'Prevalent among mid-market department heads, long-tenured buyers, and consumers who buy into complete brand ecosystems.',
    priceSensitivity: 'Low',
    decisionSpeed: 'Slow',
    brandLoyalty: 94,
    isBuiltIn: true,
    isFavorite: false,
  },
  {
    id: 'persona-habit-loyalists',
    name: 'Habit Loyalists',
    tagline: 'Prefers familiar workflows and resists high switching costs or cognitive retraining.',
    description:
      'Habit Loyalists stick with what already works in their daily routine. Even if an incumbent tool is imperfect, they will only adopt a new product if migration is effortless and familiar mental models are preserved.',
    avatarCode: 'HL',
    segment: 'Routine-Anchored & Low-Friction Users',
    tags: ['Switching Cost Averse', 'Routine Driven', 'Low Churn', 'Pragmatic'],
    characteristics: [
      'Relies on muscle memory and established daily checklists',
      'Views software migrations and retraining as major disruptions',
      'Prefers incremental improvements over radical paradigm shifts',
    ],
    preferences: [
      'One-click import from existing tools (CSV, Notion, Excel, etc.)',
      'Familiar terminology and standard keyboard shortcuts',
      'Zero-downtime transition paths',
    ],
    motivations: [
      'Maintaining predictable daily output without surprises',
      'Avoiding team confusion or workflow downtime',
      'Keeping tools reliable and invisible',
    ],
    purchasingBehavior:
      'Resists outbound pitches; adopts new products only when an existing workflow breaks or when a new tool mirrors their current habits with zero setup friction.',
    decisionFactors: [
      'Ease of data migration and setup time under 10 minutes',
      'Similarity to familiar industry-standard interfaces',
      'Availability of clear step-by-step transition guides',
    ],
    concerns: [
      'Losing historical data or custom templates during migration',
      'Having to retrain team members on unfamiliar concepts',
      'Frequent UI redesigns that move core buttons around',
    ],
    context:
      'Represented across administrative teams, established SMB operators, and everyday consumers with entrenched daily habits.',
    priceSensitivity: 'Moderate',
    decisionSpeed: 'Slow',
    brandLoyalty: 85,
    isBuiltIn: true,
    isFavorite: false,
  },
  {
    id: 'persona-trend-followers',
    name: 'Trend Followers',
    tagline: 'Drawn to cultural momentum, emerging technology waves, and social validation.',
    description:
      'Trend Followers actively track product launches, creator recommendations, and industry shifts. They love being first in their network to adopt visibly modern tools, though their retention depends on sustained novelty.',
    avatarCode: 'TF',
    segment: 'Momentum & Social-Proof Early Adopters',
    tags: ['Launch Enthusiast', 'Social Proof', 'Fast Trial', 'Viral Growth'],
    characteristics: [
      'Discovers products through social feeds, launch platforms, and newsletters',
      'Responds strongly to modern positioning and crisp visual identity',
      'Quick to sign up, test, and post initial reactions publicly',
    ],
    preferences: [
      'Shareable outputs, badges, or collaborative workspaces',
      'Fast sign-up with immediate access to flagship capabilities',
      'Frequent feature drops and visible community momentum',
    ],
    motivations: [
      'Staying ahead of industry peers and market shifts',
      'Signaling innovation and modern taste to clients or colleagues',
      'Experimenting with next-generation workflows',
    ],
    purchasingBehavior:
      'Instant impulse trials when social proof is high; upgrades quickly during launch promos but may churn if product velocity stalls.',
    decisionFactors: [
      'Visible industry buzz and peer endorsements',
      'Modern aesthetic and shareable artifacts',
      'Frictionless instant access without waitlists',
    ],
    concerns: [
      'Outdated legacy interfaces that look like 2015 software',
      'Slow onboarding or manual approval gates',
      'Products that lack community energy or visible updates',
    ],
    context:
      'Found among growth marketers, digital creators, tech-forward founders, and Gen-Z/Millennial consumer segments.',
    priceSensitivity: 'Moderate',
    decisionSpeed: 'Instant',
    brandLoyalty: 34,
    isBuiltIn: true,
    isFavorite: false,
  },
  {
    id: 'persona-quality-seekers',
    name: 'Quality Seekers',
    tagline: 'Demands rigorous accuracy, depth of craftsmanship, reliability, and technical excellence.',
    description:
      'Quality Seekers inspect what happens under the hood. They test edge cases, audit methodology, and care deeply about durability, precision, and data integrity over superficial marketing polish.',
    avatarCode: 'QS',
    segment: 'High-Precision & Craftsmanship Buyers',
    tags: ['Methodology Rigor', 'High Standards', 'Detail Oriented', 'Depth First'],
    characteristics: [
      'Reads technical documentation, methodology notes, and benchmarks',
      'Tests accuracy, latency, and edge-case reliability before committing',
      'Willing to pay top tier when quality is demonstrably superior',
    ],
    preferences: [
      'Transparent methodology and confidence intervals',
      'Granular controls, raw data exports, and auditability',
      'Direct access to knowledgeable product specialists',
    ],
    motivations: [
      'Producing defensible, high-caliber work without compromises',
      'Eliminating errors, hallucinations, or shallow outputs',
      'Investing in durable tools built to rigorous standards',
    ],
    purchasingBehavior:
      'Deliberate, evidence-based evaluation. Runs deep benchmarks using real-world problems before approving team-wide adoption.',
    decisionFactors: [
      'Output depth, accuracy, and methodological transparency',
      'System reliability, security, and export fidelity',
      'Depth of customization and power-user controls',
    ],
    concerns: [
      'Superficial "black-box" summaries without underlying reasoning',
      'Data inaccuracies or unverified claims',
      'Lack of fine-grained control over parameters',
    ],
    context:
      'Includes user researchers, product leads, engineers, analysts, and discerning consumers of flagship hardware/software.',
    priceSensitivity: 'Low',
    decisionSpeed: 'Deliberate',
    brandLoyalty: 78,
    isBuiltIn: true,
    isFavorite: true,
  },
  {
    id: 'persona-convenience-seekers',
    name: 'Convenience Seekers',
    tagline: 'Optimizes for speed-to-outcome, minimal clicks, and effortless automation.',
    description:
      'Convenience Seekers are time-poor decision makers who want the fastest path from question to finished deliverable. Every extra form field, configuration step, or manual export reduces their likelihood to convert.',
    avatarCode: 'CS',
    segment: 'Time-Constrained & Speed-First Users',
    tags: ['Time Poor', 'Turnkey Templates', 'Zero Setup', 'Mobile Ready'],
    characteristics: [
      'Values pre-built templates and smart defaults above customizability',
      'Uses tools on the go between meetings on laptop and mobile',
      'Judges software by how many minutes it saves today',
    ],
    preferences: [
      'Ready-to-run templates and one-click executive summaries',
      'Clean, uncluttered interfaces with clear primary actions',
      'Automated formatting and instant PDF/slide-ready exports',
    ],
    motivations: [
      'Getting reliable answers in minutes rather than weeks',
      'Clearing bottlenecks so they can move to the next decision',
      'Reducing cognitive load across busy workdays',
    ],
    purchasingBehavior:
      'Fast conversion when a product solves an immediate pain point in under 3 minutes with zero configuration required.',
    decisionFactors: [
      'Time to first actionable result',
      'Quality of built-in templates and presets',
      'Simplicity of sharing results with stakeholders',
    ],
    concerns: [
      'Lengthy multi-page setup wizards without smart defaults',
      'Having to clean up or format outputs manually',
      'Slow processing times without clear status indicators',
    ],
    context:
      'Busy executives, solo founders, agency account leads, and everyday consumers prioritizing speed and simplicity.',
    priceSensitivity: 'Moderate',
    decisionSpeed: 'Instant',
    brandLoyalty: 55,
    isBuiltIn: true,
    isFavorite: false,
  },
];

export const SIMULATION_TYPES_META: {
  id: SimulationTypeId;
  name: string;
  shortName: string;
  description: string;
  defaultHypothesis: string;
  defaultObjectives: string;
  starterQuestions: { text: string; type: 'single_choice' | 'multiple_choice' | 'free_response' | 'rating_scale' | 'yes_no'; options: string[] }[];
}[] = [
  {
    id: 'test_idea',
    name: 'Test an Idea',
    shortName: 'Idea Validation',
    description: 'Validate new product concepts, value propositions, and problem-solution fit across target personas.',
    defaultHypothesis: 'Target customers experience enough friction in their current workflow to adopt this new solution within 30 days.',
    defaultObjectives: 'Measure initial comprehension, perceived value, key adoption barriers, and willingness to trial.',
    starterQuestions: [
      {
        text: 'How clearly do you understand what this product does and who it is for?',
        type: 'rating_scale',
        options: ['1 - Unclear', '2', '3', '4', '5 - Completely Clear'],
      },
      {
        text: 'Would this concept solve a meaningful problem in your current workflow or life?',
        type: 'single_choice',
        options: ['Yes, immediately', 'Somewhat useful', 'Not a priority right now', 'No, already solved'],
      },
      {
        text: 'What is your biggest hesitation or objection before trying this idea?',
        type: 'free_response',
        options: [],
      },
    ],
  },
  {
    id: 'ab_testing',
    name: 'A/B Testing',
    shortName: 'A/B Comparison',
    description: 'Compare two positioning angles, feature bundles, campaigns, or design directions head-to-head.',
    defaultHypothesis: 'Option B will achieve higher preference among ROI-focused segments due to clearer outcome framing.',
    defaultObjectives: 'Compare preference split, perceived strengths and weaknesses of Option A vs Option B, and segment alignment.',
    starterQuestions: [
      {
        text: 'Between Option A and Option B, which option makes you more likely to take action?',
        type: 'single_choice',
        options: ['Strongly prefer Option A', 'Slightly prefer Option A', 'Slightly prefer Option B', 'Strongly prefer Option B'],
      },
      {
        text: 'What specific detail made your preferred option stand out?',
        type: 'free_response',
        options: [],
      },
      {
        text: 'Rate your trust in the messaging of both options.',
        type: 'rating_scale',
        options: ['1 - Low Trust', '2', '3', '4', '5 - High Trust'],
      },
    ],
  },
  {
    id: 'market_exploration',
    name: 'Market Exploration',
    shortName: 'Market Research',
    description: 'Uncover unmet needs, switching triggers, and whitespace opportunities in a target industry.',
    defaultHypothesis: 'Buyers in this market are underserved by legacy tools that require manual setup and lack transparent pricing.',
    defaultObjectives: 'Identify top unmet needs, current workarounds, budget expectations, and switching catalysts.',
    starterQuestions: [
      {
        text: 'What is the most frustrating part of how you currently handle this category?',
        type: 'free_response',
        options: [],
      },
      {
        text: 'Which factors matter most when evaluating a new provider in this market?',
        type: 'multiple_choice',
        options: ['Transparent pricing', 'Speed of setup', 'Depth of accuracy', 'Brand reputation', 'Integration ecosystem'],
      },
    ],
  },
  {
    id: 'usability_analysis',
    name: 'Usability Analysis',
    shortName: 'UX & Flow Audit',
    description: 'Simulate how different personas navigate a website URL, onboarding flow, or specific user task.',
    defaultHypothesis: 'First-time visitors can identify the core call-to-action and complete the primary task without confusion.',
    defaultObjectives: 'Evaluate clarity of navigation, friction points in task completion, and cognitive load across personas.',
    starterQuestions: [
      {
        text: 'How easy is it to figure out the first step required to complete the user task?',
        type: 'rating_scale',
        options: ['1 - Very Difficult', '2', '3', '4', '5 - Effortless'],
      },
      {
        text: 'Where would you hesitate, feel confused, or consider dropping off during this flow?',
        type: 'free_response',
        options: [],
      },
    ],
  },
  {
    id: 'pricing_analysis',
    name: 'Pricing Analysis',
    shortName: 'Pricing & Tiers',
    description: 'Test price elasticity, tier packaging, feature gating, and willingness to pay across customer segments.',
    defaultHypothesis: 'The middle Growth tier offers the strongest perceived value while maintaining healthy margin conversion.',
    defaultObjectives: 'Evaluate price sensitivity, tier selection distribution, and objections to specific price points.',
    starterQuestions: [
      {
        text: 'Which pricing tier best matches your needs and budget expectations?',
        type: 'single_choice',
        options: ['Starter / Free Tier', 'Core / Growth Tier', 'Enterprise / Pro Tier', 'None — price is too high'],
      },
      {
        text: 'At what price point would this offering feel too expensive to justify?',
        type: 'free_response',
        options: [],
      },
      {
        text: 'How fair and transparent does the tier structure feel?',
        type: 'rating_scale',
        options: ['1 - Unfair', '2', '3', '4', '5 - Very Fair'],
      },
    ],
  },
  {
    id: 'customer_analysis',
    name: 'Customer Analysis',
    shortName: 'Segment Deep-Dive',
    description: 'Profile a specific buyer segment to understand their motivations, buying triggers, and objections.',
    defaultHypothesis: 'This segment prioritizes speed-to-value and peer proof over exhaustive enterprise feature checklists.',
    defaultObjectives: 'Map core buyer motivations, internal approval hurdles, and high-converting messaging hooks.',
    starterQuestions: [
      {
        text: 'What triggers you to actively search for a solution like this?',
        type: 'free_response',
        options: [],
      },
      {
        text: 'Who else is involved in approving a purchase like this in your organization or household?',
        type: 'single_choice',
        options: ['Sole decision maker', 'Co-founder or partner', 'Department manager', 'Procurement / IT review'],
      },
    ],
  },
  {
    id: 'custom_simulation',
    name: 'Custom Simulation',
    shortName: 'Custom Research',
    description: 'Design a bespoke simulation with custom form fields, proprietary criteria, and tailored question batteries.',
    defaultHypothesis: 'Custom research variables will reveal distinct behavioral differences between convenience-driven and quality-driven personas.',
    defaultObjectives: 'Evaluate custom scenario parameters and synthesize structured persona comparisons.',
    starterQuestions: [
      {
        text: 'What is your overall reaction to the scenario described above?',
        type: 'free_response',
        options: [],
      },
      {
        text: 'Would you recommend this approach to a colleague or peer?',
        type: 'yes_no',
        options: ['Yes', 'No'],
      },
    ],
  },
];

export const INITIAL_PLATFORM_CONFIG: PlatformConfig = {
  pricingPlans: [
    {
      id: 'Explorer',
      name: 'Explorer',
      priceLabel: 'Free',
      billingPeriod: 'forever',
      audienceTag: 'For individuals, teams & new researchers',
      description: 'Validate product ideas, create custom audiences, and access full Accounts & Reports.',
      features: [
        'Core simulations (up to 10 runs/month)',
        'Custom target audience & persona creation',
        'Full Accounts & Reports workspace access',
        'Downloadable PDF, JSON, CSV & TXT reports',
        'Context & AI Research Agent access',
      ],
      simulationsLimit: 10,
    },
    {
      id: 'Growth',
      name: 'Growth',
      priceLabel: '$149',
      billingPeriod: '/month',
      audienceTag: 'For scaling product, marketing & insights teams',
      description: 'Unlimited audience intelligence, multi-persona comparisons, and live web-grounded research.',
      features: [
        'Unlimited monthly simulations',
        'Full custom audience & persona library',
        'Full Accounts & Reports with batch exports',
        'AI Research Agent with live Web Search grounding',
        'Multi-option A/B & pricing elasticity matrices',
      ],
      simulationsLimit: 500,
    },
    {
      id: 'Enterprise',
      name: 'Enterprise',
      priceLabel: 'Custom',
      billingPeriod: 'annual billing',
      audienceTag: 'For global organizations & research agencies',
      description: 'Dedicated simulation throughput, multi-workspace governance, and bespoke segment calibration.',
      features: [
        'Custom usage limits & dedicated concurrency',
        'Multi-workspace team access & role controls',
        'Bespoke industry audience calibration',
        'Advanced API & data warehouse integrations',
        'Dedicated enterprise research strategist',
      ],
      simulationsLimit: 10000,
    },
  ],
  allowWebSearch: true,
  defaultAgentsPerPersona: 5,
  updatedAt: '2026-11-14T22:15:00Z',
};
