import { Persona, PlatformConfig, Simulation, SimulationTypeId } from '../types/clamir.ts';

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

export const INITIAL_SAMPLE_SIMULATIONS: Simulation[] = [
  {
    id: 'sim-sample-pricing-01',
    workspaceId: 'ws-default',
    name: 'Clamir Studio Pro — Usage vs. Seat Pricing Analysis',
    type: 'pricing_analysis',
    description:
      'Evaluating customer response to a three-tier SaaS pricing model ($0 Starter, $149 Growth flat-rate, Custom Enterprise) versus per-seat billing for a B2B product analytics workflow.',
    hypothesis:
      'Value Optimizers and Convenience Seekers will strongly prefer predictable flat-rate workspace pricing ($149/mo) over per-seat charges that penalize team collaboration.',
    researchContext:
      'Pre-launch pricing calibration for Q4 product release targeting startup founders, product managers, and UX researchers.',
    targetAudience: 'B2B SaaS Founders, Product Managers, and Consumer Insights Teams',
    researchObjectives:
      'Identify optimal price anchor for Growth tier, test resistance to $149/mo price point, and uncover must-have features in the Free Explorer tier.',
    typeSpecificData: {
      currency: 'USD ($)',
      pricingTiers: [
        {
          id: 't1',
          name: 'Explorer',
          price: '$0',
          billingCycle: 'monthly',
          features: '5 simulations/mo, 7 built-in personas, standard summary view',
        },
        {
          id: 't2',
          name: 'Growth',
          price: '$149',
          billingCycle: 'monthly',
          features: 'Unlimited simulations, custom personas, AI Agent + Web Search, PDF/CSV/JSON exports',
        },
        {
          id: 't3',
          name: 'Enterprise',
          price: 'Custom',
          billingCycle: 'annual',
          features: 'Unlimited workspaces, SSO, custom calibration, API access',
        },
      ],
    },
    materials: [
      {
        id: 'mat-1',
        kind: 'file',
        name: 'Q4_Pricing_Deck_Summary.md',
        fileType: 'MD',
        sizeBytes: 4280,
        extractedContent:
          'Competitor benchmark shows legacy research panels charge $2,500+ per study with 2-week turnaround. Flat-rate $149/mo unlimited simulation model positions Clamir as an everyday decision tool.',
        addedAt: '2026-11-12T10:15:00Z',
      },
    ],
    questions: [
      {
        id: 'q-1',
        text: 'Which pricing tier best matches your workflow and budget expectations?',
        type: 'single_choice',
        required: true,
        options: ['Explorer ($0)', 'Growth ($149/mo)', 'Enterprise (Custom)', 'None — price is too high'],
      },
      {
        id: 'q-2',
        text: 'How do you feel about flat-rate workspace pricing ($149/mo) compared to per-seat pricing ($39/user/mo)?',
        type: 'free_response',
        required: true,
        options: [],
      },
      {
        id: 'q-3',
        text: 'Rate the perceived value of the Growth tier at $149/month.',
        type: 'rating_scale',
        required: true,
        options: ['1 - Poor Value', '2', '3', '4', '5 - Exceptional Value'],
      },
    ],
    selectedPersonas: [
      { personaId: 'persona-value-optimizers', personaName: 'Value Optimizers', agentCount: 10 },
      { personaId: 'persona-quality-seekers', personaName: 'Quality Seekers', agentCount: 10 },
      { personaId: 'persona-convenience-seekers', personaName: 'Convenience Seekers', agentCount: 10 },
      { personaId: 'persona-experience-seekers', personaName: 'Experience Seekers', agentCount: 5 },
    ],
    status: 'Completed',
    stage: 'Completed',
    progress: 100,
    startedAt: '2026-11-12T10:20:00Z',
    completedAt: '2026-11-12T10:21:15Z',
    estimatedSecondsRemaining: 0,
    isSample: true,
    results: {
      simulationNotice:
        'SIMULATED FEEDBACK NOTICE: All responses, scores, and statements below are AI-generated audience simulations produced by Clamir Engine and do not represent actual human survey respondents.',
      aiEngineMode: 'simulated-engine',
      generatedAt: '2026-11-12T10:21:15Z',
      executiveSummary: {
        mainFinding:
          '78% of simulated personas favored the flat-rate workspace model over per-seat pricing, with strong conversion intent on the $149/mo Growth tier when positioned against traditional $2,500+ research panels.',
        overallReaction:
          'Broadly positive reception across Quality Seekers (88/100 acceptance) and Convenience Seekers (82/100), while Value Optimizers requested a mid-tier bridge or annual discount option before committing to $149/mo.',
        importantOpportunities: [
          'Highlight cost comparison against traditional consumer research panels directly on the pricing card',
          'Include 1 sample PDF export in the Free Explorer tier so Value Optimizers can verify deliverable quality before upgrading',
          'Offer a 20% annual billing discount ($119/mo equivalent) to accelerate budget approval',
        ],
        mainConcerns: [
          'Jump from $0 Explorer to $149/mo Growth feels steep for solo founders running only 6–8 simulations per month',
          'Quality Seekers want explicit clarity on how custom persona calibration differs between Growth and Enterprise',
        ],
      },
      sentimentOverview: {
        positive: 72,
        neutral: 19,
        negative: 9,
      },
      audiencePreferences: [
        {
          label: 'Flat-rate workspace billing (no per-seat penalty)',
          score: 89,
          detail: 'Strong preference across all four personas to invite team viewers without incremental seat charges.',
        },
        {
          label: 'Instant PDF & CSV research deliverable exports',
          score: 84,
          detail: 'Rated as the #1 trigger for upgrading from Explorer to Growth.',
        },
        {
          label: 'Custom Persona Builder inclusion in Growth tier',
          score: 79,
          detail: 'Quality Seekers view custom persona creation as essential for domain-specific accuracy.',
        },
      ],
      objectionsAndConcerns: [
        {
          objection: 'Gap between $0 Free tier and $149/mo Growth tier for occasional solo users',
          severity: 'High',
          frequencyPct: 38,
          mitigation: 'Allow Explorer users to purchase single on-demand simulation packs or unlock 1 full PDF report trial.',
        },
        {
          objection: 'Ambiguity around AI agent usage limits on the Free Explorer plan',
          severity: 'Medium',
          frequencyPct: 24,
          mitigation: 'State exact monthly message count (e.g., 25 AI Agent queries/month) instead of "Limited usage".',
        },
      ],
      opportunities: [
        {
          title: 'ROI Anchor Comparison Block',
          impact: 'High',
          description: 'Framing $149/mo against a single $2,500 agency focus group increases simulated Value Optimizer acceptance by +22 points.',
        },
        {
          title: 'Sample Export Preview in Free Tier',
          impact: 'High',
          description: 'Allowing free users to preview a watermarked PDF brief removes uncertainty about deliverable depth.',
        },
      ],
      personaBreakdown: [
        {
          personaId: 'persona-value-optimizers',
          personaName: 'Value Optimizers',
          segment: 'ROI & Cost-Efficiency Evaluators',
          agentCount: 10,
          overallReaction: 'Mixed',
          acceptanceScore: 69,
          mainTakeaway:
            'Appreciates unlimited simulations and zero per-seat fees, but scrutinizes the $0 to $149 step-up unless anchored against agency research costs.',
          simulatedStatement:
            'If this replaces even one external survey panel a quarter, $149/month pays for itself ten times over, though I want to inspect one full export on the free plan before putting down a corporate card.',
          answers: [
            {
              questionId: 'q-1',
              questionText: 'Which pricing tier best matches your workflow and budget expectations?',
              answer: 'Explorer ($0) initially, converting to Growth ($149/mo) after validating export quality.',
            },
            {
              questionId: 'q-2',
              questionText: 'How do you feel about flat-rate workspace pricing ($149/mo) compared to per-seat pricing ($39/user/mo)?',
              answer: 'Strongly prefer flat-rate workspace billing; per-seat pricing discourages sharing findings with engineering and marketing leads.',
            },
            {
              questionId: 'q-3',
              questionText: 'Rate the perceived value of the Growth tier at $149/month.',
              answer: '4 / 5 — Strong value once unlimited runs and custom personas are factored in.',
            },
          ],
          reasoning:
            'Evaluates unit cost per simulation run. At 15 simulations/month, $9.93 per study is highly competitive, provided there are no hidden export paywalls.',
          motivations: ['Predictable monthly software spend', 'Sharing reports across team without seat tax'],
          objections: ['Wants exact numeric caps stated on Explorer tier', 'Prefers an annual discount option'],
          confidenceScore: 87,
          uncertaintyNote: 'Simulated conversion depends on whether user runs more than 4 studies per month.',
        },
        {
          personaId: 'persona-quality-seekers',
          personaName: 'Quality Seekers',
          segment: 'High-Precision & Craftsmanship Buyers',
          agentCount: 10,
          overallReaction: 'Positive',
          acceptanceScore: 88,
          mainTakeaway:
            'Views $149/mo as well-justified because it unlocks the Custom Persona library, Web Search grounding, and structured JSON/CSV exports.',
          simulatedStatement:
            'The price is secondary to methodological rigor. Having full access to custom persona attributes and raw JSON/CSV data in the Growth tier makes $149 an easy decision.',
          answers: [
            {
              questionId: 'q-1',
              questionText: 'Which pricing tier best matches your workflow and budget expectations?',
              answer: 'Growth ($149/mo)',
            },
            {
              questionId: 'q-2',
              questionText: 'How do you feel about flat-rate workspace pricing ($149/mo) compared to per-seat pricing ($39/user/mo)?',
              answer: 'Flat-rate is cleaner and allows cross-functional peer review of simulation hypotheses.',
            },
            {
              questionId: 'q-3',
              questionText: 'Rate the perceived value of the Growth tier at $149/month.',
              answer: '5 / 5 — High value for research teams.',
            },
          ],
          reasoning:
            'Prioritizes custom persona granularity and raw data export formats over entry-level price discounts.',
          motivations: ['Granular control over persona attributes', 'Verifiable citations in AI Agent Web Search'],
          objections: ['Wants documentation on confidence scoring methodology'],
          confidenceScore: 91,
          uncertaintyNote: 'High alignment with product capabilities.',
        },
        {
          personaId: 'persona-convenience-seekers',
          personaName: 'Convenience Seekers',
          segment: 'Time-Constrained & Speed-First Users',
          agentCount: 10,
          overallReaction: 'Positive',
          acceptanceScore: 82,
          mainTakeaway:
            'Converts quickly for one-click PDF executive briefs and ready-to-use persona presets that save hours of manual research prep.',
          simulatedStatement:
            'If I can walk into a Monday product review with a downloadable PDF brief in five minutes, $149/month is a no-brainer.',
          answers: [
            {
              questionId: 'q-1',
              questionText: 'Which pricing tier best matches your workflow and budget expectations?',
              answer: 'Growth ($149/mo)',
            },
            {
              questionId: 'q-2',
              questionText: 'How do you feel about flat-rate workspace pricing ($149/mo) compared to per-seat pricing ($39/user/mo)?',
              answer: 'Much simpler—no need to calculate seats or manage licenses.',
            },
            {
              questionId: 'q-3',
              questionText: 'Rate the perceived value of the Growth tier at $149/month.',
              answer: '4 / 5 — Great time-saver.',
            },
          ],
          reasoning: 'Driven by speed-to-deliverable and zero procurement friction.',
          motivations: ['Instant executive-ready PDF reports', 'Pre-built simulation templates'],
          objections: ['Does not want complex setup steps before running first test'],
          confidenceScore: 85,
          uncertaintyNote: 'Low variance across simulated agents.',
        },
      ],
      recommendations: [
        {
          id: 'rec-1',
          priority: 'High',
          title: 'State explicit numerical quotas on the Explorer Free card',
          explanation:
            'Replace vague "Limited AI agent usage" copy with a concrete allowance (e.g., "5 simulations & 25 AI Agent queries/mo") to build immediate trust with Value Optimizers.',
          expectedImpact: '+18% simulated free-to-paid evaluation trust',
        },
        {
          id: 'rec-2',
          priority: 'High',
          title: 'Include 1 sample full-fidelity PDF report download on Explorer',
          explanation:
            'Letting prospective buyers inspect a real exported brief eliminates deliverable uncertainty prior to the $149/mo upgrade.',
          expectedImpact: '+24% simulated Growth tier conversion rate',
        },
        {
          id: 'rec-3',
          priority: 'Medium',
          title: 'Add an Annual Billing toggle with a 15–20% savings incentive',
          explanation:
            'Finance-conscious teams and Brand Loyalists prefer annual predictability when onboarding a core research platform.',
          expectedImpact: 'Higher simulated LTV and lower quarterly churn',
        },
      ],
    },
  },
  {
    id: 'sim-sample-ab-02',
    workspaceId: 'ws-default',
    name: 'Landing Hero Messaging A/B Test: Speed vs. Risk Reduction',
    type: 'ab_testing',
    description:
      'Comparing two hero value propositions for an AI consumer intelligence launch: Option A focuses on "10x Faster Audience Research in Minutes" while Option B focuses on "Understand Your Audience Before Making Your Move."',
    hypothesis:
      'Option B ("Understand Your Audience Before Making Your Move") will outperform Option A across Quality Seekers and Brand Loyalists by emphasizing decision confidence rather than raw speed hype.',
    researchContext: 'Website homepage hero copy optimization for B2B founders and product leaders.',
    targetAudience: 'Founders, Product Managers, Growth Marketers, and UX Researchers',
    researchObjectives:
      'Determine winning headline direction, evaluate credibility perception, and measure segment-by-segment preference.',
    typeSpecificData: {
      optionADescription:
        'Option A (Speed Angle): "Run 10x Faster Customer Research in 60 Seconds. Replace slow surveys with instant AI answers."',
      optionBDescription:
        'Option B (Decision Clarity Angle): "Understand Your Audience Before Making Your Move. Simulate customer reactions, test ideas, explore pricing, and discover opportunities with AI-powered audience intelligence."',
      comparisonCriteria: 'Credibility, clarity of value proposition, emotional resonance, and click-through intent.',
    },
    materials: [],
    questions: [
      {
        id: 'q-ab-1',
        text: 'Which headline and description makes you trust the platform more?',
        type: 'single_choice',
        required: true,
        options: ['Option A (Speed Angle)', 'Option B (Decision Clarity Angle)'],
      },
      {
        id: 'q-ab-2',
        text: 'Explain why you chose your preferred option and what impression the other option gave you.',
        type: 'free_response',
        required: true,
        options: [],
      },
    ],
    selectedPersonas: [
      { personaId: 'persona-quality-seekers', personaName: 'Quality Seekers', agentCount: 10 },
      { personaId: 'persona-brand-loyalists', personaName: 'Brand Loyalists', agentCount: 10 },
      { personaId: 'persona-experience-seekers', personaName: 'Experience Seekers', agentCount: 10 },
      { personaId: 'persona-convenience-seekers', personaName: 'Convenience Seekers', agentCount: 10 },
    ],
    status: 'Completed',
    stage: 'Completed',
    progress: 100,
    startedAt: '2026-11-13T14:00:00Z',
    completedAt: '2026-11-13T14:01:10Z',
    estimatedSecondsRemaining: 0,
    isSample: true,
    results: {
      simulationNotice:
        'SIMULATED FEEDBACK NOTICE: All responses, scores, and statements below are AI-generated audience simulations produced by Clamir Engine and do not represent actual human survey respondents.',
      aiEngineMode: 'simulated-engine',
      generatedAt: '2026-11-13T14:01:10Z',
      executiveSummary: {
        mainFinding:
          'Option B ("Understand Your Audience Before Making Your Move") won decisively with a 76% simulated preference score vs. 24% for Option A.',
        overallReaction:
          'Simulated personas perceived Option B as strategic, trustworthy, and transparent, whereas Option A triggered skepticism about superficial "60-second AI hype" among Quality Seekers and Brand Loyalists.',
        importantOpportunities: [
          'Lead with Option B as the primary hero headline while weaving speed-to-insight into the secondary How It Works steps',
          'Explicitly label outputs as simulated audience intelligence to reinforce methodological honesty',
        ],
        mainConcerns: [
          'Option A alienated researchers who felt "Replace surveys in 60 seconds" sounded like generic AI exaggeration',
        ],
      },
      sentimentOverview: {
        positive: 79,
        neutral: 14,
        negative: 7,
      },
      audiencePreferences: [
        {
          label: 'Strategic decision-making framing (Option B)',
          score: 86,
          detail: 'Resonates with high-stakes business decisions like pricing, positioning, and product launches.',
        },
        {
          label: 'Concrete capability list (ideas, pricing, opportunities)',
          score: 81,
          detail: 'Helps visitors immediately picture what they can simulate on day one.',
        },
      ],
      objectionsAndConcerns: [
        {
          objection: 'Skepticism toward "10x faster in 60 seconds" hype claims in Option A',
          severity: 'High',
          frequencyPct: 68,
          mitigation: 'Avoid hyperbolic multipliers in top-level headlines; demonstrate speed through an interactive live demo instead.',
        },
      ],
      opportunities: [
        {
          title: 'Pair Option B Headline with Interactive Live Demo',
          impact: 'High',
          description: 'Satisfies both Quality Seekers (who want depth) and Convenience Seekers (who experience the speed firsthand).',
        },
      ],
      abComparison: {
        optionALabel: 'Option A: 10x Faster Research in 60s',
        optionBLabel: 'Option B: Understand Your Audience Before Making Your Move',
        optionAScore: 58,
        optionBScore: 87,
        optionAStrengths: [
          'Immediately communicates speed and low time commitment',
          'Appeals to time-strapped Convenience Seekers scanning quickly',
        ],
        optionAWeaknesses: [
          'Sounds like generic AI marketing hyperbole ("10x in 60 seconds")',
          'Triggers distrust among researchers and executives who care about rigor',
        ],
        optionBStrengths: [
          'Frames the product around high-value strategic outcomes and risk reduction',
          'Clearly enumerates concrete use cases (ideas, pricing, opportunities)',
          'Builds institutional trust and authority',
        ],
        optionBWeaknesses: [
          'Slightly longer description requires clean typographic hierarchy',
        ],
        personaPreferences: [
          {
            personaName: 'Quality Seekers',
            preferredOption: 'Option B',
            rationale: 'Option B respects the complexity of audience intelligence and avoids exaggerated speed claims.',
          },
          {
            personaName: 'Brand Loyalists',
            preferredOption: 'Option B',
            rationale: 'Sounds like an authoritative, dependable enterprise software partner.',
          },
          {
            personaName: 'Experience Seekers',
            preferredOption: 'Option B',
            rationale: 'More inspiring and human-centric framing.',
          },
          {
            personaName: 'Convenience Seekers',
            preferredOption: 'Option A',
            rationale: 'Liked the explicit 60-second promise, though still rated Option B highly for clarity.',
          },
        ],
        overallVerdict:
          'Deploy Option B ("Understand Your Audience Before Making Your Move") as the flagship hero lockup. Capture Option A’s speed advantage implicitly via the interactive demo.',
      },
      personaBreakdown: [
        {
          personaId: 'persona-quality-seekers',
          personaName: 'Quality Seekers',
          segment: 'High-Precision & Craftsmanship Buyers',
          agentCount: 10,
          overallReaction: 'Positive',
          acceptanceScore: 91,
          mainTakeaway: 'Strongly endorses Option B for its grounded, strategic tone.',
          simulatedStatement:
            'Option B speaks to actual product strategy—testing pricing and reactions before committing capital. Option A sounds like another disposable wrapper.',
          answers: [
            {
              questionId: 'q-ab-1',
              questionText: 'Which headline and description makes you trust the platform more?',
              answer: 'Option B (Decision Clarity Angle)',
            },
            {
              questionId: 'q-ab-2',
              questionText: 'Explain why you chose your preferred option and what impression the other option gave you.',
              answer: 'Option B specifies concrete research domains (ideas, pricing, opportunities) without over-promising.',
            },
          ],
          reasoning: 'Associates restrained, specific language with higher underlying model quality.',
          motivations: ['Decision accuracy', 'Methodological transparency'],
          objections: ['Dislikes "10x" marketing clichés'],
          confidenceScore: 93,
          uncertaintyNote: 'Very high consensus across simulated agents.',
        },
        {
          personaId: 'persona-convenience-seekers',
          personaName: 'Convenience Seekers',
          agentCount: 10,
          segment: 'Time-Constrained & Speed-First Users',
          overallReaction: 'Positive',
          acceptanceScore: 81,
          mainTakeaway: 'Split between Option A’s speed promise and Option B’s clear use-case list.',
          simulatedStatement:
            'I like knowing it only takes a minute from Option A, but Option B tells me right away that I can test my pricing tiers today.',
          answers: [
            {
              questionId: 'q-ab-1',
              questionText: 'Which headline and description makes you trust the platform more?',
              answer: 'Option B (with 60% preference, 40% Option A)',
            },
            {
              questionId: 'q-ab-2',
              questionText: 'Explain why you chose your preferred option and what impression the other option gave you.',
              answer: 'Knowing the exact use cases saves me from having to guess what the tool actually tests.',
            },
          ],
          reasoning: 'Values immediate clarity on what tasks the software handles.',
          motivations: ['Fast setup', 'Actionable pricing and idea feedback'],
          objections: ['Wants to try the interactive agent right from the hero'],
          confidenceScore: 84,
          uncertaintyNote: 'Moderate preference split between speed and clarity.',
        },
      ],
      recommendations: [
        {
          id: 'rec-ab-1',
          priority: 'High',
          title: 'Adopt Option B for the public landing page Hero',
          explanation:
            'Option B maximizes trust across skeptical researchers and founders while clearly stating the platform’s core jobs-to-be-done.',
          expectedImpact: '+31% simulated engagement with primary CTA',
        },
        {
          id: 'rec-ab-2',
          priority: 'Medium',
          title: 'Pair primary CTA with a direct "Try Interactive Agent" secondary button',
          explanation:
            'Gives Convenience Seekers immediate proof of speed without needing hyperbolic headline claims.',
          expectedImpact: 'Higher interactive demo completion rate',
        },
      ],
    },
  },
];
