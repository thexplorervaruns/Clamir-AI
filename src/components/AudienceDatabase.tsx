import React, { useState } from 'react';
import {
  Bot,
  Copy,
  Edit3,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  DecisionSpeed,
  Persona,
  PriceSensitivity,
} from '../types/clamir.ts';

interface AudienceDatabaseProps {
  personas: Persona[];
  authToken: string;
  onPersonasChanged: () => void;
  onTalkToPersona: (personaId: string) => void;
}

export const AudienceDatabase: React.FC<AudienceDatabaseProps> = ({
  personas,
  authToken,
  onPersonasChanged,
  onTalkToPersona,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'builtin' | 'custom' | 'favorites'>('all');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    personas[0]?.id || null
  );
  const [editorMode, setEditorMode] = useState<null | 'create' | 'edit'>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteBuiltInAll, setConfirmDeleteBuiltInAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form state for create/edit
  const [formName, setFormName] = useState('');
  const [formTagline, setFormTagline] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAvatarCode, setFormAvatarCode] = useState('CP');
  const [formSegment, setFormSegment] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formCharacteristics, setFormCharacteristics] = useState('');
  const [formPreferences, setFormPreferences] = useState('');
  const [formMotivations, setFormMotivations] = useState('');
  const [formPurchasingBehavior, setFormPurchasingBehavior] = useState('');
  const [formDecisionFactors, setFormDecisionFactors] = useState('');
  const [formConcerns, setFormConcerns] = useState('');
  const [formContext, setFormContext] = useState('');
  const [formPriceSensitivity, setFormPriceSensitivity] = useState<PriceSensitivity>('Moderate');
  const [formDecisionSpeed, setFormDecisionSpeed] = useState<DecisionSpeed>('Deliberate');
  const [formBrandLoyalty, setFormBrandLoyalty] = useState<number>(60);

  const builtInCount = personas.filter((p) => p.isBuiltIn).length;
  const customCount = personas.filter((p) => !p.isBuiltIn).length;

  const filteredPersonas = personas.filter((p) => {
    if (filterMode === 'builtin' && !p.isBuiltIn) return false;
    if (filterMode === 'custom' && p.isBuiltIn) return false;
    if (filterMode === 'favorites' && !p.isFavorite) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.segment.toLowerCase().includes(q) ||
        p.context.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const selectedPersona =
    personas.find((p) => p.id === selectedPersonaId) || filteredPersonas[0] || null;

  const openEditor = (mode: 'create' | 'edit', source?: Persona) => {
    setEditorMode(mode);
    if (mode === 'edit' && source) {
      setFormName(source.name);
      setFormTagline(source.tagline);
      setFormDescription(source.description);
      setFormAvatarCode(source.avatarCode);
      setFormSegment(source.segment);
      setFormTags(source.tags.join(', '));
      setFormCharacteristics(source.characteristics.join('\n'));
      setFormPreferences(source.preferences.join('\n'));
      setFormMotivations(source.motivations.join('\n'));
      setFormPurchasingBehavior(source.purchasingBehavior);
      setFormDecisionFactors(source.decisionFactors.join('\n'));
      setFormConcerns(source.concerns.join('\n'));
      setFormContext(source.context);
      setFormPriceSensitivity(source.priceSensitivity);
      setFormDecisionSpeed(source.decisionSpeed);
      setFormBrandLoyalty(source.brandLoyalty);
    } else {
      setFormName('');
      setFormTagline('Pragmatic evaluator focused on clear workflow outcomes.');
      setFormDescription('Custom target audience persona tailored for domain-specific simulations.');
      setFormAvatarCode('CA');
      setFormSegment('Custom Target Audience');
      setFormTags('Custom Audience, Domain Buyer, Evaluator');
      setFormCharacteristics('Evaluates product claims systematically\nCompares workflow integration fit');
      setFormPreferences('Clear documentation\nPredictable pricing');
      setFormMotivations('Improving team velocity\nReducing operational risk');
      setFormPurchasingBehavior('Runs structured trial before team-wide rollout.');
      setFormDecisionFactors('Integration speed\nTotal cost of ownership');
      setFormConcerns('Migration downtime\nUnclear support SLA');
      setFormContext('Evaluates B2B and consumer solutions across desktop and mobile touchpoints.');
      setFormPriceSensitivity('Moderate');
      setFormDecisionSpeed('Deliberate');
      setFormBrandLoyalty(65);
    }
  };

  const handleSavePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    setStatusMessage(null);

    const payload = {
      name: formName.trim(),
      tagline: formTagline.trim(),
      description: formDescription.trim(),
      avatarCode: (formAvatarCode.trim() || formName.slice(0, 2)).toUpperCase().slice(0, 3),
      segment: formSegment.trim() || 'Custom Target Audience',
      tags: formTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      characteristics: formCharacteristics
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      preferences: formPreferences
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      motivations: formMotivations
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      purchasingBehavior: formPurchasingBehavior.trim(),
      decisionFactors: formDecisionFactors
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      concerns: formConcerns
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      context: formContext.trim(),
      priceSensitivity: formPriceSensitivity,
      decisionSpeed: formDecisionSpeed,
      brandLoyalty: Math.max(0, Math.min(100, Number(formBrandLoyalty) || 0)),
    };

    try {
      const isEdit = editorMode === 'edit' && selectedPersona && !selectedPersona.isBuiltIn;
      const url = isEdit ? `/api/personas/${selectedPersona.id}` : '/api/personas';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setEditorMode(null);
        onPersonasChanged();
        if (data.persona?.id) {
          setSelectedPersonaId(data.persona.id);
        }
        setStatusMessage(
          isEdit
            ? `Updated custom audience persona "${payload.name}".`
            : `Created custom target audience "${payload.name}".`
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFavorite = async (persona: Persona) => {
    await fetch(`/api/personas/${persona.id}/favorite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    onPersonasChanged();
  };

  const handleDuplicatePersona = async (persona: Persona) => {
    const res = await fetch(`/api/personas/${persona.id}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      onPersonasChanged();
      if (data.persona?.id) {
        setSelectedPersonaId(data.persona.id);
      }
      setStatusMessage(`Duplicated "${persona.name}" into your custom audience database.`);
    }
  };

  const handleDeletePersona = async (id: string) => {
    const target = personas.find((p) => p.id === id);
    const res = await fetch(`/api/personas/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      setConfirmDeleteId(null);
      const remaining = personas.filter((p) => p.id !== id);
      if (selectedPersonaId === id) {
        setSelectedPersonaId(remaining[0]?.id || null);
      }
      onPersonasChanged();
      setStatusMessage(
        `Removed "${target?.name || 'Persona'}" from your workspace audience database.`
      );
    }
  };

  const handleDeleteAllBuiltInPersonas = async () => {
    const res = await fetch('/api/personas/builtin/all', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      setConfirmDeleteBuiltInAll(false);
      const remainingCustom = personas.filter((p) => !p.isBuiltIn);
      setSelectedPersonaId(remainingCustom[0]?.id || null);
      onPersonasChanged();
      setStatusMessage(
        'Built-in audience database deleted. You can now use exclusively custom-defined target audiences or restore built-in personas anytime.'
      );
    }
  };

  const handleRestoreBuiltInPersonas = async () => {
    const res = await fetch('/api/personas/builtin/restore', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      onPersonasChanged();
      setStatusMessage('Restored all 7 calibrated built-in personas to your workspace database.');
    }
  };

  const personaBeingDeleted = personas.find((p) => p.id === confirmDeleteId) || null;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB]">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#6B7280] mb-1">
            <Users className="w-3.5 h-3.5 text-[#111827]" />
            <span>AUDIENCE DATABASE · CONTEXT &amp; PERSONA ENGINE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
            Audience Database &amp; Custom Segments
          </h1>
          <p className="text-xs text-[#6B7280] mt-1 max-w-2xl">
            Create and define your own target audiences, manage evaluation contexts, or delete the built-in persona database to run 100% custom audience simulations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          {builtInCount > 0 ? (
            <button
              type="button"
              onClick={() => setConfirmDeleteBuiltInAll(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors cursor-pointer"
              title="Remove all built-in personas from this workspace"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Built-in Database ({builtInCount})</span>
            </button>
          ) : null}

          {builtInCount < 7 && (
            <button
              type="button"
              onClick={handleRestoreBuiltInPersonas}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Built-in Personas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => openEditor('create')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Target Audience</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-[#F9FAFB] border border-[#111827] rounded-md flex items-center justify-between gap-3 text-xs text-[#111827]">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[#6B7280] hover:text-[#111827] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Segmented Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search target audiences by name, segment, context, or tag..."
            className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md self-start">
          {(
            [
              { id: 'all', label: `All (${personas.length})` },
              { id: 'builtin', label: `Built-in (${builtInCount})` },
              { id: 'custom', label: `Custom (${customCount})` },
              { id: 'favorites', label: 'Favorites' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                filterMode === tab.id
                  ? 'bg-[#000000] text-white'
                  : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Left Persona Grid + Right Properties & Context Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Center Persona Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredPersonas.length === 0 ? (
            <div className="sm:col-span-2 p-8 bg-white border border-[#E5E7EB] rounded-lg text-center space-y-3">
              <p className="text-sm font-semibold text-[#111827]">
                No audiences match the current filter
              </p>
              <p className="text-xs text-[#6B7280] max-w-md mx-auto">
                Create a custom target audience tailored to your exact buyer profile, or restore the built-in persona database.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openEditor('create')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 cursor-pointer"
                >
                  + Create Custom Target Audience
                </button>
                {builtInCount < 7 && (
                  <button
                    type="button"
                    onClick={handleRestoreBuiltInPersonas}
                    className="px-4 py-2 text-xs font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB] cursor-pointer"
                  >
                    Restore Built-in Database
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredPersonas.map((persona) => {
              const isSelected = selectedPersona?.id === persona.id;
              return (
                <div
                  key={persona.id}
                  onClick={() => setSelectedPersonaId(persona.id)}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#F9FAFB] border-[#000000] shadow-xs'
                      : 'bg-white border-[#E5E7EB] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-md bg-[#000000] text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {persona.avatarCode}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-[#111827] truncate">
                            {persona.name}
                          </h3>
                          <p className="text-[11px] text-[#6B7280] truncate">
                            {persona.segment} · {persona.isBuiltIn ? 'Built-in' : 'Custom'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(persona);
                          }}
                          className="p-1 text-[#6B7280] hover:text-[#111827] cursor-pointer"
                          title="Toggle Favorite"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              persona.isFavorite ? 'fill-[#000000] text-[#000000]' : ''
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(persona.id);
                          }}
                          className="p-1 text-[#6B7280] hover:text-red-600 cursor-pointer"
                          title={`Delete ${persona.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-3 text-xs font-medium text-[#111827] line-clamp-2">
                      {persona.tagline}
                    </p>
                    <p className="mt-1.5 text-[11px] text-[#6B7280] line-clamp-1">
                      Context: {persona.context}
                    </p>
                    <p className="mt-1 text-[11px] text-[#6B7280] font-mono truncate">
                      {persona.tags.join(' · ')}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5E7EB] grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums">
                    <div>
                      <span className="text-[#6B7280] block">Price Sens.</span>
                      <span className="font-semibold text-[#111827]">{persona.priceSensitivity}</span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block">Speed</span>
                      <span className="font-semibold text-[#111827]">{persona.decisionSpeed}</span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block">Loyalty</span>
                      <span className="font-semibold text-[#111827]">{persona.brandLoyalty}/100</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right-Side Properties & Audience Context Panel */}
        {selectedPersona && (
          <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-5 sticky top-6">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-md bg-[#000000] text-white font-mono text-sm font-bold flex items-center justify-center shrink-0">
                  {selectedPersona.avatarCode}
                </span>
                <div className="min-w-0">
                  <span className="text-[11px] font-mono text-[#6B7280] block">
                    {selectedPersona.isBuiltIn ? 'BUILT-IN AUDIENCE' : 'CUSTOM TARGET AUDIENCE'}
                  </span>
                  <h2 className="text-lg font-bold text-[#111827] truncate">
                    {selectedPersona.name}
                  </h2>
                  <p className="text-xs text-[#6B7280] truncate">{selectedPersona.segment}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditor('edit', selectedPersona)}
                  className="p-1.5 text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-md cursor-pointer"
                  title={
                    selectedPersona.isBuiltIn
                      ? 'Customize & Save as Custom Audience'
                      : 'Edit Custom Audience'
                  }
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicatePersona(selectedPersona)}
                  className="p-1.5 text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-md cursor-pointer"
                  title="Duplicate Persona"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(selectedPersona.id)}
                  className="p-1.5 text-[#6B7280] hover:text-red-600 border border-[#E5E7EB] rounded-md cursor-pointer"
                  title="Delete Persona from Database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Primary Action: Talk to AI Agent for this Persona */}
            <button
              type="button"
              onClick={() => onTalkToPersona(selectedPersona.id)}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              <span>Interview {selectedPersona.name} in AI Research Agent</span>
            </button>

            {/* Audience Context Box (Preserved & Highlighted) */}
            <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B7280] block">
                ACTIVE AUDIENCE EVALUATION CONTEXT
              </span>
              <p className="text-xs font-medium text-[#111827] leading-relaxed">
                {selectedPersona.context}
              </p>
            </div>

            {/* Persona Properties Grid */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md font-mono text-xs tabular-nums">
              <div>
                <span className="text-[10px] text-[#6B7280] block">Price Sensitivity</span>
                <span className="font-bold text-[#111827]">{selectedPersona.priceSensitivity}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6B7280] block">Decision Speed</span>
                <span className="font-bold text-[#111827]">{selectedPersona.decisionSpeed}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#6B7280] block">Brand Loyalty</span>
                <span className="font-bold text-[#111827]">{selectedPersona.brandLoyalty}/100</span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs max-h-[46vh] overflow-y-auto pr-1">
              <div>
                <span className="font-semibold text-[#111827] block">Tagline &amp; Description</span>
                <p className="text-[#111827] font-medium mt-0.5">{selectedPersona.tagline}</p>
                <p className="text-[#6B7280] mt-1 leading-relaxed">{selectedPersona.description}</p>
              </div>

              <div>
                <span className="font-semibold text-[#111827] block">Audience Segment Tags</span>
                <p className="text-[#6B7280] font-mono mt-0.5">{selectedPersona.tags.join(' · ')}</p>
              </div>

              <div>
                <span className="font-semibold text-[#111827] block">Characteristics</span>
                <ul className="mt-1 space-y-1 text-[#6B7280]">
                  {selectedPersona.characteristics.map((c, i) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-semibold text-[#111827] block">Preferences &amp; Motivations</span>
                <ul className="mt-1 space-y-1 text-[#6B7280]">
                  {selectedPersona.preferences.map((p, i) => (
                    <li key={i}>+ {p}</li>
                  ))}
                  {selectedPersona.motivations.map((m, i) => (
                    <li key={`m-${i}`}>• {m}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-semibold text-[#111827] block">Purchasing Behavior</span>
                <p className="text-[#6B7280] mt-1 leading-relaxed">
                  {selectedPersona.purchasingBehavior}
                </p>
              </div>

              <div>
                <span className="font-semibold text-[#111827] block">Decision Factors</span>
                <ul className="mt-1 space-y-1 text-[#6B7280]">
                  {selectedPersona.decisionFactors.map((df, i) => (
                    <li key={i}>• {df}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-semibold text-[#111827] block">Concerns &amp; Objections</span>
                <ul className="mt-1 space-y-1 text-[#6B7280]">
                  {selectedPersona.concerns.map((c, i) => (
                    <li key={i}>- {c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Persona Editor Modal */}
      {editorMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-lg p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-base font-bold text-[#111827]">
                {editorMode === 'create'
                  ? 'Create Custom Target Audience Persona'
                  : `Edit Target Audience: ${formName}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditorMode(null)}
                className="p-1 text-[#6B7280] hover:text-[#111827] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePersona} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#111827] mb-1">
                    Target Audience / Persona Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Independent FinTech Creators, Healthcare CIOs, Gen-Z Gamers"
                    className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">
                    Avatar Code (2-3 chars)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={formAvatarCode}
                    onChange={(e) => setFormAvatarCode(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">
                    Audience Segment / Industry
                  </label>
                  <input
                    type="text"
                    value={formSegment}
                    onChange={(e) => setFormSegment(e.target.value)}
                    placeholder="e.g., B2C Subscription Consumers, Enterprise Security"
                    className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">Tagline</label>
                <input
                  type="text"
                  value={formTagline}
                  onChange={(e) => setFormTagline(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">
                  Detailed Audience Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">
                  Audience Evaluation Context
                </label>
                <input
                  type="text"
                  value={formContext}
                  onChange={(e) => setFormContext(e.target.value)}
                  placeholder="Where and how this audience discovers, evaluates, and adopts products..."
                  className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-md"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md">
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Price Sensitivity</label>
                  <select
                    value={formPriceSensitivity}
                    onChange={(e) => setFormPriceSensitivity(e.target.value as PriceSensitivity)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded"
                  >
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Decision Speed</label>
                  <select
                    value={formDecisionSpeed}
                    onChange={(e) => setFormDecisionSpeed(e.target.value as DecisionSpeed)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded"
                  >
                    <option value="Instant">Instant</option>
                    <option value="Fast">Fast</option>
                    <option value="Deliberate">Deliberate</option>
                    <option value="Slow">Slow</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">
                    Brand Loyalty (0-100): {formBrandLoyalty}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formBrandLoyalty}
                    onChange={(e) => setFormBrandLoyalty(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 font-mono bg-white border border-[#E5E7EB] rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">
                    Characteristics (one per line)
                  </label>
                  <textarea
                    rows={2}
                    value={formCharacteristics}
                    onChange={(e) => setFormCharacteristics(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">
                    Preferences (one per line)
                  </label>
                  <textarea
                    rows={2}
                    value={formPreferences}
                    onChange={(e) => setFormPreferences(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">
                    Motivations (one per line)
                  </label>
                  <textarea
                    rows={2}
                    value={formMotivations}
                    onChange={(e) => setFormMotivations(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">
                    Decision Factors (one per line)
                  </label>
                  <textarea
                    rows={2}
                    value={formDecisionFactors}
                    onChange={(e) => setFormDecisionFactors(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">
                    Concerns &amp; Objections (one per line)
                  </label>
                  <textarea
                    rows={2}
                    value={formConcerns}
                    onChange={(e) => setFormConcerns(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#111827] mb-1">Purchasing Behavior</label>
                  <textarea
                    rows={2}
                    value={formPurchasingBehavior}
                    onChange={(e) => setFormPurchasingBehavior(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-md"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setEditorMode(null)}
                  className="px-4 py-2 font-medium text-[#111827] border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving Audience...' : 'Save Target Audience'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Individual Persona Confirmation Dialog (Works for Built-in AND Custom) */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-lg p-6">
            <h3 className="text-base font-bold text-[#111827]">
              Delete &ldquo;{personaBeingDeleted?.name || 'Audience Persona'}&rdquo;?
            </h3>
            <p className="mt-2 text-xs text-[#6B7280] leading-relaxed">
              {personaBeingDeleted?.isBuiltIn
                ? 'This will remove this built-in persona from your active workspace audience database. Existing simulation reports remain intact, and you can restore built-in personas at any time.'
                : 'This will permanently remove this custom audience persona from your workspace. Existing completed simulation reports remain intact.'}
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-xs font-medium text-[#111827] border border-[#E5E7EB] rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeletePersona(confirmDeleteId)}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 cursor-pointer"
              >
                Delete from Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Built-in Personas Confirmation Dialog */}
      {confirmDeleteBuiltInAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-lg p-6">
            <h3 className="text-base font-bold text-[#111827]">
              Delete Built-in Audience Database?
            </h3>
            <p className="mt-2 text-xs text-[#6B7280] leading-relaxed">
              This removes all {builtInCount} built-in personas from your workspace so you can work exclusively with your own custom-defined audiences. All simulation contexts, reports, and custom personas will be preserved.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteBuiltInAll(false)}
                className="px-4 py-2 text-xs font-medium text-[#111827] border border-[#E5E7EB] rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllBuiltInPersonas}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 cursor-pointer"
              >
                Delete Built-in Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
