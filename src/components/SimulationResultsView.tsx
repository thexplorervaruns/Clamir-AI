import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Square,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { Simulation, SimulationStage } from '../types/clamir.ts';
import { exportSimulationReport } from '../utils/reportExporter.ts';
import { SIMULATION_TYPES_META } from '../data/seedData.ts';
import { supabase } from '../supabaseClient.js';
import { saveReportToSupabase } from '../services/supabaseService.js';
import { TimesFMForecastPanel } from './TimesFMForecastPanel.tsx';

interface SimulationResultsViewProps {
  simulation: Simulation;
  authToken: string;
  onBack: () => void;
  onUpdated: (sim: Simulation) => void;
  onOpenInAgent: (simId: string) => void;
  onReportSaved: () => void;
  onDelete?: (simId: string) => void;
}

const ORDERED_STAGES: SimulationStage[] = [
  'Preparing simulation',
  'Searching the web',
  'Analyzing sources',
  'Verifying information',
  'Generating results',
  'Completed',
];

export const SimulationResultsView: React.FC<SimulationResultsViewProps> = ({
  simulation,
  authToken,
  onBack,
  onUpdated,
  onOpenInAgent,
  onReportSaved,
  onDelete,
}) => {
  const [selectedPersonaTab, setSelectedPersonaTab] = useState<string>(
    simulation.results?.personaBreakdown[0]?.personaId || ''
  );
  const [stopping, setStopping] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Poll backend when simulation is Active
  useEffect(() => {
    if (simulation.status !== 'Active') {
      if (
        simulation.results?.personaBreakdown.length &&
        !simulation.results.personaBreakdown.some((p) => p.personaId === selectedPersonaTab)
      ) {
        setSelectedPersonaTab(simulation.results.personaBreakdown[0].personaId);
      }
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/simulations/${simulation.id}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          onUpdated(data.simulation);
        }
      } catch {
        // Ignore transient network poll error
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [simulation.id, simulation.status, authToken]);

  const handleStopSimulation = async () => {
    setStopping(true);
    try {
      const res = await fetch(`/api/simulations/${simulation.id}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.simulation);
      }
    } finally {
      setStopping(false);
    }
  };

  const handleExport = async (format: 'PDF' | 'JSON' | 'TXT' | 'CSV') => {
    exportSimulationReport(simulation, format);
    setExportFeedback(`Exported ${format} report and saved to Account & Reports.`);

    try {
      const reportPayload = {
        simulationId: simulation.id,
        simulationName: simulation.name,
        title: `${simulation.name} — ${format} Report`,
        format,
        summarySnippet:
          simulation.results?.executiveSummary.mainFinding || simulation.description,
      };
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await saveReportToSupabase(
          session.user.id,
          simulation.workspaceId || 'ws-default',
          reportPayload
        ).catch(() => null);
      }
      await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(reportPayload),
      });
      onReportSaved();
    } catch {
      // Non-blocking
    }

    setTimeout(() => setExportFeedback(null), 4000);
  };

  const currentStageIdx = ORDERED_STAGES.indexOf(simulation.stage);
  const typeMeta = SIMULATION_TYPES_META.find((m) => m.id === simulation.type);
  const res = simulation.results;
  const activePersonaBreakdown =
    res?.personaBreakdown.find((p) => p.personaId === selectedPersonaTab) ||
    res?.personaBreakdown[0];

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7280] hover:text-[#111827] mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Simulations</span>
          </button>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#6B7280]">
            <span>{typeMeta?.name || simulation.type}</span>
            <span>·</span>
            <span>Started {new Date(simulation.startedAt).toLocaleString()}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827] mt-1">{simulation.name}</h1>
          {simulation.researchObjectives && (
            <p className="text-xs sm:text-sm text-[#6B7280] mt-1">{simulation.researchObjectives}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {simulation.status === 'Active' ? (
            <button
              type="button"
              disabled={stopping}
              onClick={handleStopSimulation}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>{stopping ? 'Stopping...' : 'Stop Simulation'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onOpenInAgent(simulation.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Analyze in AI Agent</span>
              </button>
              {(['PDF', 'JSON', 'CSV', 'TXT'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleExport(fmt)}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{fmt}</span>
                </button>
              ))}
            </>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(simulation.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-white border border-[#E5E7EB] rounded-md hover:border-red-400 hover:bg-red-50 cursor-pointer"
              title="Delete simulation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {exportFeedback && (
        <div className="p-3 bg-[#F9FAFB] border border-[#111827] rounded-md text-xs font-medium text-[#111827]">
          {exportFeedback}
        </div>
      )}

      {/* Mandatory Simulated Feedback Transparency Banner */}
      <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md flex items-start gap-2.5 text-xs text-[#6B7280]">
        <FileText className="w-4 h-4 text-[#111827] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#111827]">Simulated Feedback Notice:</strong>{' '}
          {res?.simulationNotice ||
            'All responses, sentiment scores, and persona statements in this workspace are AI-generated audience simulations for decision support, not actual human survey respondents.'}
        </div>
      </div>

      {/* SECTION 10: REAL-TIME PROCESSING WORKFLOW */}
      {simulation.status === 'Active' && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-[#6B7280]">LIVE BACKEND JOB STATUS</span>
              <h2 className="text-lg font-bold text-[#111827] mt-0.5">
                Stage: {simulation.stage}
              </h2>
            </div>
            <div className="text-right font-mono tabular-nums">
              <span className="text-2xl font-bold text-[#111827]">{simulation.progress}%</span>
              {typeof simulation.estimatedSecondsRemaining === 'number' &&
                simulation.estimatedSecondsRemaining > 0 && (
                  <span className="block text-xs text-[#6B7280]">
                    Est. remaining: ~{simulation.estimatedSecondsRemaining}s
                  </span>
                )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-[#E5E7EB] rounded-sm overflow-hidden">
            <div
              className="h-full bg-[#000000] transition-all duration-300"
              style={{ width: `${simulation.progress}%` }}
            />
          </div>

          {/* 6 Stages Pipeline */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {ORDERED_STAGES.map((stageName, idx) => {
              const isDone = currentStageIdx > idx || simulation.stage === 'Completed';
              const isCurrent = simulation.stage === stageName;
              return (
                <div
                  key={stageName}
                  className={`p-3 rounded-md border text-xs ${
                    isCurrent
                      ? 'bg-[#000000] text-white border-[#000000] font-semibold'
                      : isDone
                      ? 'bg-[#F9FAFB] text-[#111827] border-[#E5E7EB]'
                      : 'bg-white text-[#6B7280] border-[#E5E7EB]'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                    <span>0{idx + 1}</span>
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isCurrent ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : null}
                  </div>
                  <div className="truncate">{stageName}</div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B7280] font-mono">
            <span>Started: {new Date(simulation.startedAt).toLocaleTimeString()}</span>
            <span>
              Personas queued: {simulation.selectedPersonas.map((p) => `${p.personaName} (${p.agentCount})`).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Stopped or Failed State */}
      {(simulation.status === 'Stopped' || simulation.status === 'Failed') && !res && (
        <div className="p-6 bg-white border border-[#E5E7EB] rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-[#111827]">
              Simulation {simulation.status} at stage &ldquo;{simulation.stage}&rdquo; ({simulation.progress}%)
            </h3>
            <p className="text-xs text-[#6B7280] mt-1">
              This simulation run was halted before final insight synthesis completed.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 11: COMPLETED SIMULATION RESULTS */}
      {res && (
        <div className="space-y-6">
          {/* Executive Summary + Sentiment Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <h2 className="text-base font-bold text-[#111827]">Executive Summary</h2>
                <span className="text-xs font-mono text-[#6B7280]">
                  Engine:{' '}
                  {res.aiEngineMode === 'openrouter-gemini-2.5-flash' ||
                  res.aiEngineMode === 'openrouter-live'
                    ? 'OpenRouter (google/gemini-2.5-flash) · Live Web Research'
                    : 'Clemir Evidence Simulation Engine'}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-[#6B7280] block">Main Finding</span>
                <p className="text-sm sm:text-base font-semibold text-[#111827] mt-1 leading-relaxed">
                  {res.executiveSummary.mainFinding}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-[#6B7280] block">Overall Audience Reaction</span>
                <p className="text-xs sm:text-sm text-[#111827] mt-1 leading-relaxed">
                  {res.executiveSummary.overallReaction}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#E5E7EB]">
                <div>
                  <span className="text-xs font-semibold text-[#111827] block mb-1.5">
                    Important Opportunities
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#6B7280]">
                    {res.executiveSummary.importantOpportunities.map((opp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#111827] font-mono">·</span>
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-xs font-semibold text-[#111827] block mb-1.5">
                    Main Concerns
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#6B7280]">
                    {res.executiveSummary.mainConcerns.map((con, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#111827] font-mono">·</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Sentiment Overview Visual Chart */}
            <div className="lg:col-span-4 bg-white border border-[#E5E7EB] rounded-lg p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-[#111827] border-b border-[#E5E7EB] pb-3">
                  Sentiment Overview
                </h2>
                <p className="text-xs text-[#6B7280] mt-2">
                  Aggregated distribution across all simulated persona responses.
                </p>

                {/* Stacked Bar */}
                <div className="mt-5 w-full h-4 bg-[#E5E7EB] rounded-sm overflow-hidden flex">
                  <div
                    className="bg-[#000000] h-full"
                    style={{ width: `${res.sentimentOverview.positive}%` }}
                  />
                  <div
                    className="bg-[#9CA3AF] h-full"
                    style={{ width: `${res.sentimentOverview.neutral}%` }}
                  />
                  <div
                    className="bg-[#E5E7EB] h-full"
                    style={{ width: `${res.sentimentOverview.negative}%` }}
                  />
                </div>

                {/* Detailed Bars */}
                <div className="mt-5 space-y-3 font-mono text-xs tabular-nums">
                  {[
                    { label: 'Positive', val: res.sentimentOverview.positive, barClass: 'bg-[#000000]' },
                    { label: 'Neutral', val: res.sentimentOverview.neutral, barClass: 'bg-[#6B7280]' },
                    { label: 'Negative', val: res.sentimentOverview.negative, barClass: 'bg-[#D1D5DB]' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between mb-1">
                        <span className="font-sans font-medium text-[#111827]">{item.label}</span>
                        <span className="font-semibold text-[#111827]">{item.val}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-sm overflow-hidden">
                        <div className={`h-full ${item.barClass}`} style={{ width: `${item.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E5E7EB] text-xs text-[#6B7280] flex items-center justify-between font-mono tabular-nums">
                <span>Total Simulated Personas: {res.personaBreakdown.length}</span>
                <span>
                  Total Agents: {res.personaBreakdown.reduce((acc, p) => acc + p.agentCount, 0)}
                </span>
              </div>
            </div>
          </div>

          {/* INTEGRATED TIMESFM QUANTILE FORECAST ARCHITECTURE */}
          <TimesFMForecastPanel
            simulation={simulation}
            authToken={authToken}
            onSimulationUpdated={onUpdated}
          />

          {/* A/B COMPARISON SECTION (When A/B Simulation or abComparison present) */}
          {res.abComparison && (
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3">
                <div>
                  <span className="text-xs font-mono text-[#6B7280]">HEAD-TO-HEAD COMPARISON</span>
                  <h2 className="text-base font-bold text-[#111827]">A/B Simulation Comparison Verdict</h2>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
                  <span>Option A Score: <strong>{res.abComparison.optionAScore}/100</strong></span>
                  <span>·</span>
                  <span>Option B Score: <strong>{res.abComparison.optionBScore}/100</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Option A Card */}
                <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#111827]">{res.abComparison.optionALabel}</h3>
                    <span className="text-sm font-mono font-bold text-[#111827] tabular-nums">
                      {res.abComparison.optionAScore}/100
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#E5E7EB] rounded-sm overflow-hidden">
                    <div className="h-full bg-[#000000]" style={{ width: `${res.abComparison.optionAScore}%` }} />
                  </div>
                  <div className="text-xs space-y-2">
                    <div>
                      <span className="font-semibold text-[#111827] block">Strengths:</span>
                      <ul className="text-[#6B7280] space-y-1 mt-1">
                        {res.abComparison.optionAStrengths.map((s, i) => (
                          <li key={i}>+ {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold text-[#111827] block">Weaknesses:</span>
                      <ul className="text-[#6B7280] space-y-1 mt-1">
                        {res.abComparison.optionAWeaknesses.map((w, i) => (
                          <li key={i}>- {w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Option B Card */}
                <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#111827]">{res.abComparison.optionBLabel}</h3>
                    <span className="text-sm font-mono font-bold text-[#111827] tabular-nums">
                      {res.abComparison.optionBScore}/100
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#E5E7EB] rounded-sm overflow-hidden">
                    <div className="h-full bg-[#000000]" style={{ width: `${res.abComparison.optionBScore}%` }} />
                  </div>
                  <div className="text-xs space-y-2">
                    <div>
                      <span className="font-semibold text-[#111827] block">Strengths:</span>
                      <ul className="text-[#6B7280] space-y-1 mt-1">
                        {res.abComparison.optionBStrengths.map((s, i) => (
                          <li key={i}>+ {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold text-[#111827] block">Weaknesses:</span>
                      <ul className="text-[#6B7280] space-y-1 mt-1">
                        {res.abComparison.optionBWeaknesses.map((w, i) => (
                          <li key={i}>- {w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Persona Preferences Table */}
              <div className="border-t border-[#E5E7EB] pt-4">
                <h3 className="text-xs font-semibold text-[#111827] mb-2">Persona Preference Breakdown</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {res.abComparison.personaPreferences.map((pp) => (
                    <div key={pp.personaName} className="p-3 border border-[#E5E7EB] rounded-md text-xs">
                      <div className="flex items-center justify-between font-semibold text-[#111827]">
                        <span>{pp.personaName}</span>
                        <span className="font-mono">{pp.preferredOption}</span>
                      </div>
                      <p className="mt-1 text-[#6B7280]">{pp.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md text-xs">
                <strong className="text-[#111827]">Overall Simulated Verdict:</strong>{' '}
                <span className="text-[#6B7280]">{res.abComparison.overallVerdict}</span>
              </div>
            </div>
          )}

          {/* Audience Preferences, Objections & Concerns, and Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Audience Preferences */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-bold text-[#111827] border-b border-[#E5E7EB] pb-2.5">
                Audience Preferences
              </h2>
              <div className="space-y-3.5">
                {res.audiencePreferences.map((pref, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#111827]">{pref.label}</span>
                      <span className="font-mono text-[#111827] tabular-nums">{pref.score}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#E5E7EB] rounded-sm overflow-hidden">
                      <div className="h-full bg-[#000000]" style={{ width: `${pref.score}%` }} />
                    </div>
                    <p className="text-xs text-[#6B7280]">{pref.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Objections and Concerns */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-bold text-[#111827] border-b border-[#E5E7EB] pb-2.5">
                Objections &amp; Concerns
              </h2>
              <div className="space-y-3.5">
                {res.objectionsAndConcerns.map((obj, i) => (
                  <div key={i} className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px] text-[#6B7280]">
                      <span>Severity: <strong className="text-[#111827]">{obj.severity}</strong></span>
                      <span className="tabular-nums">Freq: {obj.frequencyPct}%</span>
                    </div>
                    <p className="font-semibold text-[#111827]">{obj.objection}</p>
                    <p className="text-[#6B7280]">Mitigation: {obj.mitigation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Opportunities */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4">
              <h2 className="text-sm font-bold text-[#111827] border-b border-[#E5E7EB] pb-2.5">
                Identified Opportunities
              </h2>
              <div className="space-y-3.5">
                {res.opportunities.map((opp, i) => (
                  <div key={i} className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#111827]">{opp.title}</span>
                      <span className="font-mono text-[11px] text-[#6B7280]">Impact: {opp.impact}</span>
                    </div>
                    <p className="text-[#6B7280]">{opp.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PERSONA BREAKDOWN */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#111827]">Persona Breakdown</h2>
                <p className="text-xs text-[#6B7280]">
                  Inspect each persona&apos;s simulated reaction, acceptance score, question battery answers, and reasoning.
                </p>
              </div>

              {/* Persona Selector Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {res.personaBreakdown.map((pb) => (
                  <button
                    key={pb.personaId}
                    type="button"
                    onClick={() => setSelectedPersonaTab(pb.personaId)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                      activePersonaBreakdown?.personaId === pb.personaId
                        ? 'bg-[#000000] text-white border-[#000000]'
                        : 'bg-[#F9FAFB] text-[#111827] border-[#E5E7EB] hover:bg-gray-100'
                    }`}
                  >
                    {pb.personaName} ({pb.acceptanceScore}/100)
                  </button>
                ))}
              </div>
            </div>

            {activePersonaBreakdown && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-[#111827]">
                          {activePersonaBreakdown.personaName}
                        </h3>
                        <p className="text-xs text-[#6B7280]">{activePersonaBreakdown.segment}</p>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <span className="text-xl font-bold text-[#111827]">
                          {activePersonaBreakdown.acceptanceScore}/100
                        </span>
                        <span className="block text-[11px] text-[#6B7280]">Acceptance Score</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5E7EB] text-xs font-mono tabular-nums">
                      <div>
                        <span className="text-[#6B7280] block text-[11px]">Reaction</span>
                        <span className="font-semibold text-[#111827]">{activePersonaBreakdown.overallReaction}</span>
                      </div>
                      <div>
                        <span className="text-[#6B7280] block text-[11px]">Confidence</span>
                        <span className="font-semibold text-[#111827]">{activePersonaBreakdown.confidenceScore}%</span>
                      </div>
                      <div>
                        <span className="text-[#6B7280] block text-[11px]">Agents</span>
                        <span className="font-semibold text-[#111827]">{activePersonaBreakdown.agentCount}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-[#111827] block">Main Takeaway</span>
                    <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                      {activePersonaBreakdown.mainTakeaway}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-[#111827] block">
                      Perspective Statement
                    </span>
                    <blockquote className="mt-1.5 p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md text-xs text-[#111827] leading-relaxed">
                      {(activePersonaBreakdown.simulatedStatement || '')
                        .replace(/\[Simulated Persona Statement\]\s*/gi, '')
                        .replace(/\*\*/g, '')
                        .trim()}
                    </blockquote>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-[#111827] block">Reasoning</span>
                    <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                      {activePersonaBreakdown.reasoning}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-[#111827] block mb-1">Motivations</span>
                      <ul className="space-y-1 text-[#6B7280]">
                        {activePersonaBreakdown.motivations.map((m, i) => (
                          <li key={i}>• {m}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold text-[#111827] block mb-1">Objections</span>
                      <ul className="space-y-1 text-[#6B7280]">
                        {activePersonaBreakdown.objections.map((o, i) => (
                          <li key={i}>• {o}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[11px] font-mono text-[#6B7280]">
                    Uncertainty Indicator: {activePersonaBreakdown.uncertaintyNote}
                  </div>
                </div>

                {/* Question Battery Answers */}
                <div className="lg:col-span-7 space-y-3">
                  <h4 className="text-xs font-semibold text-[#111827]">
                    Question Battery Simulated Answers ({activePersonaBreakdown.answers.length})
                  </h4>
                  {activePersonaBreakdown.answers.map((ans, idx) => (
                    <div key={ans.questionId || idx} className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-1.5">
                      <p className="text-xs font-semibold text-[#111827]">
                        Q{idx + 1}. {ans.questionText}
                      </p>
                      <p className="text-xs text-[#6B7280] leading-relaxed">
                        <strong className="text-[#111827]">Simulated Answer:</strong> {ans.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RECOMMENDATIONS BY PRIORITY */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-4">
            <h2 className="text-base font-bold text-[#111827] border-b border-[#E5E7EB] pb-3">
              Prioritized Recommendations (High · Medium · Low)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {res.recommendations.map((rec) => (
                <div key={rec.id} className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="font-bold text-[#111827]">Priority: {rec.priority}</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#111827]">{rec.title}</h3>
                    <p className="mt-1.5 text-xs text-[#6B7280] leading-relaxed">{rec.explanation}</p>
                  </div>
                  <div className="mt-4 pt-2.5 border-t border-[#E5E7EB] text-[11px] font-mono text-[#111827]">
                    Expected Impact: {rec.expectedImpact}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EVIDENCE-BASED RESEARCH, METHODOLOGY, CALCULATIONS & SOURCES */}
          {res.structuredSimulationReport && (
            <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-6">
              <div className="border-b border-[#E5E7EB] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-mono text-[#6B7280]">
                    REAL-TIME WEB RESEARCH &amp; METHODOLOGY DOSSIER
                  </span>
                  <h2 className="text-base font-bold text-[#111827]">
                    Evidence, Methodology, Calculations &amp; Verified Sources
                  </h2>
                </div>
                <span className="text-xs font-mono text-[#6B7280]">
                  Sources Cited: {res.structuredSimulationReport.sourcesAndReferences?.length || 0}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {res.structuredSimulationReport.simulationOverview && (
                  <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-1">
                    <span className="font-bold text-[#111827] block">Simulation Overview</span>
                    <p className="text-[#6B7280] leading-relaxed">
                      {res.structuredSimulationReport.simulationOverview}
                    </p>
                  </div>
                )}
                {res.structuredSimulationReport.scenarioAndParameters && (
                  <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-1">
                    <span className="font-bold text-[#111827] block">User&apos;s Scenario &amp; Parameters</span>
                    <p className="text-[#6B7280] leading-relaxed">
                      {res.structuredSimulationReport.scenarioAndParameters}
                    </p>
                  </div>
                )}
              </div>

              {res.structuredSimulationReport.researchFindings && (
                <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md text-xs space-y-1.5">
                  <span className="font-bold text-[#111827] block">Real-Time Web Research Findings</span>
                  <p className="text-[#6B7280] leading-relaxed">
                    {res.structuredSimulationReport.researchFindings}
                  </p>
                </div>
              )}

              {res.structuredSimulationReport.importantFactsAndEvidence &&
                res.structuredSimulationReport.importantFactsAndEvidence.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold text-[#111827]">
                      Important Facts &amp; Evidence Classification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {res.structuredSimulationReport.importantFactsAndEvidence.map((item, idx) => (
                        <div key={idx} className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-1">
                          <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                            <span className="font-semibold text-[#111827]">{item.classification}</span>
                            <span className="text-[#6B7280] truncate">{item.sourceTitle}</span>
                          </div>
                          <p className="text-[#111827]">{item.claim}</p>
                          {item.sourceUrl && (
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono text-[#111827] underline block truncate"
                            >
                              {item.sourceUrl}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {res.structuredSimulationReport.simulationMethodology && (
                  <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-1.5">
                    <span className="font-bold text-[#111827] block">Simulation Methodology</span>
                    <p className="text-[#6B7280] leading-relaxed">
                      {res.structuredSimulationReport.simulationMethodology}
                    </p>
                  </div>
                )}

                {res.structuredSimulationReport.stepByStepResults &&
                  res.structuredSimulationReport.stepByStepResults.length > 0 && (
                    <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-1.5">
                      <span className="font-bold text-[#111827] block">Step-by-Step Simulation Results</span>
                      <ol className="list-decimal list-inside space-y-1 text-[#6B7280]">
                        {res.structuredSimulationReport.stepByStepResults.map((stepStr, idx) => (
                          <li key={idx}>{stepStr}</li>
                        ))}
                      </ol>
                    </div>
                  )}
              </div>

              {res.structuredSimulationReport.relevantCalculations &&
                res.structuredSimulationReport.relevantCalculations.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold text-[#111827]">
                      Relevant Calculations &amp; Quantitative Justification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {res.structuredSimulationReport.relevantCalculations.map((calc, idx) => (
                        <div key={idx} className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-1 font-mono">
                          <div className="font-bold text-[#111827] font-sans">{calc.metric}</div>
                          <div className="text-[11px] text-[#6B7280]">Formula: {calc.formula}</div>
                          <div className="text-[11px] text-[#6B7280]">Inputs: {calc.inputs}</div>
                          <div className="text-xs font-bold text-[#111827] pt-1">
                            Output: {calc.output}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {res.structuredSimulationReport.expectedOutcomes && (
                  <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-1">
                    <span className="font-bold text-[#111827] block">Expected Outcomes</span>
                    <p className="text-[#6B7280] leading-relaxed">
                      {res.structuredSimulationReport.expectedOutcomes}
                    </p>
                  </div>
                )}

                {res.structuredSimulationReport.risksAndLimitations &&
                  res.structuredSimulationReport.risksAndLimitations.length > 0 && (
                    <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-1">
                      <span className="font-bold text-[#111827] block">Risks &amp; Limitations</span>
                      <ul className="space-y-1 text-[#6B7280]">
                        {res.structuredSimulationReport.risksAndLimitations.map((r, idx) => (
                          <li key={idx}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>

              {res.structuredSimulationReport.sourcesAndReferences &&
                res.structuredSimulationReport.sourcesAndReferences.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold text-[#111827]">
                      Sources &amp; References (Firecrawl / Spider Live Extraction)
                    </h3>
                    <div className="space-y-2">
                      {res.structuredSimulationReport.sourcesAndReferences.map((src, idx) => (
                        <div key={idx} className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-semibold text-[#111827] block truncate">
                              [{idx + 1}] {src.title}
                            </span>
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono text-[#6B7280] underline truncate block"
                            >
                              {src.url}
                            </a>
                          </div>
                          <div className="text-[11px] font-mono text-[#6B7280] shrink-0">
                            {src.provider || 'Web'} · {src.authorityTier || 'Verified Source'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {res.structuredSimulationReport.finalConclusion && (
                <div className="p-4 bg-[#F9FAFB] border border-[#111827] rounded-md text-xs space-y-1">
                  <span className="font-bold text-[#111827] block">Final Conclusion</span>
                  <p className="text-[#111827] leading-relaxed">
                    {res.structuredSimulationReport.finalConclusion}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
