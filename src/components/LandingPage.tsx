import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  Compass,
  DollarSign,
  FileText,
  FlaskConical,
  MousePointerClick,
  Plus,
  Send,
  Sliders,
  Users,
  X,
} from 'lucide-react';
import { ClamirLogo } from './ClamirLogo.tsx';
import { BUILT_IN_PERSONAS, INITIAL_SAMPLE_SIMULATIONS } from '../data/seedData.ts';
import { DecisionSpeed, PlatformConfig, PriceSensitivity } from '../types/clamir.ts';

interface LandingPageProps {
  platformConfig: PlatformConfig;
  onGetStarted: (initialIntent?: 'simulations' | 'agent' | 'signup') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ platformConfig, onGetStarted }) => {
  const [selectedPreviewPersonaId, setSelectedPreviewPersonaId] = useState<string>('persona-quality-seekers');
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [infoModal, setInfoModal] = useState<null | 'docs' | 'privacy' | 'terms' | 'contact'>(null);

  // Interactive Demo state — All text fields start empty, no automatic content
  const [demoQuestion, setDemoQuestion] = useState('');
  const [demoAudienceMode, setDemoAudienceMode] = useState<'preset' | 'custom'>('preset');
  const [demoPersonaId, setDemoPersonaId] = useState('persona-value-optimizers');
  const [customAudienceName, setCustomAudienceName] = useState('');
  const [customAudienceDescription, setCustomAudienceDescription] = useState('');
  const [customPriceSensitivity, setCustomPriceSensitivity] = useState<PriceSensitivity>('Moderate');
  const [customDecisionSpeed, setCustomDecisionSpeed] = useState<DecisionSpeed>('Deliberate');

  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResponse, setDemoResponse] = useState<{
    personaName: string;
    reaction: string;
    acceptanceScore: number;
    response: string;
    keyObjection: string;
    opportunity: string;
    engineMode: string;
  } | null>(null);

  const sampleSim = INITIAL_SAMPLE_SIMULATIONS[0];
  const activePreviewBreakdown =
    sampleSim.results?.personaBreakdown.find((p) => p.personaId === selectedPreviewPersonaId) ||
    sampleSim.results?.personaBreakdown[0];

  const handleRunInteractiveDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoQuestion.trim()) return;
    setDemoLoading(true);
    try {
      const payload =
        demoAudienceMode === 'custom'
          ? {
              question: demoQuestion.trim(),
              customAudienceName: customAudienceName.trim() || 'Custom Target Audience',
              customAudienceDescription: customAudienceDescription.trim(),
              customPriceSensitivity,
              customDecisionSpeed,
            }
          : {
              question: demoQuestion.trim(),
              personaId: demoPersonaId,
            };

      const res = await fetch('/api/public/interactive-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setDemoResponse(data);
      }
    } catch {
      const persona = BUILT_IN_PERSONAS.find((p) => p.id === demoPersonaId) || BUILT_IN_PERSONAS[0];
      const targetName =
        demoAudienceMode === 'custom'
          ? customAudienceName.trim() || 'Custom Target Audience'
          : persona.name;
      setDemoResponse({
        personaName: targetName,
        reaction: 'Analytical Evaluation',
        acceptanceScore: 78,
        response: `Evaluating "${demoQuestion}" from the perspective of ${targetName}: ${
          demoAudienceMode === 'custom' ? customAudienceDescription : persona.tagline
        }`,
        keyObjection:
          demoAudienceMode === 'custom'
            ? 'Needs clear proof of workflow fit and transparent onboarding terms.'
            : persona.concerns[0],
        opportunity: 'Highlight measurable outcomes and provide an interactive guided walkthrough.',
        engineMode: 'Sample AI-Generated Output',
      });
    } finally {
      setDemoLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#111827] flex flex-col">
      {/* Sticky Top Bar Contract — 3 Clean Zones, No Install App Clutter */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="focus:outline-none shrink-0"
          >
            <ClamirLogo size="md" />
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#6B7280]">
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#111827] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-[#111827] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('audiences')}
              className="hover:text-[#111827] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Audiences
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('interactive-demo')}
              className="hover:text-[#111827] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Interactive Demo
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('pricing')}
              className="hover:text-[#111827] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Pricing
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onGetStarted('signup')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="pt-20 pb-16 sm:pt-28 sm:pb-24 border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs font-mono tracking-widest text-[#6B7280] mb-5">
              AUDIENCE SIMULATION PLATFORM · CLEMIR AI ENGINE
            </p>
            <h1
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-[#111827] leading-[1.08]"
              style={{ textWrap: 'balance' }}
            >
              Understand Your Audience Before Making Your Move.
            </h1>
            <p className="mt-6 text-base sm:text-lg text-[#6B7280] leading-relaxed max-w-2xl mx-auto">
              Simulate customer reactions, define custom target audiences, explore pricing elasticity, and uncover high-confidence opportunities with Clemir AI.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onGetStarted('simulations')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Explore Simulations</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onGetStarted('agent')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#111827] bg-white border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                <span>Try Interactive Agent</span>
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#6B7280]">
              <span>Custom &amp; Built-In Persona Simulations</span>
              <span aria-hidden="true">·</span>
              <span>Multi-Persona Comparisons</span>
              <span aria-hidden="true">·</span>
              <span>Downloadable Research Reports</span>
            </div>
          </div>

          {/* Realistic Application Preview Card */}
          <div className="mt-16 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg overflow-hidden shadow-xs">
            {/* Top Simulation Window Header */}
            <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs font-semibold text-[#111827]">CLEMIR AI WORKSPACE</span>
                <span className="text-[#E5E7EB]">/</span>
                <h2 className="text-sm font-semibold text-[#111827] truncate">
                  {sampleSim.name}
                </h2>
                <span className="text-xs text-[#6B7280] hidden sm:inline">
                  · Simulated Output Preview (Not Actual Human Research)
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBriefModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#111827] bg-white border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Full Brief</span>
                </button>
              </div>
            </div>

            {/* Preview Body Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E7EB]">
              {/* Left Column: Customer Persona Selector Cards */}
              <div className="lg:col-span-4 p-6 bg-white">
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-xs font-bold text-[#111827] tracking-tight">
                    SIMULATED AUDIENCE SEGMENTS
                  </span>
                  <span className="text-xs font-mono text-[#6B7280] tabular-nums">30 AI Agents</span>
                </div>
                <div className="space-y-2.5">
                  {sampleSim.results?.personaBreakdown.map((pb) => {
                    const isSelected = pb.personaId === activePreviewBreakdown?.personaId;
                    return (
                      <button
                        key={pb.personaId}
                        type="button"
                        onClick={() => setSelectedPreviewPersonaId(pb.personaId)}
                        className={`w-full text-left p-4 rounded-md border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#F9FAFB] border-[#000000]'
                            : 'bg-white border-[#E5E7EB] hover:bg-[#F9FAFB]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-[#111827]">{pb.personaName}</span>
                          <span className="text-xs font-mono font-bold text-[#111827] tabular-nums">
                            {pb.acceptanceScore}/100
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-[#6B7280] line-clamp-2">{pb.mainTakeaway}</p>
                        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-[#6B7280] font-mono">
                          <span>Reaction: {pb.overallReaction}</span>
                          <span>·</span>
                          <span>{pb.agentCount} agents</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Center Column: Selected Persona Simulated Opinion & Findings */}
              <div className="lg:col-span-5 p-6 bg-white flex flex-col justify-between">
                {activePreviewBreakdown && (
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#E5E7EB]">
                      <div>
                        <span className="text-xs font-mono text-[#6B7280]">SELECTED AUDIENCE RESPONSE</span>
                        <h3 className="text-base font-bold text-[#111827] mt-0.5">
                          {activePreviewBreakdown.personaName}
                        </h3>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-xs text-[#6B7280] block">Confidence</span>
                        <span className="text-sm font-bold text-[#111827] tabular-nums">
                          {activePreviewBreakdown.confidenceScore}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-[#6B7280] mb-2">
                        Simulated Persona Perspective:
                      </p>
                      <blockquote className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md text-xs sm:text-sm text-[#111827] leading-relaxed">
                        {activePreviewBreakdown.simulatedStatement}
                      </blockquote>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <p className="text-xs font-bold text-[#111827]">Core Reasoning &amp; Decision Logic</p>
                      <p className="text-xs text-[#6B7280] leading-relaxed">
                        {activePreviewBreakdown.reasoning}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
                  <p className="text-xs font-bold text-[#111827]">Executive Summary Finding</p>
                  <p className="mt-1 text-xs text-[#6B7280] leading-relaxed">
                    {sampleSim.results?.executiveSummary.mainFinding}
                  </p>
                </div>
              </div>

              {/* Right Column: Comparison Chart */}
              <div className="lg:col-span-3 p-6 bg-[#F9FAFB] flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-[#111827] block mb-1">
                    Audience Acceptance Matrix
                  </span>
                  <span className="text-[11px] text-[#6B7280] block mb-4">
                    Simulated score (0–100 scale)
                  </span>

                  <div className="space-y-4">
                    {sampleSim.results?.personaBreakdown.map((pb) => (
                      <div key={pb.personaId}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-[#111827]">{pb.personaName}</span>
                          <span className="font-mono font-semibold text-[#111827] tabular-nums">
                            {pb.acceptanceScore}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#E5E7EB] rounded-xs overflow-hidden">
                          <div
                            className="h-full bg-[#000000]"
                            style={{ width: `${pb.acceptanceScore}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-5 border-t border-[#E5E7EB]">
                    <span className="text-xs font-bold text-[#111827] block mb-2">
                      Overall Simulated Sentiment
                    </span>
                    <div className="w-full h-3 bg-[#E5E7EB] rounded-xs overflow-hidden flex">
                      <div
                        className="bg-[#000000] h-full"
                        style={{ width: `${sampleSim.results?.sentimentOverview.positive}%` }}
                        title="Positive"
                      />
                      <div
                        className="bg-[#9CA3AF] h-full"
                        style={{ width: `${sampleSim.results?.sentimentOverview.neutral}%` }}
                        title="Neutral"
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-[#6B7280] tabular-nums">
                      <span>Pos: {sampleSim.results?.sentimentOverview.positive}%</span>
                      <span>Neu: {sampleSim.results?.sentimentOverview.neutral}%</span>
                      <span>Neg: {sampleSim.results?.sentimentOverview.negative}%</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBriefModal(true)}
                  className="mt-6 w-full py-2.5 px-3 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  View Full Brief
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — 4 Simple Steps */}
      <section id="how-it-works" className="py-20 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-mono tracking-wider text-[#6B7280]">WORKFLOW</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
              How Clemir AI Works
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#6B7280]">
              Move from raw business hypothesis to custom audience simulations and executive-ready insights in four structured steps.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01.',
                title: 'Create Your Simulation',
                desc: 'Describe your idea, product, pricing model, or research question across seven specialized modes.',
              },
              {
                step: '02.',
                title: 'Define or Select Audience',
                desc: 'Define your own custom target audience segments or choose from calibrated customer personas.',
              },
              {
                step: '03.',
                title: 'Run the Simulation',
                desc: 'Let multi-agent AI customer personas evaluate your material and answer your question battery.',
              },
              {
                step: '04.',
                title: 'Explore Insights & Context',
                desc: 'Review comparisons, interrogate findings with the AI Research Agent, and export reports.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-6 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-[#111827]">{item.step}</span>
                  <h3 className="mt-3 text-base font-bold text-[#111827]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section — 7 Main Capabilities */}
      <section id="features" className="py-20 bg-[#F9FAFB] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-mono tracking-wider text-[#6B7280]">CAPABILITIES</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
              Seven Specialized Intelligence Engines
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#6B7280]">
              Every simulation mode supports full custom audience creation, contextual material uploads, and interactive AI agent interrogation.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FlaskConical,
                title: 'Idea Validation',
                desc: 'Test new product concepts, hypotheses, and value propositions with any custom target audience before committing budget.',
              },
              {
                icon: Sliders,
                title: 'A/B Testing',
                desc: 'Compare Option A and Option B head-to-head with separate persona reactions, scoring, and a synthesized verdict.',
              },
              {
                icon: Compass,
                title: 'Market Exploration',
                desc: 'Investigate new industries, unmet customer needs, and competitive switching catalysts across custom segments.',
              },
              {
                icon: DollarSign,
                title: 'Pricing Analysis',
                desc: 'Evaluate multi-tier pricing structures, willingness to pay, and price sensitivity across any buyer profile.',
              },
              {
                icon: MousePointerClick,
                title: 'Usability Analysis',
                desc: 'Analyze website flows, onboarding tasks, and uploaded copy to spot cognitive friction early.',
              },
              {
                icon: Users,
                title: 'Customer Analysis',
                desc: 'Deep-dive into bespoke buyer segments, purchasing behaviors, and internal decision hurdles.',
              },
              {
                icon: Bot,
                title: 'Context & AI Research Agent',
                desc: 'Keep simulation context and AI research agents accessible everywhere—compare persona reasoning and run live grounded web searches.',
              },
            ].map((feat, idx) => {
              const IconComponent = feat.icon;
              return (
                <div
                  key={feat.title}
                  className={`p-6 bg-white border border-[#E5E7EB] rounded-lg ${
                    idx === 6
                      ? 'md:col-span-2 lg:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-6'
                      : ''
                  }`}
                >
                  <div>
                    <div className="w-9 h-9 rounded-md bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center text-[#111827]">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <h3 className="mt-4 text-base font-bold text-[#111827]">{feat.title}</h3>
                    <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">{feat.desc}</p>
                  </div>
                  {idx === 6 && (
                    <button
                      type="button"
                      onClick={() => onGetStarted('agent')}
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-center"
                    >
                      Launch Context &amp; AI Agent
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Audience Section — Custom Audience Flexibility + 7 Starter Personas */}
      <section id="audiences" className="py-20 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-mono tracking-wider text-[#6B7280]">AUDIENCE ENGINE</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
                Unlimited Custom Audiences &amp; Starter Archetypes
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#6B7280]">
                Define your own target audience from scratch for any industry, or customize and manage the seven starter personas in your workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onGetStarted('simulations')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111827] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Create Custom Audience in Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Custom Audience Builder Highlight Card */}
            <div className="p-5 bg-[#000000] text-white rounded-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-300">CUSTOM AUDIENCE ENGINE</span>
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <h3 className="mt-3 text-base font-bold">Define Any Target Audience</h3>
                <p className="mt-2 text-xs text-neutral-300 leading-relaxed">
                  Never be restricted to predefined templates. Create custom segments for enterprise buyers, healthcare directors, retail shoppers, Gen-Z gamers, or niche B2B operators.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onGetStarted('simulations')}
                className="mt-6 w-full py-2 px-3 text-xs font-semibold text-[#000000] bg-white rounded-md hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Define Custom Audience
              </button>
            </div>

            {BUILT_IN_PERSONAS.map((persona) => (
              <div
                key={persona.id}
                className="p-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-md bg-[#000000] text-white font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                      {persona.avatarCode}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#111827]">{persona.name}</h3>
                      <p className="text-xs text-[#6B7280]">{persona.segment}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-[#111827] font-medium leading-relaxed">
                    {persona.tagline}
                  </p>
                  <p className="mt-2 text-xs text-[#6B7280] leading-relaxed line-clamp-3">
                    {persona.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E7EB] grid grid-cols-3 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-[#6B7280] block">Price Sens.</span>
                    <span className="text-[#111827] font-semibold">{persona.priceSensitivity}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block">Speed</span>
                    <span className="text-[#111827] font-semibold">{persona.decisionSpeed}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block">Loyalty</span>
                    <span className="text-[#111827] font-semibold tabular-nums">{persona.brandLoyalty}/100</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section — Supports Custom Audience Creation & Preset Personas */}
      <section id="interactive-demo" className="py-20 bg-[#F9FAFB] border-b border-[#E5E7EB]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-mono tracking-wider text-[#6B7280]">LIVE SANDBOX</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
                Interactive Audience Simulation Demo
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#6B7280]">
                Test any product question against either a starter persona or your own custom-defined target audience.
              </p>
            </div>

            {/* Mode Switcher: Preset Persona vs Define Custom Audience */}
            <div className="flex items-center gap-1 p-1 bg-white border border-[#E5E7EB] rounded-md self-start">
              <button
                type="button"
                onClick={() => setDemoAudienceMode('preset')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  demoAudienceMode === 'preset'
                    ? 'bg-[#000000] text-white'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                Starter Personas
              </button>
              <button
                type="button"
                onClick={() => setDemoAudienceMode('custom')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  demoAudienceMode === 'custom'
                    ? 'bg-[#000000] text-white'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                + Define Custom Audience
              </button>
            </div>
          </div>

          <div className="mt-8 bg-white border border-[#E5E7EB] rounded-lg p-6">
            <form onSubmit={handleRunInteractiveDemo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  Product Idea, Campaign, or Research Question
                </label>
                <input
                  type="text"
                  value={demoQuestion}
                  onChange={(e) => setDemoQuestion(e.target.value)}
                  placeholder="e.g., Would you switch to a $29/mo annual plan with AI audience testing?"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000] placeholder:text-[#9CA3AF]"
                />
              </div>

              {demoAudienceMode === 'preset' ? (
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                    Select Audience Persona (or switch to &ldquo;+ Define Custom Audience&rdquo; above)
                  </label>
                  <select
                    value={demoPersonaId}
                    onChange={(e) => setDemoPersonaId(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
                  >
                    {BUILT_IN_PERSONAS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.segment} ({p.priceSensitivity} Price Sensitivity)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#111827] mb-1">
                        Custom Audience Name *
                      </label>
                      <input
                        type="text"
                        value={customAudienceName}
                        onChange={(e) => setCustomAudienceName(e.target.value)}
                        placeholder="e.g., Bootstrapped SaaS Founders"
                        className="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-md placeholder:text-[#9CA3AF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#111827] mb-1">
                        Price Sensitivity
                      </label>
                      <select
                        value={customPriceSensitivity}
                        onChange={(e) => setCustomPriceSensitivity(e.target.value as PriceSensitivity)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-md"
                      >
                        <option value="Low">Low</option>
                        <option value="Moderate">Moderate</option>
                        <option value="High">High</option>
                        <option value="Very High">Very High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#111827] mb-1">
                        Decision Speed
                      </label>
                      <select
                        value={customDecisionSpeed}
                        onChange={(e) => setCustomDecisionSpeed(e.target.value as DecisionSpeed)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-md"
                      >
                        <option value="Instant">Instant</option>
                        <option value="Fast">Fast</option>
                        <option value="Deliberate">Deliberate</option>
                        <option value="Slow">Slow</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Custom Audience Context, Priorities &amp; Pain Points
                    </label>
                    <input
                      type="text"
                      value={customAudienceDescription}
                      onChange={(e) => setCustomAudienceDescription(e.target.value)}
                      placeholder="Describe their goals, budget constraints, and key pain points..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-md placeholder:text-[#9CA3AF]"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  disabled={demoLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{demoLoading ? 'Simulating Audience...' : 'Simulate Response'}</span>
                </button>
              </div>
            </form>

            {demoResponse && (
              <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#6B7280]">
                    <span className="font-bold text-[#111827]">{demoResponse.personaName}</span>
                    <span>·</span>
                    <span>Reaction: {demoResponse.reaction}</span>
                    <span>·</span>
                    <span className="tabular-nums">Acceptance Score: {demoResponse.acceptanceScore}/100</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#6B7280]">
                    {demoResponse.engineMode} (Simulated Feedback)
                  </span>
                </div>

                <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-3">
                  <p className="text-sm text-[#111827] leading-relaxed">{demoResponse.response}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#E5E7EB] text-xs">
                    <div>
                      <span className="font-semibold text-[#111827] block">Primary Simulated Objection:</span>
                      <span className="text-[#6B7280]">{demoResponse.keyObjection}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#111827] block">Identified Opportunity:</span>
                      <span className="text-[#6B7280]">{demoResponse.opportunity}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Section — 3 Pricing Cards (Explorer includes Accounts & Reports) */}
      <section id="pricing" className="py-20 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-mono tracking-wider text-[#6B7280]">PRICING</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
              Transparent Plans for Every Research Stage
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#6B7280]">
              Every plan—starting with Explorer (Free)—includes custom audience creation, AI Research Agent context, and full Accounts &amp; Reports access.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {platformConfig.pricingPlans.map((plan) => {
              const isHighlighted = plan.id === 'Growth';
              return (
                <div
                  key={plan.id}
                  className={`p-6 rounded-lg border flex flex-col justify-between ${
                    isHighlighted
                      ? 'bg-[#F9FAFB] border-[#000000]'
                      : 'bg-white border-[#E5E7EB]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-bold text-[#111827]">{plan.name}</h3>
                      <span className="text-xs text-[#6B7280] font-mono">
                        {plan.id === 'Explorer' ? 'Free Tier' : plan.id === 'Growth' ? 'Most Popular' : 'Custom'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#6B7280]">{plan.audienceTag}</p>

                    <div className="mt-5 flex items-baseline gap-1 font-mono tabular-nums">
                      <span className="text-3xl font-bold text-[#111827]">{plan.priceLabel}</span>
                      {plan.billingPeriod && (
                        <span className="text-xs text-[#6B7280]">{plan.billingPeriod}</span>
                      )}
                    </div>

                    <p className="mt-3 text-xs text-[#6B7280] leading-relaxed">{plan.description}</p>

                    <ul className="mt-6 space-y-2.5 border-t border-[#E5E7EB] pt-5">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-xs text-[#111827]">
                          <Check className="w-4 h-4 text-[#000000] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => onGetStarted('signup')}
                    className={`mt-8 w-full py-2.5 px-4 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      isHighlighted
                        ? 'bg-[#000000] text-white hover:bg-neutral-800'
                        : 'bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {plan.id === 'Enterprise' ? 'Get Started — Contact Team' : `Get Started with ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA — Dark Background Section */}
      <section className="py-20 bg-[#000000] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Stop Guessing. Start Simulating.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-neutral-300">
            Make more informed decisions with Clemir AI.
          </p>
          <div className="mt-8">
            <button
              type="button"
              onClick={() => onGetStarted('signup')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[#000000] bg-white rounded-md hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Clean, Balanced Three-Column Footer */}
      <footer className="bg-white border-t border-[#E5E7EB] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 text-xs text-[#6B7280]">
            {/* Left: © 2026 Clemir. All rights reserved. */}
            <div className="flex items-center justify-center md:justify-start gap-3">
              <ClamirLogo size="sm" />
              <span className="text-[#E5E7EB]">|</span>
              <span className="font-medium text-[#111827]">© 2026 Clemir. All rights reserved.</span>
            </div>

            {/* Center: Simulator and Audience Feedback. */}
            <div className="text-center font-medium text-[#111827]">
              Simulator and Audience Feedback.
            </div>

            {/* Right: Supporting footer elements, properly aligned */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-5 gap-y-2 font-medium text-[#6B7280]">
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="hover:text-[#111827] transition-colors cursor-pointer"
              >
                Product
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="hover:text-[#111827] transition-colors cursor-pointer"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('pricing')}
                className="hover:text-[#111827] transition-colors cursor-pointer"
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={() => setInfoModal('docs')}
                className="hover:text-[#111827] transition-colors cursor-pointer"
              >
                Documentation
              </button>
              <button
                type="button"
                onClick={() => setInfoModal('privacy')}
                className="hover:text-[#111827] transition-colors cursor-pointer"
              >
                Privacy
              </button>
              <button
                type="button"
                onClick={() => setInfoModal('terms')}
                className="hover:text-[#111827] transition-colors cursor-pointer"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() => setInfoModal('contact')}
                className="hover:text-[#111827] transition-colors cursor-pointer"
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* View Full Brief Modal */}
      {showBriefModal && sampleSim.results && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white border border-[#E5E7EB] rounded-lg p-6 my-8 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
              <div>
                <span className="text-xs font-mono text-[#6B7280]">SAMPLE SIMULATION BRIEF · CLEMIR AI</span>
                <h3 className="text-lg font-bold text-[#111827]">{sampleSim.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBriefModal(false)}
                className="p-1.5 text-[#6B7280] hover:text-[#111827] rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-5 text-xs sm:text-sm">
              <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md text-xs text-[#6B7280]">
                {sampleSim.results.simulationNotice}
              </div>

              <div>
                <h4 className="font-semibold text-[#111827]">Executive Summary</h4>
                <p className="mt-1 text-[#6B7280]">{sampleSim.results.executiveSummary.mainFinding}</p>
                <p className="mt-2 text-[#6B7280]">{sampleSim.results.executiveSummary.overallReaction}</p>
              </div>

              <div>
                <h4 className="font-semibold text-[#111827] mb-2">Persona Breakdown</h4>
                <div className="space-y-3">
                  {sampleSim.results.personaBreakdown.map((pb) => (
                    <div key={pb.personaId} className="p-3.5 border border-[#E5E7EB] rounded-md">
                      <div className="flex items-center justify-between font-semibold text-[#111827]">
                        <span>{pb.personaName}</span>
                        <span className="font-mono tabular-nums">Acceptance: {pb.acceptanceScore}/100</span>
                      </div>
                      <p className="mt-1 text-xs text-[#6B7280]">{pb.mainTakeaway}</p>
                      <p className="mt-2 text-xs italic text-[#111827] bg-[#F9FAFB] p-2.5 rounded border border-[#E5E7EB]">
                        {pb.simulatedStatement}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowBriefModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#111827] border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB] cursor-pointer"
                >
                  Close Preview
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBriefModal(false);
                    onGetStarted('simulations');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 cursor-pointer"
                >
                  Open in Clemir AI Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info Modal (Documentation, Privacy Policy, Terms, Contact) */}
      {infoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white border border-[#E5E7EB] rounded-lg p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-base font-bold text-[#111827]">
                {infoModal === 'docs' && 'Clemir AI Documentation & Methodology'}
                {infoModal === 'privacy' && 'Privacy Policy'}
                {infoModal === 'terms' && 'Terms of Service'}
                {infoModal === 'contact' && 'Contact Clemir AI'}
              </h3>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="p-1 text-[#6B7280] hover:text-[#111827] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 text-xs sm:text-sm text-[#6B7280] space-y-3 leading-relaxed">
              {infoModal === 'docs' && (
                <>
                  <p className="text-[#111827] font-medium">
                    Clemir AI Multi-Persona Simulation Architecture
                  </p>
                  <p>
                    1. <strong>Simulation &amp; Custom Audience Setup:</strong> Define your hypothesis, custom target audiences, research material (TXT, MD, CSV, JSON, PDF, DOCX, or live URL), and structured question battery.
                  </p>
                  <p>
                    2. <strong>Persona Calibration:</strong> Create custom audiences for any industry or customize existing personas with explicit price sensitivity, decision speed, brand loyalty (0–100), and core objections.
                  </p>
                  <p>
                    3. <strong>Methodological Transparency:</strong> All outputs are clearly labeled as AI-generated simulated feedback to complement—not fabricate—human user research.
                  </p>
                </>
              )}
              {infoModal === 'privacy' && (
                <>
                  <p>
                    Clemir AI isolates all workspace simulations, custom audiences, uploaded research materials, and AI agent conversations by workspace membership.
                  </p>
                  <p>
                    Uploaded research materials are processed strictly for simulation context extraction and are never shared across external workspaces.
                  </p>
                </>
              )}
              {infoModal === 'terms' && (
                <>
                  <p>
                    By using Clemir AI, you acknowledge that persona responses, sentiment scores, and executive summaries represent AI-generated simulations designed for hypothesis testing and decision support.
                  </p>
                  <p>
                    Users retain full ownership of all uploaded research materials, custom persona configurations, and exported reports.
                  </p>
                </>
              )}
              {infoModal === 'contact' && (
                <>
                  <p className="text-[#111827] font-medium">Enterprise &amp; Research Support</p>
                  <p>Email: research@clemir.ai</p>
                  <p>Enterprise Calibration &amp; Custom Integrations: enterprise@clemir.ai</p>
                </>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
