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
import { supabase } from '../supabaseClient.js';
import {
  deleteConversationInSupabase,
  saveConversationToSupabase,
  savePersonaToSupabase,
} from '../services/supabaseService.js';

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

const STARTER_PROMPTS = [
  {
    category: 'Task Planning',
    text: 'Help me build a step-by-step action plan and timeline for launching a new product.',
  },
  {
    category: 'Decision Making',
    text: 'Help me compare two strategic options and weigh the pros, cons, and risks.',
  },
  {
    category: 'Problem Solving',
    text: 'Help me diagnose why customers hesitate before converting and how to fix it.',
  },
  {
    category: 'Open Strategy',
    text: 'How should I structure pricing tiers so solo users and teams both see clear value?',
  },
  {
    category: 'Simulation Insights',
    text: 'Summarize the most important findings and recommendations from our workspace simulations.',
  },
  {
    category: 'Audience Perspective',
    text: 'What are the biggest concerns and decision factors across our target audience personas?',
  },
];

const FOLLOW_UP_CHIPS = [
  'Turn this into a step-by-step action plan',
  'Compare the pros, cons, and trade-offs',
  'What risks or blind spots should I watch out for?',
  'Give me a concrete example of how to apply this',
];

function formatDisplayMessage(text: string): string {
  if (!text) return '';
  return text
    .replace(/^\[Custom Audience & Context Note:[^\]]*\]\s*/i, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/\[Simulated Persona Statement\]\s*/gi, '')
    .replace(/\[Simulated [^\]]*Perspective\]:?\s*/gi, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^(\s*)\*\s+/gm, '$1- ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\*\*/g, '')
    .trim();
}

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
    initialSimulationId || ''
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
            `Custom target audience defined inside the AI Assistant.`,
          description:
            newAudienceDescription.trim() ||
            `Custom target audience defined inside the AI Assistant.`,
          avatarCode: newAudienceName.trim().slice(0, 2).toUpperCase(),
          tags: ['Custom Audience', newAudienceSegment.trim() || 'Target Segment'],
          context:
            customAudienceContextNote.trim() ||
            `Evaluates solutions within ${newAudienceSegment.trim() || 'custom market context'}.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user && data.persona) {
          await savePersonaToSupabase(
            session.user.id,
            data.persona.workspaceId || 'ws-default',
            data.persona
          ).catch(() => null);
        }
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
            ? `Audience Session: ${activePersona.name}`
            : activeSimulation
            ? `Study Discussion: ${activeSimulation.name.slice(0, 34)}`
            : 'Personal Assistant Session',
          simulationId: selectedSimId || null,
          personaId: selectedPersonaId || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user && data.conversation) {
          await saveConversationToSupabase(
            session.user.id,
            data.conversation.workspaceId,
            data.conversation
          ).catch(() => null);
        }
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
        const data = await res.json();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user && data.conversation) {
          await saveConversationToSupabase(
            session.user.id,
            data.conversation.workspaceId,
            data.conversation
          ).catch(() => null);
        }
        onConversationsChanged();
      }
    } catch {
      // Ignore
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await deleteConversationInSupabase(session.user.id, id).catch(() => false);
      }
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
          message: rawText,
          customContextNote: customAudienceContextNote.trim() || undefined,
          webSearch: webSearchEnabled,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user && data.conversation) {
          await saveConversationToSupabase(
            session.user.id,
            data.conversation.workspaceId,
            data.conversation
          ).catch(() => null);
        }
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
    navigator.clipboard.writeText(formatDisplayMessage(content));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 border border-[#E5E7EB] rounded-lg bg-white overflow-hidden min-h-[76vh]">
      {/* Left Panel: Context & Agents Selectors + Conversation History */}
      <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-[#E5E7EB] bg-[#F9FAFB] p-4 flex flex-col justify-between max-h-[76vh] overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#111827] tracking-wide">
              ASSISTANT &amp; CONTEXT
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
              <span>Conversation Mode / Context</span>
            </label>
            <select
              value={selectedSimId}
              onChange={(e) => setSelectedSimId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#000000]"
            >
              <option value="">Open Personal Assistant (Any Topic)</option>
              {simulations.map((sim) => (
                <option key={sim.id} value={sim.id}>
                  Simulation: {sim.name}
                </option>
              ))}
            </select>
          </div>

          {/* Target Audience / Persona Agent Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#111827]">
                <Users className="w-3.5 h-3.5" />
                <span>Audience Perspective (Optional)</span>
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
              <option value="">Direct Assistant Voice (No Persona Filter)</option>
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
              <div>
                <label className="block text-[10px] font-semibold text-[#111827] mb-0.5">Audience Name *</label>
                <input
                  type="text"
                  required
                  value={newAudienceName}
                  onChange={(e) => setNewAudienceName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#111827] mb-0.5">Segment / Industry</label>
                <input
                  type="text"
                  value={newAudienceSegment}
                  onChange={(e) => setNewAudienceSegment(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#111827] mb-0.5">Description</label>
                <input
                  type="text"
                  value={newAudienceDescription}
                  onChange={(e) => setNewAudienceDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs"
                />
              </div>
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
              Additional Context or Goal (Optional)
            </label>
            <input
              type="text"
              value={customAudienceContextNote}
              onChange={(e) => setCustomAudienceContextNote(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md text-[#111827] focus:outline-none focus:border-[#000000]"
            />
          </div>

          {/* Conversation History List */}
          <div className="pt-3 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-semibold text-[#6B7280] tracking-wider">
                CONVERSATIONS ({conversations.length})
              </span>
              {activeConv && activeConv.messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetConversation}
                  className="inline-flex items-center gap-1 text-[10px] text-[#6B7280] hover:text-[#111827] cursor-pointer"
                  title="Clear messages in current conversation"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-[11px] text-[#6B7280] py-1">
                  Send any message to start your first conversation.
                </p>
              ) : (
                conversations.map((conv) => {
                  const isSelected = conv.id === activeConv?.id;
                  return (
                    <div
                      key={conv.id}
                      className={`group flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-md text-xs transition-colors ${
                        isSelected
                          ? 'bg-[#000000] text-white font-semibold'
                          : 'bg-white border border-[#E5E7EB] text-[#111827] hover:border-[#000000]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveConvId(conv.id)}
                        className="flex items-center gap-2 truncate text-left flex-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{conv.title || 'Conversation'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteConversation(conv.id)}
                        className={`opacity-0 group-hover:opacity-100 cursor-pointer shrink-0 ${
                          isSelected ? 'text-gray-300 hover:text-white' : 'text-[#6B7280] hover:text-red-600'
                        }`}
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
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
              {activeConv?.title || 'Clamir Personal AI Assistant'}
            </span>
            {activePersona ? (
              <span className="text-xs font-mono text-[#6B7280]">
                · Perspective: {activePersona.name}
              </span>
            ) : activeSimulation ? (
              <span className="text-xs font-mono text-[#6B7280]">
                · Study: {activeSimulation.name}
              </span>
            ) : (
              <span className="text-xs font-mono text-[#6B7280]">
                · Open Conversation, Planning &amp; Strategy
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeSimulation && (
              <button
                type="button"
                onClick={() => onOpenSimulation(activeSimulation.id)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#111827] hover:underline cursor-pointer shrink-0"
              >
                <span>Open Simulation</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowRightContext(!showRightContext)}
              className="hidden lg:inline-flex text-[11px] font-mono text-[#6B7280] hover:text-[#111827] cursor-pointer"
            >
              {showRightContext ? 'Hide Panel' : 'Show Panel'}
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!activeConv || activeConv.messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center max-w-xl mx-auto space-y-5">
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-[#111827]">
                  Your Personal AI Assistant &amp; Strategic Partner
                </h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Ask anything—plan tasks and projects, work through complex problems and decisions, brainstorm ideas, or analyze{' '}
                  <strong className="text-[#111827]">
                    {activeSimulation ? activeSimulation.name : 'your audience simulations'}
                  </strong>
                  {activePersona ? ` with ${activePersona.name}` : ''}.
                </p>
              </div>

              <div>
                <span className="block text-[11px] font-mono text-[#6B7280] mb-2 text-center">
                  CONVERSATION STARTERS
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STARTER_PROMPTS.map((item) => (
                    <button
                      key={item.text}
                      type="button"
                      onClick={() => handleSendMessage(item.text)}
                      className="p-3 text-left bg-[#F9FAFB] border border-[#E5E7EB] rounded-md hover:border-[#000000] transition-colors cursor-pointer space-y-1"
                    >
                      <span className="block text-[10px] font-mono font-semibold text-[#6B7280] uppercase">
                        {item.category}
                      </span>
                      <span className="block text-xs font-medium text-[#111827]">
                        {item.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeConv.messages.map((msg) => {
                const cleanContent = formatDisplayMessage(msg.content);
                return (
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
                            Clamir Assistant
                            {msg.webSearchUsed ? ' · Live Web Research' : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, cleanContent)}
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

                      <div className="whitespace-pre-line">{cleanContent}</div>

                      {/* Web Search Citations when present */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#E5E7EB] space-y-1.5">
                          <span className="block text-[11px] font-mono font-semibold text-[#111827]">
                            Referenced Web Sources:
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
                                  <span>
                                    [{idx + 1}] {src.title || src.uri}
                                  </span>
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
                );
              })}

              {/* Interactive Follow-Up Suggestions */}
              {!sending &&
                activeConv.messages.length > 0 &&
                activeConv.messages[activeConv.messages.length - 1]?.role === 'assistant' && (
                  <div className="pt-2">
                    <span className="block text-[10px] font-mono text-[#6B7280] mb-1.5">
                      CONTINUE THIS CONVERSATION
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {FOLLOW_UP_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleSendMessage(chip)}
                          className="px-2.5 py-1 text-xs bg-white border border-[#E5E7EB] rounded-md text-[#111827] hover:border-[#000000] transition-colors cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </>
          )}
          {sending && (
            <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-xs text-[#6B7280] max-w-md font-mono">
              Thinking{webSearchEnabled ? ' and searching live web sources' : ''}...
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
                <span>
                  Web Search: {webSearchEnabled ? 'On (Live Web Sources)' : 'Off'}
                </span>
              </button>

              <span className="text-[11px] text-[#6B7280]">
                Ask about any topic, plan tasks, solve problems, or analyze simulations
              </span>
            </div>
          </form>
        </div>
      </div>

      {/* Right Panel: Active Context & Agents Details */}
      {showRightContext && (
        <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-4 overflow-y-auto max-h-[76vh]">
          <h3 className="text-xs font-bold text-[#111827] tracking-wide border-b border-[#E5E7EB] pb-2">
            ACTIVE CONTEXT
          </h3>

          {activeSimulation ? (
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#6B7280] block text-[11px]">Selected Simulation</span>
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
                      Audience Sentiment
                    </span>
                    <div className="flex justify-between text-[11px]">
                      <span>Positive: {activeSimulation.results.sentimentOverview.positive}%</span>
                      <span>Neutral: {activeSimulation.results.sentimentOverview.neutral}%</span>
                      <span>Negative: {activeSimulation.results.sentimentOverview.negative}%</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[#6B7280] block text-[11px] mb-1">
                      Evaluated Personas ({activeSimulation.results.personaBreakdown.length})
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

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => onOpenSimulation(activeSimulation.id)}
                  className="w-full py-2 px-3 text-xs font-semibold text-[#111827] bg-white border border-[#E5E7EB] rounded-md hover:bg-gray-100 cursor-pointer"
                >
                  Open Full Simulation Report
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSimId('')}
                  className="w-full py-1.5 px-3 text-[11px] text-[#6B7280] hover:text-[#111827] cursor-pointer"
                >
                  Switch to General Assistant Mode
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white border border-[#E5E7EB] rounded-md space-y-1.5">
                <span className="font-semibold text-[#111827] block">
                  Personal Assistant Mode Active
                </span>
                <p className="text-[#6B7280] leading-relaxed">
                  You can converse naturally about any topic, plan tasks and projects, evaluate decisions, or solve problems.
                </p>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Want to focus on a specific study? Select any simulation or audience persona from the dropdowns on the left.
              </p>
            </div>
          )}

          {activePersona && (
            <div className="pt-4 border-t border-[#E5E7EB] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#6B7280] block">
                  ACTIVE AUDIENCE PERSPECTIVE
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPersonaId('')}
                  className="text-[10px] text-[#6B7280] hover:text-[#111827] underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
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
