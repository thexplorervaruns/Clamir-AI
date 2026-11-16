import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Maximize2,
  Plus,
  Send,
  Trash2,
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
  serializeAdditionalContexts,
} from './AdditionalContextManager.tsx';
import { cleanAiResponseText } from '../utils/cleanAiText.ts';
import { supabase } from '../supabaseClient.js';
import { saveConversationToSupabase } from '../services/supabaseService.js';

interface IntegratedAgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullWorkspace: () => void;
  conversations: AgentConversation[];
  simulations: Simulation[];
  personas: Persona[];
  additionalContexts: AdditionalContextBox[];
  onAdditionalContextsChange: (next: AdditionalContextBox[]) => void;
  activeSimulationId?: string | null;
  authToken: string;
  onConversationsChanged: () => void;
  onConversationUpserted?: (conv: AgentConversation) => void;
  onConversationDeleted?: (conversationId: string) => void;
}

export const IntegratedAgentDrawer: React.FC<IntegratedAgentDrawerProps> = ({
  isOpen,
  onClose,
  onOpenFullWorkspace,
  conversations,
  simulations,
  personas,
  additionalContexts,
  onAdditionalContextsChange,
  activeSimulationId = null,
  authToken,
  onConversationsChanged,
  onConversationUpserted,
  onConversationDeleted,
}) => {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(
    conversations[0]?.id || null
  );
  const [isNewDraft, setIsNewDraft] = useState(false);
  const [selectedSimId, setSelectedSimId] = useState<string>(activeSimulationId || '');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [showContextPanel, setShowContextPanel] = useState<boolean>(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<AgentMessage[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeSimulationId) {
      setSelectedSimId(activeSimulationId);
    }
  }, [activeSimulationId]);

  useEffect(() => {
    if (!isNewDraft && !selectedConvId && conversations.length > 0) {
      setSelectedConvId(conversations[0].id);
    }
  }, [conversations, selectedConvId, isNewDraft]);

  const activeConv = isNewDraft
    ? null
    : conversations.find((c) => c.id === selectedConvId) || null;
  const displayedMessages =
    localMessages.length > 0 ? localMessages : activeConv?.messages || [];

  useEffect(() => {
    if (activeConv) {
      setLocalMessages(activeConv.messages || []);
    } else if (isNewDraft) {
      setLocalMessages([]);
    }
  }, [activeConv?.id, activeConv?.messages.length, isNewDraft]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayedMessages.length, sending, isOpen]);

  if (!isOpen) return null;

  const filledContextCount = additionalContexts.filter((c) => c.content.trim()).length;

  const readJsonSafe = async (res: Response): Promise<{ ok: boolean; data: any }> => {
    try {
      const text = await res.text();
      if (!text) return { ok: res.ok, data: {} };
      return { ok: res.ok, data: JSON.parse(text) };
    } catch {
      return { ok: false, data: null };
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawText = inputMessage.trim();
    if (!rawText || sending) return;

    setInputMessage('');
    setErrorMsg(null);
    setSending(true);
    setIsNewDraft(false);

    const optimisticUserMsg: AgentMessage = {
      id: `msg-temp-${Date.now()}`,
      role: 'user',
      content: rawText,
      timestamp: new Date().toISOString(),
    };
    const priorHistory = [...displayedMessages];
    setLocalMessages([...priorHistory, optimisticUserMsg]);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const liveToken = session?.access_token || authToken;

      const cleanedContexts = additionalContexts
        .filter((c) => c.content.trim())
        .map((c) => ({
          id: c.id,
          title: c.title.trim(),
          content: c.content.trim(),
        }));
      const combinedNote = serializeAdditionalContexts(additionalContexts);

      const selectedSimObj = simulations.find((s) => s.id === selectedSimId) || null;
      const selectedPersonaObj = personas.find((p) => p.id === selectedPersonaId) || null;
      const compactSim = selectedSimObj
        ? {
            id: selectedSimObj.id,
            name: selectedSimObj.name,
            type: selectedSimObj.type,
            description: selectedSimObj.description,
            hypothesis: selectedSimObj.hypothesis,
            targetAudience: selectedSimObj.targetAudience,
            status: selectedSimObj.status,
            stage: selectedSimObj.stage,
            results: selectedSimObj.results
              ? {
                  executiveSummary: selectedSimObj.results.executiveSummary,
                  sentimentOverview: selectedSimObj.results.sentimentOverview,
                  personaBreakdown: (selectedSimObj.results.personaBreakdown || []).slice(0, 8),
                  objectionsAndConcerns: (
                    selectedSimObj.results.objectionsAndConcerns || []
                  ).slice(0, 5),
                  recommendations: (selectedSimObj.results.recommendations || []).slice(0, 5),
                }
              : undefined,
          }
        : null;

      const res = await fetch('/api/agent/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(liveToken ? { Authorization: `Bearer ${liveToken}` } : {}),
        },
        body: JSON.stringify({
          conversationId: activeConv?.id || null,
          simulationId: selectedSimId || null,
          personaId: selectedPersonaId || null,
          simulation: compactSim,
          persona: selectedPersonaObj,
          message: rawText,
          customContextNote: combinedNote || undefined,
          additionalContexts: cleanedContexts,
          history: priorHistory,
          webSearch: webSearchEnabled,
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const { data } = await readJsonSafe(res);
        if (data?.conversation && Array.isArray(data.conversation.messages)) {
          const sanitizedMsgs: AgentMessage[] = data.conversation.messages.map(
            (m: AgentMessage) =>
              m.role === 'assistant' ? { ...m, content: cleanAiResponseText(m.content) } : m
          );
          const lastMsg = sanitizedMsgs[sanitizedMsgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content.trim().length > 0) {
            const sanitizedConv: AgentConversation = {
              ...data.conversation,
              messages: sanitizedMsgs,
            };
            setSelectedConvId(sanitizedConv.id);
            setLocalMessages(sanitizedConv.messages);
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
            return;
          }
        }
      }

      // Direct stateless fallback via /api/research/search + /api/ai/generate if primary route fails or returns empty
      let fallbackSources: { title: string; uri: string }[] = [];
      let rawSources: any[] = [];
      if (webSearchEnabled) {
        const searchRes = await fetch('/api/research/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queries: [rawText] }),
        }).catch(() => null);
        if (searchRes && searchRes.ok) {
          const { data: searchJson } = await readJsonSafe(searchRes);
          rawSources = Array.isArray(searchJson?.sources) ? searchJson.sources : [];
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
          simulation: compactSim,
          persona: selectedPersonaObj,
          webSources: rawSources,
          additionalContexts: cleanedContexts,
          customNote: combinedNote,
          systemPrompt:
            rawSources.length > 0
              ? `Live Web Sources:\n${rawSources
                  .map(
                    (s: any, idx: number) =>
                      `[${idx + 1}] ${s.title} (${s.url}): ${s.excerpt || ''}`
                  )
                  .join('\n')}`
              : undefined,
        }),
      }).catch(() => null);

      if (aiRes && aiRes.ok) {
        const { data: aiJson } = await readJsonSafe(aiRes);
        const generated = cleanAiResponseText(aiJson?.content || aiJson?.result || '');
        if (generated.trim().length > 0) {
          const assistantMsg: AgentMessage = {
            id: `msg-local-${Date.now()}`,
            role: 'assistant',
            content: generated,
            timestamp: new Date().toISOString(),
            webSearchUsed: webSearchEnabled,
            sources: fallbackSources,
          };
          const nextMessages = [...priorHistory, optimisticUserMsg, assistantMsg];
          const savedConv: AgentConversation = {
            id: activeConv?.id || crypto.randomUUID(),
            workspaceId: activeConv?.workspaceId || 'ws-default',
            title: activeConv?.title || rawText.slice(0, 48),
            simulationId: selectedSimId || activeConv?.simulationId || null,
            personaId: selectedPersonaId || activeConv?.personaId || null,
            createdAt: activeConv?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: nextMessages,
          };
          setSelectedConvId(savedConv.id);
          setLocalMessages(nextMessages);
          if (onConversationUpserted) {
            await onConversationUpserted(savedConv);
          }
          return;
        }
      }

      setErrorMsg('Unable to reach Clemir AI service. Please try again.');
    } catch {
      setErrorMsg('Connection interrupted while contacting Clemir AI.');
    } finally {
      setSending(false);
    }
  };

  const handleNewThread = () => {
    setIsNewDraft(true);
    setSelectedConvId(null);
    setLocalMessages([]);
    setErrorMsg(null);
  };

  const handleDeleteCurrentThread = async () => {
    if (!activeConv) return;
    const idToDelete = activeConv.id;
    if (onConversationDeleted) {
      await onConversationDeleted(idToDelete);
    }
    const remaining = conversations.filter((c) => c.id !== idToDelete);
    if (remaining[0]) {
      setIsNewDraft(false);
      setSelectedConvId(remaining[0].id);
      setLocalMessages(remaining[0].messages || []);
    } else {
      setIsNewDraft(true);
      setSelectedConvId(null);
      setLocalMessages([]);
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(cleanAiResponseText(content));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="w-full max-w-lg bg-white border-l border-[#E5E7EB] h-full flex flex-col justify-between shadow-lg">
        {/* Drawer Header */}
        <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between gap-2 bg-[#F9FAFB]">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="w-4 h-4 text-[#111827] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-[#111827] truncate">
                Clemir AI Agent
              </h2>
              <p className="text-[11px] text-[#6B7280] truncate">
                {filledContextCount > 0
                  ? `Using ${filledContextCount} Additional Context box${filledContextCount === 1 ? '' : 'es'}`
                  : 'Integrated workspace assistant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleNewThread}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded hover:border-[#000000] cursor-pointer"
              title="Start new conversation"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullWorkspace();
              }}
              className="p-1.5 text-[#6B7280] hover:text-[#111827] bg-white border border-[#E5E7EB] rounded cursor-pointer"
              title="Open full AI Agent workspace"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#6B7280] hover:text-[#111827] bg-white border border-[#E5E7EB] rounded cursor-pointer"
              aria-label="Close AI Agent"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Collapsible Context & Selectors Strip */}
        <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-3 space-y-3 max-h-[38vh] overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowContextPanel(!showContextPanel)}
              className="text-[11px] font-mono font-semibold text-[#111827] hover:underline cursor-pointer"
            >
              {showContextPanel
                ? 'Hide Context & Study Filters'
                : `Show Additional Context (${filledContextCount})`}
            </button>
            {conversations.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={isNewDraft ? '' : selectedConvId || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      handleNewThread();
                    } else {
                      setIsNewDraft(false);
                      setSelectedConvId(val);
                    }
                  }}
                  className="max-w-[180px] px-2 py-1 text-[11px] bg-white border border-[#E5E7EB] rounded text-[#111827]"
                >
                  <option value="">New Chat</option>
                  {conversations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title || 'Conversation'} ({c.messages.length})
                    </option>
                  ))}
                </select>
                {activeConv && (
                  <button
                    type="button"
                    onClick={handleDeleteCurrentThread}
                    className="p-1 text-[#6B7280] hover:text-red-600 bg-white border border-[#E5E7EB] rounded cursor-pointer"
                    title="Delete selected conversation"
                    aria-label="Delete selected conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {showContextPanel && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedSimId}
                  onChange={(e) => setSelectedSimId(e.target.value)}
                  className="px-2 py-1.5 text-[11px] bg-white border border-[#E5E7EB] rounded text-[#111827]"
                >
                  <option value="">Open Assistant Mode</option>
                  {simulations.map((s) => (
                    <option key={s.id} value={s.id}>
                      Study: {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedPersonaId}
                  onChange={(e) => setSelectedPersonaId(e.target.value)}
                  className="px-2 py-1.5 text-[11px] bg-white border border-[#E5E7EB] rounded text-[#111827]"
                >
                  <option value="">Direct Assistant Voice</option>
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>
                      Audience: {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <AdditionalContextManager
                contexts={additionalContexts}
                onChange={onAdditionalContextsChange}
                compact
              />
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-white">
          {displayedMessages.length === 0 ? (
            <div className="h-full flex flex-col justify-center text-center space-y-2 px-4">
              <p className="text-sm font-bold text-[#111827]">
                Ask Clemir AI Anything
              </p>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Your Additional Context boxes above are automatically read by Clemir AI. Toggle Web Search below anytime for live external sources.
              </p>
            </div>
          ) : (
            displayedMessages.map((msg) => {
              const clean =
                msg.role === 'assistant' ? cleanAiResponseText(msg.content) : msg.content;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-lg p-3.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#000000] text-white'
                        : 'bg-[#F9FAFB] text-[#111827] border border-[#E5E7EB]'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center justify-between gap-3 pb-1.5 mb-1.5 border-b border-[#E5E7EB] text-[10px] font-mono text-[#6B7280]">
                        <span>
                          Clemir AI
                          {msg.webSearchUsed ? ' · Web Search' : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, clean)}
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
                    <div className="whitespace-pre-line">{clean}</div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#E5E7EB] space-y-1">
                        <span className="block text-[10px] font-mono font-semibold text-[#111827]">
                          Web Sources:
                        </span>
                        <ul className="space-y-1">
                          {msg.sources.map((src, idx) => (
                            <li key={idx} className="text-[11px]">
                              <a
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[#111827] underline hover:text-[#6B7280]"
                              >
                                <span className="truncate max-w-[320px]">
                                  [{idx + 1}] {src.title || src.uri}
                                </span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {sending && (
            <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-xs text-[#6B7280] font-mono">
              Thinking{webSearchEnabled ? ' and searching web sources' : ''}...
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
              {errorMsg}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="p-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
          <form onSubmit={handleSend} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask Clemir AI or search the web..."
                className="flex-1 px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000] placeholder:text-[#9CA3AF]"
              />
              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
                  webSearchEnabled
                    ? 'bg-[#000000] text-white border-[#000000]'
                    : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:text-[#111827]'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>Web Search: {webSearchEnabled ? 'On' : 'Off'}</span>
              </button>
              <span className="text-[10px] text-[#6B7280]">
                Reads all Additional Context boxes
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
