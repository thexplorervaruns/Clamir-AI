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
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  AdditionalContextBox,
  AgentConversation,
  AgentMessage,
  Persona,
  Simulation,
} from '../types/clamir.ts';
import {
  AdditionalContextManager,
  createEmptyContextBox,
  serializeAdditionalContexts,
} from './AdditionalContextManager.tsx';
import { cleanAiResponseText } from '../utils/cleanAiText.ts';
import { supabase } from '../supabaseClient.js';
import {
  saveConversationToSupabase,
  savePersonaToSupabase,
} from '../services/supabaseService.js';

interface AIAgentWorkspaceProps {
  conversations: AgentConversation[];
  simulations: Simulation[];
  personas: Persona[];
  additionalContexts?: AdditionalContextBox[];
  onAdditionalContextsChange?: (next: AdditionalContextBox[]) => void;
  initialSimulationId?: string | null;
  initialPersonaId?: string | null;
  authToken: string;
  onConversationsChanged: () => void;
  onConversationUpserted?: (conv: AgentConversation) => void;
  onConversationDeleted?: (conversationId: string) => void;
  onClearAllConversations?: () => void;
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

export const AIAgentWorkspace: React.FC<AIAgentWorkspaceProps> = ({
  conversations,
  simulations,
  personas,
  additionalContexts: controlledContexts,
  onAdditionalContextsChange,
  initialSimulationId = null,
  initialPersonaId = null,
  authToken,
  onConversationsChanged,
  onConversationUpserted,
  onConversationDeleted,
  onClearAllConversations,
  onPersonasChanged,
  onOpenSimulation,
}) => {
  const [activeConvId, setActiveConvId] = useState<string | null>(
    conversations[0]?.id || null
  );
  const [isNewChatDraft, setIsNewChatDraft] = useState(false);
  const [confirmClearAllHistory, setConfirmClearAllHistory] = useState(false);
  const [selectedSimId, setSelectedSimId] = useState<string>(
    initialSimulationId || ''
  );
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    initialPersonaId || ''
  );

  const [localContexts, setLocalContexts] = useState<AdditionalContextBox[]>(() => [
    createEmptyContextBox(),
  ]);
  const additionalContexts = controlledContexts ?? localContexts;
  const setAdditionalContexts = onAdditionalContextsChange ?? setLocalContexts;

  const [showCreateCustomAudience, setShowCreateCustomAudience] = useState(false);
  const [newAudienceName, setNewAudienceName] = useState('');
  const [newAudienceSegment, setNewAudienceSegment] = useState('');
  const [newAudienceDescription, setNewAudienceDescription] = useState('');

  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<AgentMessage[] | null>(null);

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
    if (!isNewChatDraft && !activeConvId && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId, isNewChatDraft]);

  const activeConv = isNewChatDraft
    ? null
    : conversations.find((c) => c.id === activeConvId) || null;
  const activeSimulation = simulations.find((s) => s.id === selectedSimId) || null;
  const activePersona = personas.find((p) => p.id === selectedPersonaId) || null;
  const displayedMessages = optimisticMessages ?? activeConv?.messages ?? [];

  useEffect(() => {
    setOptimisticMessages(null);
  }, [activeConv?.id, activeConv?.messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages.length, sending]);

  const getFreshToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      session,
      token: session?.access_token || authToken,
    };
  };

  const handleCreateCustomAudienceForAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAudienceName.trim()) return;
    try {
      const { session, token } = await getFreshToken();
      const combinedContext = serializeAdditionalContexts(additionalContexts);
      const res = await fetch('/api/personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newAudienceName.trim(),
          segment: newAudienceSegment.trim() || 'Custom Defined Audience',
          tagline:
            newAudienceDescription.trim() ||
            'Custom target audience defined inside the AI Assistant.',
          description:
            newAudienceDescription.trim() ||
            'Custom target audience defined inside the AI Assistant.',
          avatarCode: newAudienceName.trim().slice(0, 2).toUpperCase(),
          tags: ['Custom Audience', newAudienceSegment.trim() || 'Target Segment'],
          context:
            combinedContext ||
            `Evaluates solutions within ${newAudienceSegment.trim() || 'custom market context'}.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
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
      setErrorMsg('Unable to save custom audience. Please check your connection.');
    }
  };

  const handleStartNewConversation = async () => {
    setErrorMsg(null);
    setOptimisticMessages([]);
    setIsNewChatDraft(true);
    setActiveConvId(null);
  };

  const handleDeleteConversation = async (id: string) => {
    if (onConversationDeleted) {
      await onConversationDeleted(id);
    } else {
      const { token } = await getFreshToken();
      await fetch(`/api/agent/conversations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      onConversationsChanged();
    }
    if (activeConvId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      if (remaining[0]) {
        setIsNewChatDraft(false);
        setActiveConvId(remaining[0].id);
      } else {
        setIsNewChatDraft(true);
        setActiveConvId(null);
      }
    }
  };

  const handleClearAllHistory = async () => {
    setConfirmClearAllHistory(false);
    setOptimisticMessages([]);
    setIsNewChatDraft(true);
    setActiveConvId(null);
    if (onClearAllConversations) {
      await onClearAllConversations();
    }
  };

  const handleSendMessage = async (promptText?: string) => {
    const rawText = (promptText ?? inputMessage).trim();
    if (!rawText || sending) return;
    if (!promptText) setInputMessage('');
    setErrorMsg(null);
    setSending(true);
    setIsNewChatDraft(false);

    const priorHistory = activeConv?.messages || [];
    const tempUserMsg: AgentMessage = {
      id: `msg-temp-${Date.now()}`,
      role: 'user',
      content: rawText,
      timestamp: new Date().toISOString(),
    };
    setOptimisticMessages([...priorHistory, tempUserMsg]);

    try {
      const { session, token } = await getFreshToken();
      const cleanedContexts = additionalContexts
        .filter((c) => c.content.trim())
        .map((c) => ({
          id: c.id,
          title: c.title.trim(),
          content: c.content.trim(),
        }));
      const combinedNote = serializeAdditionalContexts(additionalContexts);

      const res = await fetch('/api/agent/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          conversationId: activeConv?.id || null,
          simulationId: selectedSimId || null,
          personaId: selectedPersonaId || null,
          message: rawText,
          customContextNote: combinedNote || undefined,
          additionalContexts: cleanedContexts,
          history: priorHistory,
          webSearch: webSearchEnabled,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.conversation) {
          const sanitizedConv: AgentConversation = {
            ...data.conversation,
            messages: Array.isArray(data.conversation.messages)
              ? data.conversation.messages.map((m: AgentMessage) =>
                  m.role === 'assistant' ? { ...m, content: cleanAiResponseText(m.content) } : m
                )
              : [],
          };
          setOptimisticMessages(sanitizedConv.messages);
          setActiveConvId(sanitizedConv.id);
          if (onConversationUpserted) {
            await onConversationUpserted(sanitizedConv);
          } else if (session?.user) {
            await saveConversationToSupabase(
              session.user.id,
              sanitizedConv.workspaceId,
              sanitizedConv
            ).catch(() => null);
            onConversationsChanged();
          } else {
            onConversationsChanged();
          }
        }
        return;
      }

      // Direct stateless fallback via /api/research/search + /api/ai/generate if auth route fails
      let fallbackSources: { title: string; uri: string }[] = [];
      let rawSources: any[] = [];

      if (webSearchEnabled) {
        const searchRes = await fetch('/api/research/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queries: [rawText] }),
        }).catch(() => null);

        if (searchRes && searchRes.ok) {
          const searchData = await searchRes.json();
          rawSources = Array.isArray(searchData.sources) ? searchData.sources : [];
          fallbackSources = rawSources.map((s: any) => ({
            title: s.title || s.url,
            uri: s.url,
          }));
        }
      }

      const aiRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...priorHistory.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: rawText },
          ],
          additionalContexts: cleanedContexts,
          customNote: combinedNote,
          systemPrompt:
            rawSources.length > 0
              ? `Live Web Sources:\n${rawSources
                  .map(
                    (s: any, i: number) =>
                      `[${i + 1}] ${s.title} (${s.url}): ${s.excerpt || ''}`
                  )
                  .join('\n')}`
              : undefined,
        }),
      });

      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        const fallbackAssistantMsg: AgentMessage = {
          id: `msg-a-local-${Date.now()}`,
          role: 'assistant',
          content: cleanAiResponseText(aiJson.content || aiJson.result || 'Response generated.'),
          timestamp: new Date().toISOString(),
          webSearchUsed: webSearchEnabled,
          sources: fallbackSources,
        };
        const updatedMessages = [...priorHistory, tempUserMsg, fallbackAssistantMsg];
        const savedConv: AgentConversation = {
          id: activeConv?.id || crypto.randomUUID(),
          workspaceId: activeConv?.workspaceId || 'ws-default',
          title: activeConv?.title || rawText.slice(0, 48),
          simulationId: selectedSimId || activeConv?.simulationId || null,
          personaId: selectedPersonaId || activeConv?.personaId || null,
          createdAt: activeConv?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: updatedMessages,
        };
        setOptimisticMessages(updatedMessages);
        setActiveConvId(savedConv.id);
        if (onConversationUpserted) {
          await onConversationUpserted(savedConv);
        }
      } else {
        setErrorMsg('Unable to get a response from Clemir AI right now. Please try again.');
      }
    } catch {
      setErrorMsg('Network issue while communicating with Clemir AI. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(cleanAiResponseText(content));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 border border-[#E5E7EB] rounded-lg bg-white overflow-hidden min-h-[76vh]">
      {/* Left Panel: Agent Settings, Additional Context Boxes & Conversation History */}
      <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-[#E5E7EB] bg-[#F9FAFB] p-4 flex flex-col justify-between max-h-[76vh] overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#111827] tracking-wide">
              CLEMIR AI AGENT
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

          {/* Simulation Selector */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#111827] mb-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Conversation Mode</span>
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
                  placeholder="e.g., Enterprise IT Buyers"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs placeholder:text-[#9CA3AF]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#111827] mb-0.5">Segment / Industry</label>
                <input
                  type="text"
                  value={newAudienceSegment}
                  onChange={(e) => setNewAudienceSegment(e.target.value)}
                  placeholder="e.g., B2B SaaS, Healthcare"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs placeholder:text-[#9CA3AF]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#111827] mb-0.5">Description</label>
                <input
                  type="text"
                  value={newAudienceDescription}
                  onChange={(e) => setNewAudienceDescription(e.target.value)}
                  placeholder="Describe buying behavior and key needs"
                  className="w-full px-2.5 py-1.5 border border-[#E5E7EB] rounded text-xs placeholder:text-[#9CA3AF]"
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

          {/* Multiple Additional Context Boxes */}
          <div className="pt-2 border-t border-[#E5E7EB]">
            <AdditionalContextManager
              contexts={additionalContexts}
              onChange={setAdditionalContexts}
            />
          </div>

          {/* Conversation History List (Persists until manually deleted) */}
          <div className="pt-3 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-semibold text-[#6B7280] tracking-wider">
                CHAT HISTORY ({conversations.length})
              </span>
              {conversations.length > 0 && !confirmClearAllHistory && (
                <button
                  type="button"
                  onClick={() => setConfirmClearAllHistory(true)}
                  className="text-[10px] text-[#6B7280] hover:text-red-600 cursor-pointer"
                  title="Delete all saved chat history"
                >
                  Clear History
                </button>
              )}
            </div>

            {confirmClearAllHistory && (
              <div className="mb-2 p-2 bg-white border border-red-200 rounded-md space-y-1.5 text-[11px]">
                <p className="text-[#111827] font-medium">
                  Delete all saved conversations?
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-semibold cursor-pointer"
                  >
                    Delete All
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAllHistory(false)}
                    className="px-2 py-1 bg-white border border-[#E5E7EB] text-[#111827] rounded text-[10px] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-[11px] text-[#6B7280] py-1">
                  Your saved conversations appear here and remain until deleted.
                </p>
              ) : (
                conversations.map((conv) => {
                  const isSelected = conv.id === activeConv?.id;
                  return (
                    <div
                      key={conv.id}
                      className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-md text-xs transition-colors ${
                        isSelected
                          ? 'bg-[#000000] text-white font-semibold'
                          : 'bg-white border border-[#E5E7EB] text-[#111827] hover:border-[#000000]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewChatDraft(false);
                          setActiveConvId(conv.id);
                        }}
                        className="flex items-center gap-2 min-w-0 text-left flex-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate">{conv.title || 'Conversation'}</span>
                          <span
                            className={`block text-[10px] font-mono ${
                              isSelected ? 'text-gray-300' : 'text-[#6B7280]'
                            }`}
                          >
                            {conv.messages.length} msgs
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteConversation(conv.id)}
                        className={`p-1 rounded cursor-pointer shrink-0 transition-colors ${
                          isSelected
                            ? 'text-gray-300 hover:text-white'
                            : 'text-[#6B7280] hover:text-red-600'
                        }`}
                        title="Delete conversation"
                        aria-label={`Delete ${conv.title || 'conversation'}`}
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

      {/* Main Panel: Chat Messages & Composer (Full remaining width; Active Context panel removed) */}
      <div className="lg:col-span-9 flex flex-col justify-between bg-white h-[76vh]">
        {/* Top Bar inside Agent */}
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="w-4 h-4 text-[#111827] shrink-0" />
            <span className="text-xs font-semibold text-[#111827] truncate">
              {activeConv?.title || 'Clemir Personal AI Assistant'}
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
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {displayedMessages.length === 0 ? (
            <div className="h-full flex flex-col justify-center max-w-2xl mx-auto space-y-5">
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-[#111827]">
                  Clemir AI Assistant &amp; Strategic Partner
                </h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  Ask anything—plan tasks and projects, work through complex decisions, add multiple Additional Context boxes on the left, or analyze{' '}
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
              {displayedMessages.map((msg) => {
                const cleanContent =
                  msg.role === 'assistant' ? cleanAiResponseText(msg.content) : msg.content;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-3xl rounded-lg p-4 text-xs sm:text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#000000] text-white'
                          : 'bg-[#F9FAFB] text-[#111827] border border-[#E5E7EB]'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center justify-between gap-4 pb-2 mb-2 border-b border-[#E5E7EB] text-[11px] font-mono text-[#6B7280]">
                          <span>
                            Clemir Assistant
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
                displayedMessages.length > 0 &&
                displayedMessages[displayedMessages.length - 1]?.role === 'assistant' && (
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
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 max-w-2xl">
              {errorMsg}
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
                placeholder="Ask Clemir AI anything, plan tasks, or research with Web Search..."
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000] placeholder:text-[#9CA3AF]"
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
                Ask about any topic, apply Additional Context, or toggle Web Search
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
