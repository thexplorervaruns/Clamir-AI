export type SimulationTypeId =
  | 'test_idea'
  | 'ab_testing'
  | 'market_exploration'
  | 'usability_analysis'
  | 'pricing_analysis'
  | 'customer_analysis'
  | 'custom_simulation';

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'free_response'
  | 'rating_scale'
  | 'ranking'
  | 'matrix'
  | 'yes_no';

export type CustomFieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'single_choice'
  | 'multiple_choice';

export type PriceSensitivity = 'Low' | 'Moderate' | 'High' | 'Very High';
export type DecisionSpeed = 'Instant' | 'Fast' | 'Deliberate' | 'Slow';

export interface Persona {
  id: string;
  workspaceId?: string | null;
  name: string;
  tagline: string;
  description: string;
  avatarCode: string;
  segment: string;
  tags: string[];
  characteristics: string[];
  preferences: string[];
  motivations: string[];
  purchasingBehavior: string;
  decisionFactors: string[];
  concerns: string[];
  context: string;
  priceSensitivity: PriceSensitivity;
  decisionSpeed: DecisionSpeed;
  brandLoyalty: number; // 0 to 100
  isBuiltIn: boolean;
  isFavorite?: boolean;
  createdAt?: string;
}

export interface PricingTierOption {
  id: string;
  name: string;
  price: string;
  billingCycle: string;
  features: string;
}

export interface CustomFormField {
  id: string;
  label: string;
  fieldType: CustomFieldType;
  value: string;
  options?: string[];
}

export interface SimulationQuestion {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options: string[];
  matrixRows?: string[];
  matrixCols?: string[];
}

export interface ResearchMaterialItem {
  id: string;
  kind: 'file' | 'url';
  name: string;
  fileType?: string;
  sizeBytes?: number;
  url?: string;
  extractedContent: string;
  addedAt: string;
}

export interface SelectedPersonaConfig {
  personaId: string;
  personaName: string;
  agentCount: number;
}

export type SimulationStage =
  | 'Queued'
  | 'Preparing'
  | 'Preparing simulation'
  | 'Searching the web'
  | 'Analyzing sources'
  | 'Verifying information'
  | 'Processing Responses'
  | 'Analyzing'
  | 'Generating Insights'
  | 'Generating results'
  | 'Completed'
  | 'Stopped'
  | 'Failed';

export interface PersonaSimulationBreakdown {
  personaId: string;
  personaName: string;
  segment: string;
  agentCount: number;
  overallReaction: 'Positive' | 'Mixed' | 'Negative';
  acceptanceScore: number; // 0-100
  mainTakeaway: string;
  simulatedStatement: string; // Explicitly labeled as AI-simulated illustrative quote
  answers: {
    questionId: string;
    questionText: string;
    answer: string;
  }[];
  reasoning: string;
  motivations: string[];
  objections: string[];
  confidenceScore: number; // 0-100
  uncertaintyNote: string;
}

export interface ABComparisonResult {
  optionALabel: string;
  optionBLabel: string;
  optionAScore: number;
  optionBScore: number;
  optionAStrengths: string[];
  optionAWeaknesses: string[];
  optionBStrengths: string[];
  optionBWeaknesses: string[];
  personaPreferences: {
    personaName: string;
    preferredOption: 'Option A' | 'Option B' | 'Neutral';
    rationale: string;
  }[];
  overallVerdict: string;
}

export interface SimulationRecommendation {
  id: string;
  priority: 'High' | 'Medium' | 'Low';
  title: string;
  explanation: string;
  expectedImpact: string;
}

export interface StructuredSimulationReport {
  simulationOverview?: string;
  scenarioAndParameters?: string;
  researchFindings?: string;
  importantFactsAndEvidence?: {
    claim: string;
    classification: string;
    sourceTitle: string;
    sourceUrl?: string;
  }[];
  verificationSummary?: {
    verifiedClaimsCount?: number;
    conflictingInformationNotes?: string;
    missingInformationAndLimitations?: string;
  };
  simulationMethodology?: string;
  stepByStepResults?: string[];
  relevantCalculations?: {
    metric: string;
    formula: string;
    inputs: string;
    output: string;
  }[];
  expectedOutcomes?: string;
  risksAndLimitations?: string[];
  sourcesAndReferences?: {
    title: string;
    url: string;
    publishedDate?: string | null;
    authorityTier?: string;
    provider?: string;
    excerpt?: string;
  }[];
  finalConclusion?: string;
}

export interface SimulationResults {
  simulationNotice: string;
  aiEngineMode: 'openrouter-gemini-2.5-flash' | 'openrouter-live' | 'simulated-engine';
  generatedAt: string;
  structuredSimulationReport?: StructuredSimulationReport;
  executiveSummary: {
    mainFinding: string;
    overallReaction: string;
    importantOpportunities: string[];
    mainConcerns: string[];
  };
  sentimentOverview: {
    positive: number;
    neutral: number;
    negative: number;
  };
  audiencePreferences: {
    label: string;
    score: number;
    detail: string;
  }[];
  objectionsAndConcerns: {
    objection: string;
    severity: 'High' | 'Medium' | 'Low';
    frequencyPct: number;
    mitigation: string;
  }[];
  opportunities: {
    title: string;
    impact: 'High' | 'Medium' | 'Low';
    description: string;
  }[];
  abComparison?: ABComparisonResult;
  personaBreakdown: PersonaSimulationBreakdown[];
  recommendations: SimulationRecommendation[];
}

export interface Simulation {
  id: string;
  workspaceId: string;
  name: string;
  type: SimulationTypeId;
  description: string;
  hypothesis: string;
  researchContext: string;
  targetAudience: string;
  researchObjectives: string;
  // Type-specific fields
  typeSpecificData: {
    // A/B Testing & General Manual Notes
    optionADescription?: string;
    optionBDescription?: string;
    comparisonCriteria?: string;
    processNotes?: string;
    resultsNotes?: string;
    // Market Exploration
    marketOrIndustry?: string;
    productOrService?: string;
    questionsToExplore?: string[];
    // Usability Analysis
    websiteOrProductUrl?: string;
    userTask?: string;
    usabilityQuestions?: string[];
    // Pricing Analysis
    currency?: string;
    pricingTiers?: PricingTierOption[];
    // Customer Analysis
    customerSegment?: string;
    customerProfile?: string;
    // Custom Simulation
    customFields?: CustomFormField[];
  };
  materials: ResearchMaterialItem[];
  questions: SimulationQuestion[];
  selectedPersonas: SelectedPersonaConfig[];
  status: 'Active' | 'Completed' | 'Stopped' | 'Failed';
  stage: SimulationStage;
  progress: number; // 0 to 100
  startedAt: string;
  completedAt?: string;
  estimatedSecondsRemaining?: number | null;
  results?: SimulationResults;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  role: 'Owner' | 'Admin' | 'Member';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  plan: 'Explorer' | 'Growth' | 'Enterprise';
  isOwner: boolean;
  createdAt: string;
}

export interface RecentSearchItem {
  id: string;
  workspaceId: string;
  query: string;
  category: 'Simulation' | 'Agent' | 'Audience' | 'WebSearch';
  targetId?: string;
  timestamp: string;
}

export interface AgentSourceCitation {
  title: string;
  uri: string;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  webSearchUsed?: boolean;
  sources?: AgentSourceCitation[];
  simulationContextName?: string;
  personaContextName?: string;
}

export interface AdditionalContextBox {
  id: string;
  title: string;
  content: string;
}

export interface AgentConversation {
  id: string;
  workspaceId: string;
  title: string;
  simulationId?: string | null;
  personaId?: string | null;
  createdAt: string;
  updatedAt: string;
  messages: AgentMessage[];
}

export interface ReportArtifact {
  id: string;
  workspaceId: string;
  simulationId: string;
  simulationName: string;
  title: string;
  format: 'PDF' | 'JSON' | 'TXT' | 'CSV';
  sizeLabel: string;
  createdAt: string;
  summarySnippet: string;
}

export interface PricingPlanConfig {
  id: 'Explorer' | 'Growth' | 'Enterprise';
  name: string;
  priceLabel: string;
  billingPeriod: string;
  audienceTag: string;
  description: string;
  features: string[];
  simulationsLimit: number;
}

export interface PlatformConfig {
  pricingPlans: PricingPlanConfig[];
  allowWebSearch: boolean;
  defaultAgentsPerPersona: number;
  updatedAt: string;
}
