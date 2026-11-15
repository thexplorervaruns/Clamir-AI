import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  FileText,
  Globe,
  Play,
  Plus,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  CustomFieldType,
  CustomFormField,
  DecisionSpeed,
  Persona,
  PriceSensitivity,
  PricingTierOption,
  QuestionType,
  ResearchMaterialItem,
  SelectedPersonaConfig,
  SimulationQuestion,
  SimulationTypeId,
} from '../types/clamir.ts';
import { SIMULATION_TYPES_META } from '../data/seedData.ts';

interface SimulationCreatorProps {
  initialType?: SimulationTypeId;
  personas: Persona[];
  authToken: string;
  onCancel: () => void;
  onSimulationStarted: (simulationId: string) => void;
  onPersonasChanged?: () => void;
  onOpenAgent?: () => void;
}

const ALLOWED_EXTENSIONS = ['txt', 'md', 'csv', 'json', 'pdf', 'docx'];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export const SimulationCreator: React.FC<SimulationCreatorProps> = ({
  initialType = 'test_idea',
  personas,
  authToken,
  onCancel,
  onSimulationStarted,
  onPersonasChanged,
  onOpenAgent,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Setup & Type-Specific Fields
  const [simType, setSimType] = useState<SimulationTypeId>(initialType);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [researchContext, setResearchContext] = useState('');
  // Unrestricted custom target audience definition (no forced restriction to Startup Founders / Product Managers)
  const [targetAudience, setTargetAudience] = useState('');
  const [researchObjectives, setResearchObjectives] = useState('');

  // Inline Custom Target Audience / Persona Creator Modal / Drawer (available across Step 1 and Step 4)
  const [showCustomAudienceCreator, setShowCustomAudienceCreator] = useState(false);
  const [customPersonaName, setCustomPersonaName] = useState('');
  const [customPersonaSegment, setCustomPersonaSegment] = useState('');
  const [customPersonaTagline, setCustomPersonaTagline] = useState('');
  const [customPersonaContext, setCustomPersonaContext] = useState('');
  const [customPriceSensitivity, setCustomPriceSensitivity] = useState<PriceSensitivity>('Moderate');
  const [customDecisionSpeed, setCustomDecisionSpeed] = useState<DecisionSpeed>('Deliberate');
  const [customBrandLoyalty, setCustomBrandLoyalty] = useState<number>(65);
  const [customAgentCount, setCustomAgentCount] = useState<number>(5);
  const [savingCustomPersona, setSavingCustomPersona] = useState(false);

  // Type-specific state
  const [optionADescription, setOptionADescription] = useState('');
  const [optionBDescription, setOptionBDescription] = useState('');
  const [comparisonCriteria, setComparisonCriteria] = useState('Clarity, perceived value, trust, and conversion intent');

  const [marketOrIndustry, setMarketOrIndustry] = useState('');
  const [productOrService, setProductOrService] = useState('');
  const [questionsToExplore, setQuestionsToExplore] = useState<string[]>([
    'What are the biggest unmet pain points in your current workflow?',
    'What would trigger you to switch from your existing provider?',
  ]);
  const [newExploreQuestion, setNewExploreQuestion] = useState('');

  const [websiteOrProductUrl, setWebsiteOrProductUrl] = useState('');
  const [userTask, setUserTask] = useState('Complete onboarding and identify the primary call-to-action within 60 seconds');
  const [usabilityQuestions, setUsabilityQuestions] = useState<string[]>([
    'Is the navigation hierarchy immediately clear?',
    'Where did you experience friction while completing the task?',
  ]);
  const [newUsabilityQuestion, setNewUsabilityQuestion] = useState('');

  const [currency, setCurrency] = useState('USD ($)');
  const [pricingTiers, setPricingTiers] = useState<PricingTierOption[]>([
    { id: 'tier-1', name: 'Starter', price: '$0', billingCycle: 'month', features: 'Core features, 3 projects' },
    { id: 'tier-2', name: 'Pro', price: '$49', billingCycle: 'month', features: 'Unlimited projects, exports, priority support' },
    { id: 'tier-3', name: 'Team', price: '$149', billingCycle: 'month', features: '5 seats, custom branding, API access' },
  ]);

  const [customerSegment, setCustomerSegment] = useState('');
  const [customerProfile, setCustomerProfile] = useState('');

  const [customFields, setCustomFields] = useState<CustomFormField[]>([
    {
      id: 'cf-1',
      label: 'Primary Evaluation Context',
      fieldType: 'short_text',
      value: 'Product & Audience Validation',
    },
  ]);

  // Step 2: Research Material
  const [materials, setMaterials] = useState<ResearchMaterialItem[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [extractingUrl, setExtractingUrl] = useState(false);

  // Step 3: Question Battery
  const [questions, setQuestions] = useState<SimulationQuestion[]>([]);

  // Step 4: Selected Audience (Initialize from available workspace personas if present)
  const [selectedPersonas, setSelectedPersonas] = useState<SelectedPersonaConfig[]>(() =>
    personas.slice(0, 3).map((p) => ({
      personaId: p.id,
      personaName: p.name,
      agentCount: 5,
    }))
  );

  // Sync defaults when simulation type changes
  useEffect(() => {
    const meta = SIMULATION_TYPES_META.find((m) => m.id === simType) || SIMULATION_TYPES_META[0];
    if (!hypothesis) setHypothesis(meta.defaultHypothesis);
    if (!researchObjectives) setResearchObjectives(meta.defaultObjectives);
    setQuestions(
      meta.starterQuestions.map((sq, idx) => ({
        id: `q-init-${idx}-${Date.now()}`,
        text: sq.text,
        type: sq.type,
        required: true,
        options: [...sq.options],
      }))
    );
  }, [simType]);

  // Create and attach a custom target audience persona from anywhere in the simulation flow
  const handleCreateCustomAudienceInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPersonaName.trim()) return;
    setSavingCustomPersona(true);
    setError(null);

    const cleanName = customPersonaName.trim();
    const cleanSegment = customPersonaSegment.trim() || targetAudience.trim() || 'Custom Defined Audience';
    const cleanTagline =
      customPersonaTagline.trim() ||
      `Custom target audience evaluating ${name.trim() || 'this simulation'} based on real-world fit.`;
    const cleanContext =
      customPersonaContext.trim() ||
      researchContext.trim() ||
      `Evaluates offerings within ${cleanSegment}.`;

    try {
      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: cleanName,
          segment: cleanSegment,
          tagline: cleanTagline,
          description: cleanTagline,
          avatarCode: cleanName.slice(0, 2).toUpperCase(),
          tags: ['Custom Audience', cleanSegment],
          characteristics: [`Evaluates solutions from a ${cleanSegment} perspective`],
          preferences: ['Clear value alignment', 'Frictionless onboarding'],
          motivations: ['Solving high-priority operational or personal needs'],
          purchasingBehavior: 'Compares options against direct needs and budget constraints.',
          decisionFactors: ['Direct relevance', 'Time-to-value', 'Total cost'],
          concerns: ['Hidden complexity', 'Unclear ROI'],
          context: cleanContext,
          priceSensitivity: customPriceSensitivity,
          decisionSpeed: customDecisionSpeed,
          brandLoyalty: customBrandLoyalty,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const created: Persona = data.persona;
        if (onPersonasChanged) onPersonasChanged();
        setSelectedPersonas((prev) => [
          ...prev.filter((p) => p.personaId !== created.id),
          {
            personaId: created.id,
            personaName: created.name,
            agentCount: Math.max(1, Math.min(50, customAgentCount || 5)),
          },
        ]);
        if (!targetAudience.trim()) {
          setTargetAudience(`${cleanName} (${cleanSegment})`);
        }
      } else {
        // Fallback: add directly to selectedPersonas as an ad-hoc custom audience
        const adHocId = `custom-aud-${Date.now()}`;
        setSelectedPersonas((prev) => [
          ...prev,
          {
            personaId: adHocId,
            personaName: cleanName,
            agentCount: Math.max(1, Math.min(50, customAgentCount || 5)),
          },
        ]);
      }

      setCustomPersonaName('');
      setCustomPersonaSegment('');
      setCustomPersonaTagline('');
      setCustomPersonaContext('');
      setShowCustomAudienceCreator(false);
    } finally {
      setSavingCustomPersona(false);
    }
  };

  // Handlers for Step 2: File Upload & URL Extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError(`Unsupported file type ".${ext}". Allowed: TXT, MD, CSV, JSON, PDF, DOCX.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File "${file.name}" exceeds the 8MB size limit.`);
        continue;
      }

      let extractedText = '';
      if (['txt', 'md', 'csv', 'json'].includes(ext)) {
        extractedText = await file.text();
      } else {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer.slice(0, 16384));
        const ascii = Array.from(bytes)
          .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : ' '))
          .join('')
          .replace(/\s+/g, ' ')
          .trim();
        extractedText =
          ascii.length > 40
            ? `Document (${ext.toUpperCase()}, ${(file.size / 1024).toFixed(1)} KB): ${ascii.slice(0, 900)}`
            : `Uploaded ${ext.toUpperCase()} research document: "${file.name}" (${(file.size / 1024).toFixed(1)} KB).`;
      }

      setMaterials((prev) => [
        ...prev,
        {
          id: `mat-file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          kind: 'file',
          name: file.name,
          fileType: ext.toUpperCase(),
          sizeBytes: file.size,
          extractedContent: extractedText.slice(0, 2500),
          addedAt: new Date().toISOString(),
        },
      ]);
    }
    e.target.value = '';
  };

  const handleExtractUrl = async () => {
    setError(null);
    if (!urlInput.trim()) {
      setError('Please enter a valid website URL (https://...).');
      return;
    }
    setExtractingUrl(true);
    try {
      const res = await fetch('/api/materials/extract-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not extract URL content safely.');
      } else {
        setMaterials((prev) => [
          ...prev,
          {
            id: `mat-url-${Date.now()}`,
            kind: 'url',
            name: data.title || urlInput.trim(),
            url: urlInput.trim(),
            extractedContent: data.extractedContent,
            addedAt: new Date().toISOString(),
          },
        ]);
        setUrlInput('');
      }
    } catch {
      setError('Failed to connect to URL extraction service.');
    } finally {
      setExtractingUrl(false);
    }
  };

  // Step 3: Question Battery helpers
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}`,
        text: '',
        type: 'free_response',
        required: true,
        options: [],
      },
    ]);
  };

  const handleUpdateQuestion = (id: string, patch: Partial<SimulationQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const updated = { ...q, ...patch };
        if (
          patch.type &&
          ['single_choice', 'multiple_choice', 'ranking'].includes(patch.type) &&
          updated.options.length === 0
        ) {
          updated.options = ['Option 1', 'Option 2', 'Option 3'];
        }
        if (patch.type === 'rating_scale' && updated.options.length === 0) {
          updated.options = ['1 - Low', '2', '3', '4', '5 - High'];
        }
        if (patch.type === 'yes_no') {
          updated.options = ['Yes', 'No'];
        }
        if (patch.type === 'matrix' && updated.options.length === 0) {
          updated.options = ['Ease of Use: Low/Med/High', 'Value for Money: Low/Med/High'];
        }
        return updated;
      })
    );
  };

  // Step 4: Audience selection helpers
  const togglePersonaSelection = (persona: Persona) => {
    setSelectedPersonas((prev) => {
      const exists = prev.find((p) => p.personaId === persona.id);
      if (exists) {
        return prev.filter((p) => p.personaId !== persona.id);
      }
      return [...prev, { personaId: persona.id, personaName: persona.name, agentCount: 5 }];
    });
  };

  const updateAgentCount = (personaId: string, count: number) => {
    const clamped = Math.max(1, Math.min(50, count));
    setSelectedPersonas((prev) =>
      prev.map((p) => (p.personaId === personaId ? { ...p, agentCount: clamped } : p))
    );
  };

  // Step Validation
  const validateStep = (currentStep: number): boolean => {
    setError(null);
    if (currentStep === 1) {
      if (!name.trim()) {
        setError('Please enter a simulation name.');
        return false;
      }
      if (!description.trim()) {
        setError('Please provide a description of what you are testing.');
        return false;
      }
      if (simType === 'ab_testing' && (!optionADescription.trim() || !optionBDescription.trim())) {
        setError('Please describe both Option A and Option B for A/B Testing.');
        return false;
      }
      if (simType === 'pricing_analysis' && pricingTiers.length === 0) {
        setError('Please include at least one pricing tier.');
        return false;
      }
    }
    if (currentStep === 3) {
      if (questions.length === 0) {
        setError('Please add at least one question to the question battery.');
        return false;
      }
      const emptyQ = questions.find((q) => !q.text.trim());
      if (emptyQ) {
        setError('Every question in the battery must have question text.');
        return false;
      }
    }
    if (currentStep === 4) {
      if (selectedPersonas.length === 0) {
        if (targetAudience.trim()) {
          // Automatically synthesize a custom audience persona from the user's defined Target Audience
          setSelectedPersonas([
            {
              personaId: `custom-target-${Date.now()}`,
              personaName: targetAudience.trim(),
              agentCount: 5,
            },
          ]);
          return true;
        }
        setError('Please select at least one audience persona or define a custom target audience.');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(5, prev + 1) as 1 | 2 | 3 | 4 | 5);
    }
  };

  const handleRunSimulation = async () => {
    if (!validateStep(1) || !validateStep(3) || !validateStep(4)) return;
    setSubmitting(true);
    setError(null);
    try {
      const effectivePersonas =
        selectedPersonas.length > 0
          ? selectedPersonas
          : [
              {
                personaId: `custom-target-${Date.now()}`,
                personaName: targetAudience.trim() || 'Custom Defined Audience',
                agentCount: 5,
              },
            ];

      const res = await fetch('/api/simulations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          type: simType,
          description: description.trim(),
          hypothesis: hypothesis.trim() || 'Target audience will respond positively to the proposed offering.',
          researchContext: researchContext.trim(),
          targetAudience:
            targetAudience.trim() ||
            effectivePersonas.map((p) => p.personaName).join(', '),
          researchObjectives: researchObjectives.trim(),
          typeSpecificData: {
            optionADescription,
            optionBDescription,
            comparisonCriteria,
            marketOrIndustry,
            productOrService,
            questionsToExplore,
            websiteOrProductUrl,
            userTask,
            usabilityQuestions,
            currency,
            pricingTiers,
            customerSegment,
            customerProfile,
            customFields,
          },
          materials,
          questions,
          selectedPersonas: effectivePersonas,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to launch simulation.');
      } else {
        onSimulationStarted(data.simulation.id);
      }
    } catch {
      setError('Network error while starting simulation.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalAgents = selectedPersonas.reduce((sum, p) => sum + p.agentCount, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7280] hover:text-[#111827] mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Simulations</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
            Create Audience Simulation
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Define any custom target audience, research context, question battery, and AI agent panel.
          </p>
        </div>

        {/* 5-Step Progress Indicator */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          {[
            { num: 1, label: 'Setup & Audience' },
            { num: 2, label: 'Context & Material' },
            { num: 3, label: 'Questions' },
            { num: 4, label: 'Agents & Personas' },
            { num: 5, label: 'Review' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num < step || validateStep(step)) {
                  setStep(s.num as 1 | 2 | 3 | 4 | 5);
                }
              }}
              className={`px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer ${
                step === s.num
                  ? 'bg-[#000000] text-white border-[#000000] font-semibold'
                  : step > s.num
                  ? 'bg-[#F9FAFB] text-[#111827] border-[#E5E7EB]'
                  : 'bg-white text-[#6B7280] border-[#E5E7EB]'
              }`}
            >
              {s.num}. {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Persistent Context & Agents Bar inside Simulation Setup */}
      <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#111827] bg-white px-2.5 py-1 rounded border border-[#E5E7EB]">
            <Users className="w-3.5 h-3.5" />
            <span>
              ACTIVE AGENTS: {selectedPersonas.length} Audiences ({totalAgents} AI Agents)
            </span>
          </span>
          <span className="text-[#6B7280]">
            Context:{' '}
            <strong className="text-[#111827]">
              {researchContext.trim() || targetAudience.trim() || 'Custom Simulation Context'}
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowCustomAudienceCreator(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#111827] bg-white border border-[#E5E7EB] rounded-md hover:border-[#000000] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Define Custom Audience</span>
          </button>
          {onOpenAgent && (
            <button
              type="button"
              onClick={onOpenAgent}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:text-[#111827] cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Agent</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
          {error}
        </div>
      )}

      {/* STEP 1: SETUP & SIMULATION TYPE FIELDS */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Simulation Type Selector (7 Types) */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
            <label className="block text-xs font-semibold text-[#111827] mb-3">
              Select Simulation Type (All 7 Modes Support Custom Target Audiences)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {SIMULATION_TYPES_META.map((meta) => {
                const active = simType === meta.id;
                return (
                  <button
                    key={meta.id}
                    type="button"
                    onClick={() => setSimType(meta.id)}
                    className={`p-3 text-left rounded-md border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#000000] text-white border-[#000000]'
                        : 'bg-[#F9FAFB] text-[#111827] border-[#E5E7EB] hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-xs font-semibold">{meta.name}</div>
                    <div className={`text-[11px] mt-1 line-clamp-2 ${active ? 'text-neutral-300' : 'text-[#6B7280]'}`}>
                      {meta.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core & Type-Specific Setup Fields */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-5">
            <h2 className="text-sm font-bold text-[#111827] border-b border-[#E5E7EB] pb-2.5">
              {SIMULATION_TYPES_META.find((m) => m.id === simType)?.name} — Configuration &amp; Custom Target Audience
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  {simType === 'test_idea'
                    ? 'Idea Name *'
                    : simType === 'ab_testing'
                    ? 'Test Name *'
                    : simType === 'usability_analysis'
                    ? 'Product or Website Name *'
                    : simType === 'pricing_analysis'
                    ? 'Product Name *'
                    : 'Simulation Name *'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Q4 Consumer Subscription & Packaging Validation"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#111827]">
                    Define Custom Target Audience (Unrestricted)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomAudienceCreator(true)}
                    className="text-[11px] font-semibold text-[#111827] underline hover:text-[#6B7280] cursor-pointer"
                  >
                    + Create Custom Persona
                  </button>
                </div>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Define any audience (e.g., Retail Shoppers, Healthcare Nurses, Indie Creators, Enterprise CFOs)..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
                />
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[#6B7280]">Quick examples:</span>
                  {[
                    'D2C E-Commerce Shoppers',
                    'Healthcare Clinicians',
                    'Gen-Z Mobile Users',
                    'Small Business Owners',
                    'Enterprise Security Buyers',
                  ].map((sampleAud) => (
                    <button
                      key={sampleAud}
                      type="button"
                      onClick={() =>
                        setTargetAudience((prev) =>
                          prev.trim() ? `${prev.trim()}, ${sampleAud}` : sampleAud
                        )
                      }
                      className="px-2 py-0.5 text-[10px] bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[#6B7280] hover:text-[#111827] hover:border-[#000000] cursor-pointer"
                    >
                      + {sampleAud}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                {simType === 'test_idea'
                  ? 'Idea Description *'
                  : simType === 'pricing_analysis'
                  ? 'Product Description *'
                  : 'Simulation Description & Overview *'}
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the product, concept, campaign, or business decision being evaluated..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
              />
            </div>

            {/* Type-Specific Fields: A/B Testing */}
            {simType === 'ab_testing' && (
              <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Option A Description *
                    </label>
                    <textarea
                      rows={3}
                      value={optionADescription}
                      onChange={(e) => setOptionADescription(e.target.value)}
                      placeholder="Describe Option A (e.g., current headline, feature bundle A, design A)..."
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Option B Description *
                    </label>
                    <textarea
                      rows={3}
                      value={optionBDescription}
                      onChange={(e) => setOptionBDescription(e.target.value)}
                      placeholder="Describe Option B (e.g., challenger headline, feature bundle B, design B)..."
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    What should be compared?
                  </label>
                  <input
                    type="text"
                    value={comparisonCriteria}
                    onChange={(e) => setComparisonCriteria(e.target.value)}
                    placeholder="e.g., Value clarity, trust, willingness to click"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
              </div>
            )}

            {/* Type-Specific Fields: Market Exploration */}
            {simType === 'market_exploration' && (
              <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Market or Industry
                    </label>
                    <input
                      type="text"
                      value={marketOrIndustry}
                      onChange={(e) => setMarketOrIndustry(e.target.value)}
                      placeholder="e.g., Consumer Wellness, FinTech, B2B Operations"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Product or Service Category
                    </label>
                    <input
                      type="text"
                      value={productOrService}
                      onChange={(e) => setProductOrService(e.target.value)}
                      placeholder="e.g., Personalized Nutrition Subscription"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                    Questions to Explore
                  </label>
                  <div className="space-y-2 mb-2">
                    {questionsToExplore.map((q, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 border border-[#E5E7EB] rounded-md text-xs">
                        <span>{q}</span>
                        <button
                          type="button"
                          onClick={() => setQuestionsToExplore((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-[#6B7280] hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newExploreQuestion}
                      onChange={(e) => setNewExploreQuestion(e.target.value)}
                      placeholder="Add custom market exploration question..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newExploreQuestion.trim()) {
                          setQuestionsToExplore((prev) => [...prev, newExploreQuestion.trim()]);
                          setNewExploreQuestion('');
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-[#000000] text-white rounded-md cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Type-Specific Fields: Usability Analysis */}
            {simType === 'usability_analysis' && (
              <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Website URL or Uploaded Content Reference
                    </label>
                    <input
                      type="text"
                      value={websiteOrProductUrl}
                      onChange={(e) => setWebsiteOrProductUrl(e.target.value)}
                      placeholder="https://example.com/onboarding"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Primary User Task
                    </label>
                    <input
                      type="text"
                      value={userTask}
                      onChange={(e) => setUserTask(e.target.value)}
                      placeholder="e.g., Find pricing comparison and start a 14-day trial"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                    Usability Questions
                  </label>
                  <div className="space-y-2 mb-2">
                    {usabilityQuestions.map((uq, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 border border-[#E5E7EB] rounded-md text-xs">
                        <span>{uq}</span>
                        <button
                          type="button"
                          onClick={() => setUsabilityQuestions((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-[#6B7280] hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newUsabilityQuestion}
                      onChange={(e) => setNewUsabilityQuestion(e.target.value)}
                      placeholder="Add usability question..."
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newUsabilityQuestion.trim()) {
                          setUsabilityQuestions((prev) => [...prev, newUsabilityQuestion.trim()]);
                          setNewUsabilityQuestion('');
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-[#000000] text-white rounded-md cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Type-Specific Fields: Pricing Analysis */}
            {simType === 'pricing_analysis' && (
              <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827]">
                      Pricing Tiers &amp; Currency
                    </label>
                    <p className="text-[11px] text-[#6B7280]">Add or remove pricing tiers to test elasticity across your custom audiences.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md"
                    >
                      <option value="USD ($)">USD ($)</option>
                      <option value="EUR (€)">EUR (€)</option>
                      <option value="GBP (£)">GBP (£)</option>
                      <option value="INR (₹)">INR (₹)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setPricingTiers((prev) => [
                          ...prev,
                          {
                            id: `tier-${Date.now()}`,
                            name: `Tier ${prev.length + 1}`,
                            price: '$99',
                            billingCycle: 'month',
                            features: 'Included tier features',
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#000000] text-white rounded-md cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Tier</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {pricingTiers.map((tier) => (
                    <div key={tier.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-3 border border-[#E5E7EB] rounded-md items-center">
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) =>
                          setPricingTiers((prev) =>
                            prev.map((t) => (t.id === tier.id ? { ...t, name: e.target.value } : t))
                          )
                        }
                        placeholder="Tier Name"
                        className="sm:col-span-3 px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded"
                      />
                      <input
                        type="text"
                        value={tier.price}
                        onChange={(e) =>
                          setPricingTiers((prev) =>
                            prev.map((t) => (t.id === tier.id ? { ...t, price: e.target.value } : t))
                          )
                        }
                        placeholder="Price (e.g. $49)"
                        className="sm:col-span-2 px-2.5 py-1.5 text-xs font-mono border border-[#E5E7EB] rounded"
                      />
                      <input
                        type="text"
                        value={tier.features}
                        onChange={(e) =>
                          setPricingTiers((prev) =>
                            prev.map((t) => (t.id === tier.id ? { ...t, features: e.target.value } : t))
                          )
                        }
                        placeholder="Key features included..."
                        className="sm:col-span-6 px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded"
                      />
                      <button
                        type="button"
                        onClick={() => setPricingTiers((prev) => prev.filter((t) => t.id !== tier.id))}
                        className="sm:col-span-1 flex justify-center text-[#6B7280] hover:text-red-600 cursor-pointer"
                        title="Remove tier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Type-Specific Fields: Customer Analysis */}
            {simType === 'customer_analysis' && (
              <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Custom Customer Segment
                  </label>
                  <input
                    type="text"
                    value={customerSegment}
                    onChange={(e) => setCustomerSegment(e.target.value)}
                    placeholder="e.g., Independent Creative Agencies, Retail Subscribers"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Customer Profile &amp; Buying Context
                  </label>
                  <input
                    type="text"
                    value={customerProfile}
                    onChange={(e) => setCustomerProfile(e.target.value)}
                    placeholder="e.g., Managing client deliverables on tight retainers"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
              </div>
            )}

            {/* Type-Specific Fields: Custom Simulation */}
            {simType === 'custom_simulation' && (
              <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#111827]">
                    Custom Simulation Fields (Short text, Long text, Number, Single choice, Multiple choice)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomFields((prev) => [
                        ...prev,
                        {
                          id: `cf-${Date.now()}`,
                          label: 'Custom Parameter',
                          fieldType: 'short_text',
                          value: '',
                          options: ['Option A', 'Option B'],
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#000000] text-white rounded-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Field</span>
                  </button>
                </div>

                {customFields.map((cf) => (
                  <div key={cf.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-3 border border-[#E5E7EB] rounded-md items-center">
                    <input
                      type="text"
                      value={cf.label}
                      onChange={(e) =>
                        setCustomFields((prev) =>
                          prev.map((item) => (item.id === cf.id ? { ...item, label: e.target.value } : item))
                        )
                      }
                      placeholder="Field Label"
                      className="sm:col-span-4 px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded"
                    />
                    <select
                      value={cf.fieldType}
                      onChange={(e) =>
                        setCustomFields((prev) =>
                          prev.map((item) =>
                            item.id === cf.id ? { ...item, fieldType: e.target.value as CustomFieldType } : item
                          )
                        )
                      }
                      className="sm:col-span-3 px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded bg-white"
                    >
                      <option value="short_text">Short text</option>
                      <option value="long_text">Long text</option>
                      <option value="number">Number</option>
                      <option value="single_choice">Single choice</option>
                      <option value="multiple_choice">Multiple choice</option>
                    </select>
                    <input
                      type={cf.fieldType === 'number' ? 'number' : 'text'}
                      value={cf.value}
                      onChange={(e) =>
                        setCustomFields((prev) =>
                          prev.map((item) => (item.id === cf.id ? { ...item, value: e.target.value } : item))
                        )
                      }
                      placeholder="Value or options..."
                      className="sm:col-span-4 px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomFields((prev) => prev.filter((item) => item.id !== cf.id))}
                      className="sm:col-span-1 flex justify-center text-[#6B7280] hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Main Hypothesis
                </label>
                <textarea
                  rows={2}
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Research Objectives
                </label>
                <textarea
                  rows={2}
                  value={researchObjectives}
                  onChange={(e) => setResearchObjectives(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1">
                Simulation &amp; Audience Evaluation Context
              </label>
              <input
                type="text"
                value={researchContext}
                onChange={(e) => setResearchContext(e.target.value)}
                placeholder="Market conditions, competitive environment, channel context, or launch timeline..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: ADD RESEARCH MATERIAL */}
      {step === 2 && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#111827]">
              Step 2 — Add Research Context &amp; Material
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Upload supporting briefs, copy decks, or datasets (TXT, MD, CSV, JSON, PDF, DOCX) or extract live website content for your simulated agents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Upload Box */}
            <div className="p-5 bg-[#F9FAFB] border border-dashed border-[#E5E7EB] rounded-lg flex flex-col items-center justify-center text-center">
              <Upload className="w-6 h-6 text-[#111827] mb-2" />
              <p className="text-xs font-semibold text-[#111827]">Upload Research Files</p>
              <p className="text-[11px] text-[#6B7280] mt-1">
                Supported formats: TXT, MD, CSV, JSON, PDF, DOCX (Max 8MB per file)
              </p>
              <label className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 transition-colors cursor-pointer">
                <span>Select Files</span>
                <input
                  type="file"
                  multiple
                  accept=".txt,.md,.csv,.json,.pdf,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Safe Website URL Extractor */}
            <div className="p-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#111827]">
                  <Globe className="w-4 h-4" />
                  <span>Website URL Content Extraction</span>
                </div>
                <p className="text-[11px] text-[#6B7280] mt-1">
                  Safely extract page title, headings, and body copy from a public URL to include in the simulation context.
                </p>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  className="mt-3 w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
                />
              </div>
              <button
                type="button"
                disabled={extractingUrl}
                onClick={handleExtractUrl}
                className="mt-3 self-start px-4 py-2 text-xs font-semibold text-[#111827] bg-white border border-[#E5E7EB] rounded-md hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
              >
                {extractingUrl ? 'Extracting URL...' : 'Extract URL Content'}
              </button>
            </div>
          </div>

          {/* Uploaded Materials List */}
          <div>
            <h3 className="text-xs font-semibold text-[#111827] mb-2">
              Attached Research Materials ({materials.length})
            </h3>
            {materials.length === 0 ? (
              <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md text-xs text-[#6B7280]">
                No research files or URLs attached yet. You can attach materials above or proceed directly to the question battery.
              </div>
            ) : (
              <div className="space-y-2">
                {materials.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#111827]">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{mat.name}</span>
                        <span className="font-mono text-[11px] text-[#6B7280]">
                          · {mat.kind === 'file' ? mat.fileType : 'URL'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#6B7280] line-clamp-2">{mat.extractedContent}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMaterials((prev) => prev.filter((m) => m.id !== mat.id))}
                      className="text-[#6B7280] hover:text-red-600 p-1 cursor-pointer shrink-0"
                      title="Remove material"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: CREATE QUESTION BATTERY */}
      {step === 3 && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
            <div>
              <h2 className="text-base font-bold text-[#111827]">Step 3 — Question Battery</h2>
              <p className="text-xs text-[#6B7280]">
                Configure the questions every selected or custom-defined audience persona will answer during the simulation.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 cursor-pointer self-start"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono font-semibold text-[#111827]">
                    Question {idx + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <select
                      value={q.type}
                      onChange={(e) =>
                        handleUpdateQuestion(q.id, { type: e.target.value as QuestionType })
                      }
                      className="px-2.5 py-1 text-xs bg-white border border-[#E5E7EB] rounded-md"
                    >
                      <option value="single_choice">Single choice</option>
                      <option value="multiple_choice">Multiple choice</option>
                      <option value="free_response">Free response</option>
                      <option value="rating_scale">Rating scale</option>
                      <option value="ranking">Ranking</option>
                      <option value="matrix">Matrix</option>
                      <option value="yes_no">Yes/No</option>
                    </select>

                    <label className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) => handleUpdateQuestion(q.id, { required: e.target.checked })}
                      />
                      <span>Required</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setQuestions((prev) => prev.filter((item) => item.id !== q.id))}
                      className="text-[#6B7280] hover:text-red-600 cursor-pointer"
                      title="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={q.text}
                  onChange={(e) => handleUpdateQuestion(q.id, { text: e.target.value })}
                  placeholder="Enter your research question..."
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
                />

                {q.type !== 'free_response' && (
                  <div>
                    <label className="block text-[11px] font-medium text-[#6B7280] mb-1">
                      Options (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={q.options.join(', ')}
                      onChange={(e) =>
                        handleUpdateQuestion(q.id, {
                          options: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Option 1, Option 2, Option 3"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 4: SELECT OR CREATE AUDIENCE & AGENTS */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E7EB]">
              <div>
                <h2 className="text-base font-bold text-[#111827]">
                  Step 4 — Configure Target Audiences &amp; AI Agents
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Create your own custom target audience personas or select from your workspace database, and set the AI agent count per group.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCustomAudienceCreator(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Custom Audience</span>
                </button>
                <div className="text-right font-mono">
                  <span className="text-[11px] text-[#6B7280] block">Active Panel</span>
                  <span className="text-xs font-bold text-[#111827] tabular-nums">
                    {selectedPersonas.length} Groups · {totalAgents} Agents
                  </span>
                </div>
              </div>
            </div>

            {/* Selected Ad-Hoc Custom Audiences (if any not in personas list) */}
            {selectedPersonas.filter((sp) => !personas.some((p) => p.id === sp.personaId)).length > 0 && (
              <div className="mt-4 p-4 bg-[#F9FAFB] border border-[#000000] rounded-lg space-y-2.5">
                <span className="text-[11px] font-mono font-semibold text-[#111827] block">
                  CUSTOM DEFINED SIMULATION AUDIENCES
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedPersonas
                    .filter((sp) => !personas.some((p) => p.id === sp.personaId))
                    .map((sp) => (
                      <div
                        key={sp.personaId}
                        className="p-3 bg-white border border-[#E5E7EB] rounded-md flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="text-xs font-bold text-[#111827] block">{sp.personaName}</span>
                          <span className="text-[11px] font-mono text-[#6B7280]">Custom Target Audience</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={sp.agentCount}
                            onChange={(e) =>
                              updateAgentCount(sp.personaId, parseInt(e.target.value, 10) || 1)
                            }
                            className="w-16 px-2 py-1 text-xs font-mono text-right bg-white border border-[#E5E7EB] rounded"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPersonas((prev) =>
                                prev.filter((item) => item.personaId !== sp.personaId)
                              )
                            }
                            className="p-1 text-[#6B7280] hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {personas.length === 0 ? (
              <div className="mt-5 p-8 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-center space-y-3">
                <p className="text-sm font-semibold text-[#111827]">
                  Built-in database is empty — define your custom audience
                </p>
                <p className="text-xs text-[#6B7280] max-w-md mx-auto">
                  Click below to create a custom target audience persona for this simulation.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCustomAudienceCreator(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 cursor-pointer"
                >
                  + Create Custom Target Audience
                </button>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {personas.map((persona) => {
                  const selectedConfig = selectedPersonas.find((sp) => sp.personaId === persona.id);
                  const isSelected = !!selectedConfig;
                  return (
                    <div
                      key={persona.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        isSelected ? 'bg-[#F9FAFB] border-[#000000]' : 'bg-white border-[#E5E7EB]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => togglePersonaSelection(persona)}
                          className="flex items-start gap-3 text-left flex-1 cursor-pointer"
                        >
                          <div
                            className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center border shrink-0 ${
                              isSelected
                                ? 'bg-[#000000] border-[#000000] text-white'
                                : 'bg-white border-[#E5E7EB]'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[#111827]">{persona.name}</span>
                              <span className="text-[11px] font-mono text-[#6B7280]">
                                · {persona.isBuiltIn ? 'Built-in' : 'Custom'}
                              </span>
                            </div>
                            <p className="text-xs text-[#6B7280] mt-1">{persona.tagline}</p>
                          </div>
                        </button>

                        {isSelected && selectedConfig && (
                          <div className="shrink-0 text-right">
                            <label className="block text-[10px] font-mono text-[#6B7280] mb-1">
                              AI Agents
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={selectedConfig.agentCount}
                              onChange={(e) =>
                                updateAgentCount(persona.id, parseInt(e.target.value, 10) || 1)
                              }
                              className="w-16 px-2 py-1 text-xs font-mono text-right bg-white border border-[#E5E7EB] rounded tabular-nums"
                            />
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#E5E7EB] flex items-center gap-3 text-[11px] font-mono text-[#6B7280]">
                        <span>Price Sens: {persona.priceSensitivity}</span>
                        <span>·</span>
                        <span>Speed: {persona.decisionSpeed}</span>
                        <span>·</span>
                        <span className="tabular-nums">Loyalty: {persona.brandLoyalty}/100</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW AND RUN */}
      {step === 5 && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-6">
          <div className="pb-4 border-b border-[#E5E7EB]">
            <h2 className="text-base font-bold text-[#111827]">Step 5 — Review and Run Simulation</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Verify your simulation parameters, custom target audiences, and context before dispatching to the Clamir AI Engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-2">
              <h3 className="font-semibold text-[#111827] text-sm">Simulation &amp; Context Details</h3>
              <p><span className="text-[#6B7280]">Name:</span> <strong className="text-[#111827]">{name}</strong></p>
              <p><span className="text-[#6B7280]">Type:</span> <strong className="text-[#111827]">{SIMULATION_TYPES_META.find((m) => m.id === simType)?.name}</strong></p>
              <p>
                <span className="text-[#6B7280]">Target Audience:</span>{' '}
                <strong className="text-[#111827]">
                  {targetAudience.trim() || selectedPersonas.map((p) => p.personaName).join(', ')}
                </strong>
              </p>
              <p><span className="text-[#6B7280]">Hypothesis:</span> {hypothesis}</p>
              <p><span className="text-[#6B7280]">Description:</span> {description}</p>
            </div>

            <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-2">
              <h3 className="font-semibold text-[#111827] text-sm">Audience Agents &amp; Material Summary</h3>
              <p>
                <span className="text-[#6B7280]">Selected Audience Groups:</span>{' '}
                <strong className="font-mono tabular-nums">{selectedPersonas.length} groups ({totalAgents} total AI agents)</strong>
              </p>
              <ul className="space-y-1 pl-3 text-[#111827]">
                {selectedPersonas.map((sp) => (
                  <li key={sp.personaId} className="font-mono text-[11px]">
                    • {sp.personaName} — {sp.agentCount} agents
                  </li>
                ))}
              </ul>
              <p className="pt-2">
                <span className="text-[#6B7280]">Research Materials:</span>{' '}
                <strong className="font-mono tabular-nums">{materials.length} attached</strong>
              </p>
              <p>
                <span className="text-[#6B7280]">Question Battery:</span>{' '}
                <strong className="font-mono tabular-nums">{questions.length} structured questions</strong>
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md text-xs text-[#6B7280]">
            <strong>Transparency Notice:</strong> Clamir AI generates simulated customer persona responses for decision support and hypothesis testing. Outputs will be clearly labeled as AI-generated simulations.
          </div>
        </div>
      )}

      {/* Footer Navigation Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
        <button
          type="button"
          onClick={() => (step === 1 ? onCancel() : setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5))}
          className="px-4 py-2 text-xs font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB] cursor-pointer"
        >
          {step === 1 ? 'Cancel' : 'Previous Step'}
        </button>

        {step < 5 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={handleRunSimulation}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>{submitting ? 'Launching Simulation...' : 'Run Simulation'}</span>
          </button>
        )}
      </div>

      {/* Inline Custom Target Audience / Persona Creator Modal */}
      {showCustomAudienceCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Create Custom Target Audience
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Define any custom audience segment and add it directly to this simulation and your workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomAudienceCreator(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomAudienceInline} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">
                    Custom Audience Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customPersonaName}
                    onChange={(e) => setCustomPersonaName(e.target.value)}
                    placeholder="e.g., Urban Fitness Enthusiasts"
                    className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">
                    Segment / Category
                  </label>
                  <input
                    type="text"
                    value={customPersonaSegment}
                    onChange={(e) => setCustomPersonaSegment(e.target.value)}
                    placeholder="e.g., Consumer Health & Mobile Apps"
                    className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">
                  Key Characteristics, Goals &amp; Buying Mindset
                </label>
                <textarea
                  rows={2}
                  value={customPersonaTagline}
                  onChange={(e) => setCustomPersonaTagline(e.target.value)}
                  placeholder="Describe how this audience evaluates products, what motivates them, and what objections they raise..."
                  className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">
                  Evaluation Context
                </label>
                <input
                  type="text"
                  value={customPersonaContext}
                  onChange={(e) => setCustomPersonaContext(e.target.value)}
                  placeholder="e.g., Discovering products via social feeds and comparing subscription tiers"
                  className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md">
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Price Sens.</label>
                  <select
                    value={customPriceSensitivity}
                    onChange={(e) => setCustomPriceSensitivity(e.target.value as PriceSensitivity)}
                    className="w-full px-2 py-1.5 bg-white border border-[#E5E7EB] rounded"
                  >
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Speed</label>
                  <select
                    value={customDecisionSpeed}
                    onChange={(e) => setCustomDecisionSpeed(e.target.value as DecisionSpeed)}
                    className="w-full px-2 py-1.5 bg-white border border-[#E5E7EB] rounded"
                  >
                    <option value="Instant">Instant</option>
                    <option value="Fast">Fast</option>
                    <option value="Deliberate">Deliberate</option>
                    <option value="Slow">Slow</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Loyalty</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={customBrandLoyalty}
                    onChange={(e) => setCustomBrandLoyalty(Number(e.target.value))}
                    className="w-full px-2 py-1.5 font-mono bg-white border border-[#E5E7EB] rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">AI Agents</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={customAgentCount}
                    onChange={(e) => setCustomAgentCount(Number(e.target.value))}
                    className="w-full px-2 py-1.5 font-mono bg-white border border-[#E5E7EB] rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowCustomAudienceCreator(false)}
                  className="px-4 py-2 font-medium text-[#111827] border border-[#E5E7EB] rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomPersona}
                  className="px-4 py-2 font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                >
                  {savingCustomPersona ? 'Adding Audience...' : 'Save & Add to Simulation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
