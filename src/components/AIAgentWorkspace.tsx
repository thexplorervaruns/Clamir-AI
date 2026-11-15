import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Layers,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  AgentConversation,
  Persona,
  Simulation,
} from '../types/clamir.ts';

interface AIAgentWorkspaceProps {
  conversations: AgentConversation[];
  simulations: Simulation[];
  personas: Persona[];
  initialSimulationId?: string | null;
  initialPersonaId?: string | null;
  authToken: string;
  onConversationsChanged: () => void;
  onPersonasChanged?: () => void;
  onOpenSimulation: (simulationId: string) => void;
}

const SUGGESTED_PROMPTS = [
  'What are the biggest customer concerns?',
  'Which persona preferred Option A?',
  'What should we improve?',
  'Explain the simulation results.',
  'Compare the pricing options.',
  'What opportunities did we miss?',
];

export const AIAgentWorkspace: React.FC<AIAgentWorkspaceProps> = ({
  conversations,
  simulations,
  personas,
  initialSimulationId = null,
  initialPersonaId = null,
  authToken,
  onConversationsChanged,
  onPersonasChanged,
  onOpenSimulation,
}) => {
  const [activeConvId, setActiveConvId] = useState<string | null>(
    conversations[0]?.id || null
  );
  const [selectedSimId, setSelectedSimId] = useState<string>(
    initialSimulationId || simulations[0]?.id || ''
  );
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    initialPersonaId || ''
  );
  const [customAudienceContextNote, setCustomAudienceContextNote] = useState('');
  const [showCreateCustomAudience, setShowCreateCustomAudience] = useState(false);
  const [newAudienceName, setNewAudienceName] = useState('');
  const [newAudienceSegment, setNewAudienceSegment] = useState('');
  const [newAudienceDescription, setNewAudienceDescription] = useState('');

  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRightContext, setShowRightContext] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialSimulationId) {
      setSelectedSimId(initialSimulationId);
    }
    if (initialPersonaId) {
      setSelectedPersonaId(initialPersonaId);
    }
  }, [initialSimulationId, initialPersonaId]);

  useEffect(() => {
    if (!activeConvId && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId]);

  const activeConv = conversations.find((c) => c.id === activeConvId) || null;
  const activeSimulation = simulations.find((s) => s.id === selectedSimId) || null;
  const activePersona = personas.find((p) => p.id === selectedPersonaId) || null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages.length, sending]);

  const handleCreateCustomAudienceForAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAudienceName.trim()) return;
    try {
      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: newAudienceName.trim(),
          segment: newAudienceSegment.trim() || 'Custom Defined Audience',
          tagline:
            newAudienceDescription.trim() ||
            `Custom target audience defined inside the AI Research Agent.`,
          description:
            newAudienceDescription.trim() ||
            `Custom target audience defined inside the AI Research Agent.`,
          avatarCode: newAudienceName.trim().slice(0, 2).toUpperCase(),
          tags: ['Custom Audience', newAudienceSegment.trim() || 'Target Segment'],
          context:
            customAudienceContextNote.trim() ||
            `Evaluates solutions within ${newAudienceSegment.trim() || 'custom market context'}.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (onPersonasChanged) onPersonasChanged();
        if (data.persona?.id) {
          setSelectedPersonaId(data.persona.id);
        }
        setNewAudienceName('');
        setNewAudienceSegment('');
        setNewAudienceDescription('');
        setShowCreateCustomAudience(false);
      }
    } catch {
      // Ignore
    }
  };

  const handleStartNewConversation = async () => {
    try {
      const res = await fetch('/api/agent/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: activePersona
            ? `Persona Interview: ${activePersona.name}`
            : activeSimulation
            ? `Analysis: ${activeSimulation.name.slice(0, 36)}`
            : 'New Research Conversation',
          simulationId: selectedSimId || null,
          personaId: selectedPersonaId || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onConversationsChanged();
        setActiveConvId(data.conversation.id);
      }
    } catch {
      // Ignore error
    }
  };

  const handleResetConversation = async () => {
    if (!activeConv) return;
    try {
      const res = await fetch(`/api/agent/conversations/${activeConv.id}/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        onConversationsChanged();
      }
    } catch {
      // Ignore
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/agent/conversations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        if (activeConvId === id) {
          const remaining = conversations.filter((c) => c.id !== id);
          setActiveConvId(remaining[0]?.id || null);
        }
        onConversationsChanged();
      }
    } catch {
      // Ignore
    }
  };

  const handleSendMessage = async (promptText?: string) => {
    const rawText = (promptText ?? inputMessage).trim();
    if (!rawText || sending) return;
    if (!promptText) setInputMessage('');
    setSending(true);

    const contextualizedMessage = customAudienceContextNote.trim()
      ? `[Custom Audience & Context Note: ${customAudienceContextNote.trim()}]\n${rawText}`
      : rawText;

    try {
      const res = await fetch('/api/agent/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          conversationId: activeConv?.id || null,
          simulationId: selectedSimId || null,
          personaId: selectedPersonaId || null,
          message: contextualizedMessage,
          webSearch: webSearchEnabled,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onConversationsChanged();
        if (data.conversation?.id) {
          setActiveConvId(data.conversation.id);
        }
      }
    } finally {
      setSending(false);
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 border border-[#E5E7EB] rounded-lg bg-white overflow-hidden min-h-[76vh]">
      {/* Left Panel: Context & Agents Selectors + Conversation History */}
      <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-[#E5E7EB] bg-[#F9FAFB] p-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#111827] tracking-wide">
              CONTEXT &amp; AGENTS
            </h2>
            <button
              type="button"
              onClick={handleStartNewConversation}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#000000] text-white rounded-md hover:bg-neutral-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Simulation Context Selector */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#111827] mb-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Simulation Context</span>
            </label>
            <select
              value={selectedSimId}
              onChange={(e) => setSelectedSimId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#000000]"
            >
              <option value="">All Workspace Context</option>
              {simulations.map((sim) => (
                <option key={sim.id} value={sim.id}>
                  {sim.name}
                </option>
              ))}
            </select>
          </div>

          {/* Target Audience / Persona Agent Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#111827]">
                <Users className="w-3.5 h-3.5" />
                <span>Target Audience Agent</span>
              </label>
              <button
                type="button"
                onClick={() => setShowCreateCustomAudience(!showCreateCustomAudience)}
                className="text-[10px] font-semibold text-[#111827] underline cursor-pointer"
              >
                + Custom Audience
              </button>
            </div>
            <select
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#000000]"
            >
              <option value="">All Selected Simulation Personas</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.segment})
                </option>
              ))}
            </select>
          </div>

          {/* Inline Custom Audience Creator inside Agent */}
          {showCreateCustomAudience && (
            <form
              onSubmit={handleCreateCustomAudienceForAgent}
              className="p-3 bg-white border border-[#111827] rounded-md space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#111827] text-[11px]">Define Custom Audience</span>
                <button
                  type="button"
                  onClick={() => setShowCreateCustomAudience(false)}
                  className="text-[#6B7280] hover:text-[#111827] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                required
                value={newAudienceName}
                onChange={(e) => setNewAudienceName(e.target.value)}
                placeholder="Audience Name (e.g., Retail Buyers)"
                className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs"
              />
              <input
                type="text"
                value={newAudienceSegment}
                onChange={(e) => setNewAudienceSegment(e.target.value)}
                placeholder="Segment / Industry"
                className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs"
              />
              <input
                type="text"
                value={newAudienceDescription}
                onChange={(e) => setNewAudienceDescription(e.target.value)}
                placeholder="Goals, mindset, or objections..."
                className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs"
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-[#000000] text-white font-semibold rounded text-xs cursor-pointer"
              >
                Save &amp; Select Audience
              </button>
            </form>
          )}

          {/* Custom Context Override / Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
              Additional Custom Context (Optional)
            </label>
            <input
              type="text"
              value={customAudienceContextNote}
              onChange={(e) => setCustomAudienceContextNote(e.target.value)}
              placeholder="e.g., Focus on European enterprise buyers..."
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#000000]"
            />
          </div>
        </div>
      </div>

      {/* Center Panel: Chat Messages & Composer */}
      <div
        className={`${
          showRightContext ? 'lg:col-span-6' : 'lg:col-span-9'
        } flex flex-col justify-between bg-white h-[76vh]`}
      >
        {/* Top Bar inside Agent */}
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="w-4 h-4 text-[#111827] shrink-0" />
            <span className="text-xs font-semibold text-[#111827] truncate">
              {activeConv?.title || 'Clamir AI Research Agent'}
            </span>
            {activePersona && (
              <span className="text-xs font-mono text-[#6B7280]">
                · Audience: {activePersona.name}
              </span>
            )}
          </div>

          {activeSimulation && (
            <button
              type="button"
              onClick={() => onOpenSimulation(activeSimulation.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#111827] hover:underline cursor-pointer shrink-0"
            >
              <span>Open Related Simulation</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!activeConv || activeConv.messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center max-w-xl mx-auto space-y-5">
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-[#111827]">
                  Interrogate Simulation Context &amp; Audience Agents
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Ask questions about{' '}
                  <strong className="text-[#111827]">
                    {activeSimulation ? activeSimulation.name : 'your workspace simulations'}
                  </strong>
                  {activePersona ? ` or interview ${activePersona.name} directly` : ''}. Enable Web Search in the composer to ground responses with live external market sources.
                </p>
              </div>

              <div>
                <span className="block text-[11px] font-mono text-[#6B7280] mb-2 text-center">
                  SUGGESTED STARTER PROMPTS
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="p-3 text-left text-xs font-medium text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-md hover:border-[#000000] transition-colors cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            activeConv.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-2xl rounded-lg p-4 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#000000] text-white'
                      : 'bg-[#F9FAFB] text-[#111827] border border-[#E5E7EB]'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center justify-between gap-4 pb-2 mb-2 border-b border-[#E5E7EB] text-[11px] font-mono text-[#6B7280]">
                      <span>
                        Clamir AI Agent ·{' '}
                        {msg.webSearchUsed
                          ? 'Grounded Web Search + Simulated Audience Context'
                          : 'Simulated Audience Context'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="inline-flex items-center gap-1 text-[#111827] hover:underline cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="whitespace-pre-line">{msg.content}</div>

                  {/* Web Search Citations when present */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#E5E7EB] space-y-1.5">
                      <span className="block text-[11px] font-mono font-semibold text-[#111827]">
                        Verified External Web Sources (Distinguished from Simulated Persona Opinions):
                      </span>
                      <ul className="space-y-1">
                        {msg.sources.map((src, idx) => (
                          <li key={idx} className="text-xs">
                            <a
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#111827] underline hover:text-[#6B7280]"
                            >
                              <span>[{idx + 1}] {src.title || src.uri}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <span className="mt-1 text-[10px] font-mono text-[#6B7280]">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
          {sending && (
            <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-xs text-[#6B7280] max-w-md font-mono">
              Synthesizing response{webSearchEnabled ? ' with live Google Search grounding' : ''}...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer with Web Search Toggle */}
        <div className="p-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="space-y-2.5"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  activePersona
                    ? `Ask ${activePersona.name} a question...`
                    : 'Ask about simulation findings, audience objections, pricing, or market trends...'
                }
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
              />
              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              {/* Web Search Toggle Inside Composer */}
              <button
                type="button"
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                  webSearchEnabled
                    ? 'bg-[#000000] text-white border-[#000000]'
                    : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:text-[#111827]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Web Search: {webSearchEnabled ? 'Enabled (Live Citations)' : 'Off (Simulation Context Only)'}</span>
              </button>

              <span className="text-[11px] text-[#6B7280]">
                Persona outputs are simulated feedback · External web facts are cited separately
              </span>
            </div>
          </form>
        </div>
      </div>

      {/* Right Panel: Active Context & Agents Details */}
      {showRightContext && (
        <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-4 overflow-y-auto max-h-[76vh]">
          <h3 className="text-xs font-bold text-[#111827] tracking-wide border-b border-[#E5E7EB] pb-2">
            ACTIVE CONTEXT &amp; AGENTS
          </h3>

          {activeSimulation ? (
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#6B7280] block text-[11px]">Selected Simulation Context</span>
                <p className="font-semibold text-[#111827] mt-0.5">{activeSimulation.name}</p>
              </div>

              <div>
                <span className="text-[#6B7280] block text-[11px]">Target Audience</span>
                <p className="text-[#111827] mt-0.5">{activeSimulation.targetAudience}</p>
              </div>

              <div>
                <span className="text-[#6B7280] block text-[11px]">Hypothesis</span>
                <p className="text-[#111827] mt-0.5 leading-relaxed">{activeSimulation.hypothesis}</p>
              </div>

              {activeSimulation.results && (
                <>
                  <div className="p-3 bg-white border border-[#E5E7EB] rounded-md space-y-1.5 font-mono tabular-nums">
                    <span className="font-sans font-semibold text-[#111827] block">
                      Simulated Sentiment
                    </span>
                    <div className="flex justify-between text-[11px]">
                      <span>Positive: {activeSimulation.results.sentimentOverview.positive}%</span>
                      <span>Neutral: {activeSimulation.results.sentimentOverview.neutral}%</span>
                      <span>Negative: {activeSimulation.results.sentimentOverview.negative}%</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[#6B7280] block text-[11px] mb-1">
                      Agents in Simulation ({activeSimulation.results.personaBreakdown.length})
                    </span>
                    <div className="space-y-1.5">
                      {activeSimulation.results.personaBreakdown.map((pb) => (
                        <div
                          key={pb.personaId}
                          className="p-2.5 bg-white border border-[#E5E7EB] rounded text-xs"
                        >
                          <div className="flex justify-between font-semibold text-[#111827]">
                            <span>{pb.personaName}</span>
                            <span className="font-mono tabular-nums">{pb.acceptanceScore}/100</span>
                          </div>
                          <p className="text-[11px] text-[#6B7280] mt-0.5 line-clamp-2">
                            {pb.mainTakeaway}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => onOpenSimulation(activeSimulation.id)}
                className="w-full py-2 px-3 text-xs font-semibold text-[#111827] bg-white border border-[#E5E7EB] rounded-md hover:bg-gray-100 cursor-pointer"
              >
                Open Full Simulation Report
              </button>
            </div>
          ) : (
            <p className="text-xs text-[#6B7280]">
              Select a simulation on the left to inspect its hypothesis, audience agent scores, and executive summary here.
            </p>
          )}

          {activePersona && (
            <div className="pt-4 border-t border-[#E5E7EB] space-y-2 text-xs">
              <span className="text-[11px] font-mono text-[#6B7280] block">ACTIVE AUDIENCE AGENT</span>
              <p className="font-bold text-[#111827]">{activePersona.name}</p>
              <p className="text-[#6B7280]">{activePersona.tagline}</p>
              <p className="text-[11px] text-[#111827]">Context: {activePersona.context}</p>
              <div className="font-mono text-[11px] text-[#111827] space-y-0.5 pt-1">
                <div>Price Sensitivity: {activePersona.priceSensitivity}</div>
                <div>Decision Speed: {activePersona.decisionSpeed}</div>
                <div>Brand Loyalty: {activePersona.brandLoyalty}/100</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
