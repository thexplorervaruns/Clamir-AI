import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  DollarSign,
  Edit3,
  FlaskConical,
  FolderKanban,
  LayoutDashboard,
  Layers,
  Plus,
  Search,
  Sliders,
  Square,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { ClamirLogo } from './components/ClamirLogo.tsx';
import { OfflineStatusBanner } from './components/PWAComponents.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { AuthEntryFlow } from './components/AuthEntryFlow.tsx';
import { SimulationCreator } from './components/SimulationCreator.tsx';
import { SimulationResultsView } from './components/SimulationResultsView.tsx';
import { AIAgentWorkspace } from './components/AIAgentWorkspace.tsx';
import { AudienceDatabase } from './components/AudienceDatabase.tsx';
import { AccountAndReports } from './components/AccountAndReports.tsx';
import { IntegratedAgentDrawer } from './components/IntegratedAgentDrawer.tsx';
import { createEmptyContextBox } from './components/AdditionalContextManager.tsx';
import {
  AdditionalContextBox,
  AgentConversation,
  Persona,
  PlatformConfig,
  RecentSearchItem,
  ReportArtifact,
  Simulation,
  SimulationTypeId,
  UserProfile,
  Workspace,
} from './types/clamir.ts';
import {
  BUILT_IN_PERSONAS,
  INITIAL_PLATFORM_CONFIG,
  INITIAL_SAMPLE_SIMULATIONS,
  SIMULATION_TYPES_META,
} from './data/seedData.ts';
import { supabase } from './supabaseClient.js';
import {
  clearRecentSearchesInSupabase,
  createWorkspaceInSupabase,
  deleteRecentSearchInSupabase,
  deleteSimulationInSupabase,
  loadUserWorkspaceFromSupabase,
  logRecentSearchToSupabase,
  normalizeConsistentUserName,
  renameWorkspaceInSupabase,
  saveSimulationToSupabase,
  signOutFromSupabase,
} from './services/supabaseService.js';

type AppView = 'landing' | 'auth' | 'workspace';
type WorkspaceTab = 'dashboard' | 'simulations' | 'agent' | 'audience' | 'account' | 'owner';

export default function App() {
  const [appView, setAppView] = useState<AppView>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authToken, setAuthToken] = useState<string>('');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Navigation & Layout State
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [accountInitialSubTab, setAccountInitialSubTab] = useState<
    'profile' | 'reports' | 'activity' | 'owner'
  >('profile');

  // Workspace Data State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('ws-default');
  const [simulations, setSimulations] = useState<Simulation[]>(INITIAL_SAMPLE_SIMULATIONS);
  const [personas, setPersonas] = useState<Persona[]>(BUILT_IN_PERSONAS);
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [reports, setReports] = useState<ReportArtifact[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(INITIAL_PLATFORM_CONFIG);

  // Sub-views inside Simulations
  const [creatingSim, setCreatingSim] = useState(false);
  const [createSimInitialType, setCreateSimInitialType] = useState<SimulationTypeId>('test_idea');
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);
  const [confirmDeleteSimId, setConfirmDeleteSimId] = useState<string | null>(null);
  const [simSearchQuery, setSimSearchQuery] = useState('');

  // AI Agent & Shared Additional Context Boxes accessible across the entire app
  const [agentFocusSimId, setAgentFocusSimId] = useState<string | null>(null);
  const [agentFocusPersonaId, setAgentFocusPersonaId] = useState<string | null>(null);
  const [agentDrawerOpen, setAgentDrawerOpen] = useState<boolean>(false);
  const [additionalContexts, setAdditionalContexts] = useState<AdditionalContextBox[]>(() => {
    try {
      const saved = localStorage.getItem('clemir_additional_contexts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => ({
            id: String(item?.id || `ctx-init-${idx}`),
            title: String(item?.title || ''),
            content: String(item?.content || ''),
          }));
        }
      }
    } catch {
      // ignore storage failure
    }
    return [createEmptyContextBox()];
  });

  useEffect(() => {
    try {
      localStorage.setItem('clemir_additional_contexts', JSON.stringify(additionalContexts));
    } catch {
      // ignore storage failure
    }
  }, [additionalContexts]);

  // Workspace Switcher Modal State
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [renamingWorkspaceId, setRenamingWorkspaceId] = useState<string | null>(null);
  const [renameWorkspaceValue, setRenameWorkspaceValue] = useState('');

  // Load public platform config on initial mount
  useEffect(() => {
    fetch('/api/public/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.config) setPlatformConfig(data.config);
      })
      .catch(() => {});
  }, []);

  // Load workspace data from Supabase first, then sync with backend API
  const fetchWorkspaceState = useCallback(
    async (token: string, wsId?: string) => {
      if (!token) return;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && session.access_token === token) {
          const supaData = await loadUserWorkspaceFromSupabase(session.user, wsId);
          if (supaData) {
            setUser((prev) => ({
              ...supaData.user,
              name: normalizeConsistentUserName(
                prev?.name || supaData.user.name,
                supaData.user.email || prev?.email
              ),
            }));
            setWorkspaces(supaData.workspaces);
            setActiveWorkspaceId(supaData.activeWorkspaceId);
            if (supaData.simulations.length > 0) {
              setSimulations(supaData.simulations);
            }
            setPersonas(supaData.personas);
            if (supaData.conversations.length > 0) {
              setConversations(supaData.conversations);
            }
            if (supaData.reports.length > 0) {
              setReports(supaData.reports);
            }
            if (supaData.recentSearches.length > 0) {
              setRecentSearches(supaData.recentSearches);
            }
          }
        }

        const query = wsId ? `?workspaceId=${encodeURIComponent(wsId)}` : '';
        const res = await fetch(`/api/workspace/bootstrap${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser((prev) => ({
            ...data.user,
            name: normalizeConsistentUserName(
              data.user?.name || prev?.name,
              data.user?.email || prev?.email
            ),
          }));
          setWorkspaces(data.workspaces);
          setActiveWorkspaceId(data.activeWorkspaceId);
          setSimulations(data.simulations);
          setPersonas(data.personas);
          setConversations(data.conversations);
          setReports(data.reports);
          setRecentSearches(data.recentSearches);
          if (data.platformConfig) {
            setPlatformConfig(data.platformConfig);
          }
        }
      } catch {
        // Keep current state on offline
      }
    },
    []
  );

  // Supabase Session Protection & Auth State Listener
  useEffect(() => {
    let mounted = true;

    const verifyInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        const path = window.location.pathname;
        const isProtectedPath =
          path === '/dashboard' ||
          path === '/simulations' ||
          path === '/agent' ||
          path === '/audience' ||
          path === '/account';

        if (session && session.user) {
          const resolvedInitialName = normalizeConsistentUserName(
            session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            session.user.email
          );

          // Sync session with backend API
          const syncRes = await fetch('/api/auth/supabase-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              userId: session.user.id,
              email: session.user.email || '',
              name: resolvedInitialName,
            }),
          }).catch(() => null);

          if (syncRes && syncRes.ok) {
            const synced = await syncRes.json();
            setAuthToken(session.access_token);
            setUser({
              ...synced.user,
              name: normalizeConsistentUserName(
                synced.user?.name || resolvedInitialName,
                synced.user?.email || session.user.email
              ),
            });
            setWorkspaces(synced.workspaces);
            if (synced.workspaces?.[0]) {
              setActiveWorkspaceId(synced.workspaces[0].id);
            }
          } else {
            setAuthToken(session.access_token);
            setUser({
              id: session.user.id,
              name: resolvedInitialName,
              email: session.user.email || '',
              plan: 'Explorer',
              isOwner:
                (session.user.email || '').toLowerCase() === 'thexplorervaruns@gmail.com',
              createdAt: session.user.created_at || new Date().toISOString(),
            });
          }
          setAppView('workspace');
          if (path === '/login' || path === '/signup') {
            window.history.replaceState({}, '', '/');
          }
        } else if (path === '/login' || path === '/signup' || isProtectedPath) {
          setAuthMode(path === '/signup' ? 'signup' : 'login');
          setAppView('auth');
          if (isProtectedPath) {
            window.history.replaceState({}, '', '/login');
          }
        }
      } finally {
        if (mounted) {
          setAuthChecking(false);
        }
      }
    };

    verifyInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setAuthToken('');
        setUser(null);
        setAppView((prev) => (prev === 'workspace' ? 'auth' : prev));
      } else if (event === 'SIGNED_IN' && session?.user) {
        setAuthToken(session.access_token);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authToken && appView === 'workspace') {
      fetchWorkspaceState(authToken, activeWorkspaceId);
    }
  }, [authToken, activeWorkspaceId, appView, fetchWorkspaceState]);

  const handleGetStartedFromLanding = async (intent?: 'simulations' | 'agent' | 'signup') => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if ((session && session.user && user) || (authToken && user)) {
      if (intent === 'agent') setActiveTab('agent');
      else if (intent === 'simulations') setActiveTab('simulations');
      else setActiveTab('dashboard');
      setAppView('workspace');
      return;
    }
    const targetMode = intent === 'signup' ? 'signup' : 'login';
    setAuthMode(targetMode);
    window.history.pushState({}, '', targetMode === 'signup' ? '/signup' : '/login');
    setAppView('auth');
  };

  const handleAuthSuccess = (payload: {
    token: string;
    user: UserProfile;
    workspaces: Workspace[];
  }) => {
    setAuthToken(payload.token);
    setUser({
      ...payload.user,
      name: normalizeConsistentUserName(payload.user.name, payload.user.email),
    });
    setWorkspaces(payload.workspaces);
    if (payload.workspaces[0]) {
      setActiveWorkspaceId(payload.workspaces[0].id);
    }
    window.history.replaceState({}, '', '/');
    setAppView('workspace');
  };

  const handleLogout = async () => {
    await signOutFromSupabase().catch(() => {});
    setAuthToken('');
    setUser(null);
    window.history.replaceState({}, '', '/login');
    setAuthMode('login');
    setAppView('auth');
  };

  // Workspace CRUD handlers
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    if (user) {
      await createWorkspaceInSupabase(user.id, newWorkspaceName.trim()).catch(() => null);
    }
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: newWorkspaceName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setWorkspaces(data.workspaces);
      setActiveWorkspaceId(data.workspace.id);
      setNewWorkspaceName('');
      setSelectedSimId(null);
      setCreatingSim(false);
    }
  };

  const handleRenameWorkspace = async (wsId: string) => {
    if (!renameWorkspaceValue.trim()) return;
    if (user) {
      await renameWorkspaceInSupabase(user.id, wsId, renameWorkspaceValue.trim()).catch(() => null);
    }
    const res = await fetch(`/api/workspaces/${wsId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: renameWorkspaceValue.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setWorkspaces(data.workspaces);
      setRenamingWorkspaceId(null);
      setRenameWorkspaceValue('');
    }
  };

  // Simulation actions from Dashboard / Simulations list
  const handleStartNewSimShortcut = (typeId: SimulationTypeId = 'test_idea') => {
    setCreateSimInitialType(typeId);
    setSelectedSimId(null);
    setCreatingSim(true);
    setActiveTab('simulations');
  };

  const handleOpenSimulation = async (simId: string) => {
    setCreatingSim(false);
    setSelectedSimId(simId);
    setAgentFocusSimId(simId);
    setActiveTab('simulations');
    // Log recent search/activity
    const sim = simulations.find((s) => s.id === simId);
    if (sim && authToken) {
      if (user) {
        await logRecentSearchToSupabase(user.id, activeWorkspaceId, {
          query: sim.name,
          category: 'Simulation',
          targetId: sim.id,
        }).catch(() => null);
      }
      await fetch('/api/recent-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: sim.name,
          category: 'Simulation',
          targetId: sim.id,
        }),
      }).catch(() => {});
      fetchWorkspaceState(authToken, activeWorkspaceId);
    }
  };

  const handleStopSimulation = async (simId: string) => {
    const res = await fetch(`/api/simulations/${simId}/stop`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      fetchWorkspaceState(authToken, activeWorkspaceId);
    }
  };

  const handleDeleteSimulation = async (simId: string) => {
    if (user) {
      await deleteSimulationInSupabase(user.id, simId).catch(() => false);
    }
    const res = await fetch(`/api/simulations/${simId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      setConfirmDeleteSimId(null);
      if (selectedSimId === simId) setSelectedSimId(null);
      fetchWorkspaceState(authToken, activeWorkspaceId);
    }
  };

  const handleDeleteRecentSearch = async (id: string) => {
    if (user) {
      await deleteRecentSearchInSupabase(user.id, id).catch(() => false);
    }
    await fetch(`/api/recent-searches/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    fetchWorkspaceState(authToken, activeWorkspaceId);
  };

  const handleClearRecentSearches = async () => {
    if (user) {
      await clearRecentSearchesInSupabase(user.id, activeWorkspaceId).catch(() => false);
    }
    await fetch('/api/recent-searches', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    fetchWorkspaceState(authToken, activeWorkspaceId);
  };

  // Prevent protected content from briefly appearing before authentication is checked
  if (authChecking) {
    return (
      <div className="min-h-screen bg-white text-[#111827] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <ClamirLogo size="md" />
          <span className="text-xs font-mono text-[#6B7280]">Verifying session...</span>
        </div>
      </div>
    );
  }

  // Render Landing or Auth Views
  if (appView === 'landing') {
    return (
      <>
        <OfflineStatusBanner />
        <LandingPage
          platformConfig={platformConfig}
          onGetStarted={handleGetStartedFromLanding}
        />
      </>
    );
  }

  if (appView === 'auth' || !user) {
    return (
      <>
        <OfflineStatusBanner />
        <AuthEntryFlow
          initialMode={authMode}
          onSuccess={handleAuthSuccess}
          onBackToLanding={() => {
            window.history.replaceState({}, '', '/');
            setAppView('landing');
          }}
        />
      </>
    );
  }

  const rawActiveWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || {
      id: 'ws-default',
      name: 'Clemir Workspace',
      ownerId: user.id,
      createdAt: new Date().toISOString(),
      role: 'Owner' as const,
    };

  const activeWorkspace: Workspace = {
    ...rawActiveWorkspace,
    name:
      rawActiveWorkspace.name === 'Clamir Workspace' ||
      rawActiveWorkspace.name === 'Clamir Research Lab' ||
      rawActiveWorkspace.name === "Varun's Workspace" ||
      rawActiveWorkspace.name === 'VUser Workspace' ||
      rawActiveWorkspace.name === "VUser's Workspace"
        ? 'Clemir Workspace'
        : rawActiveWorkspace.name,
  };

  const activeSimObj = simulations.find((s) => s.id === selectedSimId) || null;

  const completedSimsCount = simulations.filter((s) => s.status === 'Completed').length;
  const filteredSimulations = simulations.filter((s) => {
    if (!simSearchQuery.trim()) return true;
    const q = simSearchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  });

  const displayUserName = normalizeConsistentUserName(user.name, user.email);

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-white text-[#111827] flex flex-col">
      <OfflineStatusBanner />

      {/* Mobile Compact Top Header (Install App Option Removed) */}
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-4 h-14 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="cursor-pointer"
        >
          <ClamirLogo size="sm" />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAgentDrawerOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#000000] rounded-md cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Agent</span>
          </button>
          <button
            type="button"
            onClick={() => setShowWorkspaceModal(true)}
            className="px-2.5 py-1 text-xs font-medium text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-md truncate max-w-[130px]"
          >
            {activeWorkspace.name}
          </button>
        </div>
      </header>

      {/* Desktop Three-Panel Shell */}
      <div className="flex-1 flex min-h-0">
        {/* LEFT SIDEBAR (Single Collapsible Toggle in Navigation Bar) */}
        <aside
          className={`hidden md:flex flex-col justify-between bg-[#F9FAFB] border-r border-[#E5E7EB] transition-all duration-200 shrink-0 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Upper & Middle Sidebar Sections */}
          <div className="p-3.5 space-y-5 overflow-y-auto overflow-x-hidden flex-1">
            {/* Top Logo & Single Header Collapse/Expand Arrow Button */}
            <div
              className={`flex ${
                sidebarCollapsed
                  ? 'flex-col items-center gap-2.5'
                  : 'items-center justify-between gap-2'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedSimId(null);
                  setCreatingSim(false);
                  setActiveTab('dashboard');
                }}
                className="cursor-pointer focus:outline-none shrink-0"
              >
                <ClamirLogo symbolOnly={sidebarCollapsed} size="md" />
              </button>

              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 text-[#111827] bg-white border border-[#E5E7EB] hover:border-[#000000] rounded-md transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4 shrink-0" />
                ) : (
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                )}
              </button>
            </div>

            {/* Workspace Switcher Button */}
            <button
              type="button"
              onClick={() => setShowWorkspaceModal(true)}
              className={`w-full flex items-center ${
                sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between p-2.5'
              } gap-2 bg-white border border-[#E5E7EB] rounded-md hover:border-[#000000] transition-colors text-left cursor-pointer`}
              title="Switch or manage workspaces"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FolderKanban className="w-4 h-4 text-[#111827] shrink-0" />
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <span className="block text-[10px] font-mono text-[#6B7280]">WORKSPACE</span>
                    <span className="block text-xs font-semibold text-[#111827] truncate">
                      {activeWorkspace.name}
                    </span>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <span className="text-[10px] font-mono text-[#6B7280] shrink-0">Switch</span>
              )}
            </button>

            {/* Main Navigation */}
            <div>
              {!sidebarCollapsed && (
                <span className="px-2.5 text-[10px] font-mono font-semibold text-[#6B7280] tracking-wider">
                  MAIN NAVIGATION
                </span>
              )}
              <nav className="mt-1.5 space-y-1">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { id: 'simulations', label: 'Simulations', icon: Layers },
                  { id: 'agent', label: 'AI Agent', icon: Bot },
                  { id: 'audience', label: 'Audience Database', icon: Users },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id as WorkspaceTab);
                        if (item.id !== 'simulations') {
                          setCreatingSim(false);
                        }
                      }}
                      className={`w-full flex items-center ${
                        sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-2.5 py-2'
                      } rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#000000] text-white font-semibold'
                          : 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-200/60'
                      }`}
                      title={item.label}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Workspace Recent Searches Section */}
            {!sidebarCollapsed && (
              <div>
                <div className="px-2.5 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold text-[#6B7280] tracking-wider">
                    RECENT SEARCHES
                  </span>
                  {recentSearches.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearRecentSearches}
                      className="text-[10px] text-[#6B7280] hover:text-red-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="mt-1.5 space-y-1 max-h-36 overflow-y-auto">
                  {recentSearches.length === 0 ? (
                    <p className="px-2.5 py-1.5 text-[11px] text-[#6B7280]">
                      No recent activity yet.
                    </p>
                  ) : (
                    recentSearches.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-gray-200/60 text-xs text-[#6B7280]"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (item.targetId && item.category === 'Simulation') {
                              handleOpenSimulation(item.targetId);
                            } else if (item.category === 'Agent') {
                              setActiveTab('agent');
                            } else if (item.category === 'Audience') {
                              setActiveTab('audience');
                            }
                          }}
                          className="flex items-center gap-2 truncate text-left flex-1 hover:text-[#111827] cursor-pointer"
                        >
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.query}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecentSearch(item.id)}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-600 cursor-pointer"
                          title="Delete item"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom User Profile Bar */}
          <div className="p-3.5 border-t border-[#E5E7EB] bg-white">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setAccountInitialSubTab('profile');
                  setActiveTab('account');
                }}
                className={`flex items-center gap-2.5 min-w-0 text-left cursor-pointer ${
                  sidebarCollapsed ? 'mx-auto' : 'flex-1'
                }`}
                title={displayUserName}
              >
                <div className="w-8 h-8 rounded-md bg-[#000000] text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                  {displayUserName.slice(0, 2).toUpperCase()}
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#111827] truncate">{displayUserName}</p>
                  </div>
                )}
              </button>
              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setAppView('landing')}
                  className="text-[11px] font-medium text-[#6B7280] hover:text-[#111827] underline shrink-0 cursor-pointer"
                >
                  Site
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* CENTER WORKSPACE */}
        <main className="flex-1 min-w-0 flex flex-col justify-between overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 space-y-6">

            {/* TAB 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="space-y-6">
                  {/* Welcome Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
                    <div>
                      <span className="text-xs font-mono text-[#6B7280]">
                        CLEMIR WORKSPACE
                      </span>
                      <h1 className="text-2xl font-bold text-[#111827] mt-0.5">
                        Welcome back, {displayUserName}
                      </h1>
                      <p className="text-xs sm:text-sm text-[#6B7280]">
                        Simulate custom target audiences, collaborate with Clemir AI Agent, and export full research reports.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAgentDrawerOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 transition-colors cursor-pointer self-start sm:self-center whitespace-nowrap shrink-0"
                    >
                      <Bot className="w-4 h-4" />
                      <span>Ask Clemir AI</span>
                    </button>
                  </div>

                  {/* 4 KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Simulations', value: simulations.length },
                      { label: 'Completed Simulations', value: completedSimsCount },
                      { label: 'Active Audiences', value: personas.length },
                      { label: 'Saved Reports', value: reports.length },
                    ].map((kpi) => (
                      <div
                        key={kpi.label}
                        className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg"
                      >
                        <span className="text-xs text-[#6B7280] block">{kpi.label}</span>
                        <span className="mt-2 block text-2xl font-bold font-mono text-[#111827] tabular-nums">
                          {kpi.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Quick Shortcuts */}
                  <div>
                    <h2 className="text-xs font-mono font-semibold text-[#6B7280] mb-2.5">
                      QUICK SIMULATION SHORTCUTS (CUSTOM AUDIENCES ENABLED FOR ALL)
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        {
                          id: 'test_idea' as SimulationTypeId,
                          title: 'Test an Idea',
                          desc: 'Validate problem-solution fit & adoption intent with any audience',
                          icon: FlaskConical,
                        },
                        {
                          id: 'ab_testing' as SimulationTypeId,
                          title: 'A/B Testing',
                          desc: 'Compare Option A vs Option B head-to-head',
                          icon: Sliders,
                        },
                        {
                          id: 'pricing_analysis' as SimulationTypeId,
                          title: 'Pricing Analysis',
                          desc: 'Test price elasticity & multi-tier packaging',
                          icon: DollarSign,
                        },
                        {
                          id: 'market_exploration' as SimulationTypeId,
                          title: 'Market Exploration',
                          desc: 'Uncover unmet needs & category whitespace',
                          icon: Compass,
                        },
                      ].map((sc) => {
                        const Icon = sc.icon;
                        return (
                          <button
                            key={sc.id}
                            type="button"
                            onClick={() => handleStartNewSimShortcut(sc.id)}
                            className="p-4 text-left bg-white border border-[#E5E7EB] rounded-lg hover:border-[#000000] transition-colors cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-[#111827]">{sc.title}</span>
                              <Icon className="w-4 h-4 text-[#111827]" />
                            </div>
                            <p className="mt-1 text-xs text-[#6B7280]">{sc.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Simulations Table */}
                  <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
                      <h2 className="text-sm font-bold text-[#111827]">Recent Simulations</h2>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSimId(null);
                          setCreatingSim(false);
                          setActiveTab('simulations');
                        }}
                        className="text-xs font-semibold text-[#111827] hover:underline cursor-pointer"
                      >
                        View All Simulations
                      </button>
                    </div>

                    {simulations.length === 0 ? (
                      <div className="p-8 text-center space-y-3">
                        <p className="text-sm font-semibold text-[#111827]">No simulations in this workspace yet</p>
                        <p className="text-xs text-[#6B7280]">
                          Create your first simulation to test an idea, pricing model, or A/B concept.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleStartNewSimShortcut('test_idea')}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md cursor-pointer"
                        >
                          Create First Simulation
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] font-mono text-[11px]">
                              <th className="py-2.5 px-4">Simulation Name</th>
                              <th className="py-2.5 px-4">Type</th>
                              <th className="py-2.5 px-4">Target Audience</th>
                              <th className="py-2.5 px-4">Status</th>
                              <th className="py-2.5 px-4 text-right">Personas</th>
                              <th className="py-2.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7EB]">
                            {simulations.map((sim) => {
                              const meta = SIMULATION_TYPES_META.find((m) => m.id === sim.type);
                              return (
                                <tr key={sim.id} className="hover:bg-[#F9FAFB]">
                                  <td className="py-3 px-4 font-semibold text-[#111827]">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSimulation(sim.id)}
                                      className="hover:underline text-left cursor-pointer"
                                    >
                                      {sim.name}
                                    </button>
                                    {sim.isSample && (
                                      <span className="ml-2 text-[10px] font-mono text-[#6B7280]">
                                        · Sample
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-[#6B7280]">
                                    {meta?.shortName || sim.type}
                                  </td>
                                  <td className="py-3 px-4 text-[#6B7280] max-w-[200px] truncate">
                                    {sim.targetAudience || 'Custom Audience'}
                                  </td>
                                  <td className="py-3 px-4 font-mono">
                                    <span
                                      className={
                                        sim.status === 'Completed'
                                          ? 'text-[#111827] font-semibold'
                                          : sim.status === 'Active'
                                          ? 'text-amber-700 font-semibold'
                                          : 'text-[#6B7280]'
                                      }
                                    >
                                      {sim.status} ({sim.stage})
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#111827]">
                                    {sim.selectedPersonas.length}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="inline-flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenSimulation(sim.id)}
                                        className="px-2.5 py-1 text-xs font-semibold text-white bg-[#000000] rounded hover:bg-neutral-800 cursor-pointer"
                                      >
                                        {sim.status === 'Completed' ? 'View Results' : 'Open'}
                                      </button>
                                      {sim.status === 'Active' && (
                                        <button
                                          type="button"
                                          onClick={() => handleStopSimulation(sim.id)}
                                          className="p-1 text-amber-700 hover:bg-amber-50 rounded cursor-pointer"
                                          title="Stop simulation"
                                        >
                                          <Square className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteSimId(sim.id)}
                                        className="p-1 text-[#6B7280] hover:text-red-600 rounded cursor-pointer"
                                        title="Delete simulation"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SIMULATIONS (List, Creator, or Results View) */}
            {activeTab === 'simulations' && (
              <>
                {creatingSim ? (
                  <SimulationCreator
                    initialType={createSimInitialType}
                    personas={personas}
                    authToken={authToken}
                    onCancel={() => setCreatingSim(false)}
                    onPersonasChanged={() => fetchWorkspaceState(authToken, activeWorkspaceId)}
                    onOpenAgent={() => setActiveTab('agent')}
                    onSimulationStarted={(newSimId) => {
                      setCreatingSim(false);
                      fetchWorkspaceState(authToken, activeWorkspaceId);
                      setSelectedSimId(newSimId);
                      setAgentFocusSimId(newSimId);
                    }}
                  />
                ) : activeSimObj ? (
                  <SimulationResultsView
                    simulation={activeSimObj}
                    authToken={authToken}
                    onBack={() => setSelectedSimId(null)}
                    onUpdated={(updatedSim) => {
                      setSimulations((prev) =>
                        prev.map((s) => (s.id === updatedSim.id ? updatedSim : s))
                      );
                      if (user && updatedSim.status === 'Completed') {
                        saveSimulationToSupabase(user.id, activeWorkspaceId, updatedSim).catch(
                          () => null
                        );
                      }
                    }}
                    onOpenInAgent={(simId) => {
                      setAgentFocusSimId(simId);
                      setActiveTab('agent');
                    }}
                    onReportSaved={() => fetchWorkspaceState(authToken, activeWorkspaceId)}
                  />
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
                      <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
                          Audience Simulations
                        </h1>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          Create, monitor, and analyze multi-persona simulations with custom target audiences across all seven research modes.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartNewSimShortcut('test_idea')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 cursor-pointer self-start sm:self-center"
                      >
                        <Plus className="w-4 h-4" />
                        <span>New Simulation</span>
                      </button>
                    </div>

                    {/* Search & Quick Type Launchers */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={simSearchQuery}
                          onChange={(e) => setSimSearchQuery(e.target.value)}
                          placeholder="Search simulations by name, type, or description..."
                          className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000] placeholder:text-[#9CA3AF]"
                        />
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {SIMULATION_TYPES_META.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleStartNewSimShortcut(m.id)}
                            className="px-2.5 py-1.5 text-xs font-medium text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-md hover:border-[#000000] cursor-pointer"
                          >
                            + {m.shortName}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Simulations Cards / Table */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredSimulations.map((sim) => {
                        const meta = SIMULATION_TYPES_META.find((m) => m.id === sim.type);
                        return (
                          <div
                            key={sim.id}
                            className="p-5 bg-white border border-[#E5E7EB] rounded-lg flex flex-col justify-between space-y-4"
                          >
                            <div>
                              <div className="flex items-center justify-between text-xs font-mono text-[#6B7280]">
                                <span>{meta?.name || sim.type}</span>
                                <span>
                                  {sim.status} · {sim.progress}%
                                </span>
                              </div>
                              <h3 className="mt-1.5 text-base font-bold text-[#111827]">
                                {sim.name}
                              </h3>
                              <p className="mt-1 text-xs text-[#6B7280] line-clamp-2">
                                {sim.description}
                              </p>
                              <p className="mt-2 text-[11px] font-mono text-[#111827]">
                                Target Audience: {sim.targetAudience || 'Custom Defined Audience'}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between gap-2 text-xs">
                              <span className="font-mono text-[#6B7280] tabular-nums">
                                {sim.selectedPersonas.length} Personas ·{' '}
                                {new Date(sim.startedAt).toLocaleDateString()}
                              </span>
                              <div className="flex items-center gap-2">
                                {sim.status === 'Active' && (
                                  <button
                                    type="button"
                                    onClick={() => handleStopSimulation(sim.id)}
                                    className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded cursor-pointer"
                                  >
                                    Stop
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAgentFocusSimId(sim.id);
                                    setActiveTab('agent');
                                  }}
                                  className="px-2.5 py-1.5 text-xs font-medium text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded hover:border-[#000000] cursor-pointer"
                                  title="Interrogate in AI Agent"
                                >
                                  Agent
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteSimId(sim.id)}
                                  className="p-1.5 text-[#6B7280] hover:text-red-600 border border-[#E5E7EB] rounded cursor-pointer"
                                  title="Delete simulation"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenSimulation(sim.id)}
                                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 cursor-pointer"
                                >
                                  Open Results
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB 3: AI RESEARCH AGENT */}
            {activeTab === 'agent' && (
              <AIAgentWorkspace
                conversations={conversations}
                simulations={simulations}
                personas={personas}
                additionalContexts={additionalContexts}
                onAdditionalContextsChange={setAdditionalContexts}
                initialSimulationId={agentFocusSimId}
                initialPersonaId={agentFocusPersonaId}
                authToken={authToken}
                onConversationsChanged={() => fetchWorkspaceState(authToken, activeWorkspaceId)}
                onPersonasChanged={() => fetchWorkspaceState(authToken, activeWorkspaceId)}
                onOpenSimulation={handleOpenSimulation}
              />
            )}

            {/* TAB 4: AUDIENCE DATABASE */}
            {activeTab === 'audience' && (
              <AudienceDatabase
                personas={personas}
                authToken={authToken}
                onPersonasChanged={() => fetchWorkspaceState(authToken, activeWorkspaceId)}
                onTalkToPersona={(personaId) => {
                  setAgentFocusPersonaId(personaId);
                  setActiveTab('agent');
                }}
              />
            )}

            {/* TAB 5 & 6: ACCOUNT & REPORTS / OWNER SETTINGS */}
            {(activeTab === 'account' || activeTab === 'owner') && (
              <AccountAndReports
                key={activeTab === 'owner' ? 'owner' : accountInitialSubTab}
                user={user}
                activeWorkspace={activeWorkspace}
                simulations={simulations}
                reports={reports}
                recentSearches={recentSearches}
                platformConfig={platformConfig}
                authToken={authToken}
                initialSubTab={activeTab === 'owner' ? 'owner' : accountInitialSubTab}
                onUserUpdated={(u) => setUser(u)}
                onReportsChanged={() => fetchWorkspaceState(authToken, activeWorkspaceId)}
                onConfigUpdated={(cfg) => setPlatformConfig(cfg)}
                onOpenSimulation={handleOpenSimulation}
                onLogout={handleLogout}
              />
            )}
          </div>
        </main>
      </div>

      {/* MOBILE FIXED BOTTOM NAVIGATION (5 Items: Home, Sims, Agent, Audience, Account) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#E5E7EB] h-16 grid grid-cols-5">
        {[
          { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
          { id: 'simulations', label: 'Sims', icon: Layers },
          { id: 'agent', label: 'Agent', icon: Bot },
          { id: 'audience', label: 'Audience', icon: Users },
          { id: 'account', label: 'Account', icon: User },
        ].map((navItem) => {
          const Icon = navItem.icon;
          const active = activeTab === navItem.id;
          return (
            <button
              key={navItem.id}
              type="button"
              onClick={() => {
                setActiveTab(navItem.id as WorkspaceTab);
                if (navItem.id !== 'simulations') setCreatingSim(false);
              }}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium cursor-pointer ${
                active ? 'text-[#000000] font-bold' : 'text-[#6B7280]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{navItem.label}</span>
            </button>
          );
        })}
      </nav>

      {/* WORKSPACE SWITCHER MODAL */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-base font-bold text-[#111827]">Workspaces</h3>
              <button
                type="button"
                onClick={() => setShowWorkspaceModal(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {workspaces.map((ws) => {
                const isCurrent = ws.id === activeWorkspaceId;
                return (
                  <div
                    key={ws.id}
                    className={`p-3 rounded-md border flex items-center justify-between gap-2 text-xs ${
                      isCurrent ? 'bg-[#F9FAFB] border-[#000000]' : 'bg-white border-[#E5E7EB]'
                    }`}
                  >
                    {renamingWorkspaceId === ws.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={renameWorkspaceValue}
                          onChange={(e) => setRenameWorkspaceValue(e.target.value)}
                          placeholder="Enter new workspace name"
                          className="flex-1 px-2 py-1 border border-[#E5E7EB] rounded text-xs placeholder:text-[#9CA3AF]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameWorkspace(ws.id)}
                          className="px-2.5 py-1 bg-[#000000] text-white rounded text-xs font-semibold cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveWorkspaceId(ws.id);
                            setSelectedSimId(null);
                            setCreatingSim(false);
                            setShowWorkspaceModal(false);
                          }}
                          className="text-left flex-1 cursor-pointer"
                        >
                          <div className="font-semibold text-[#111827]">{ws.name}</div>
                          <div className="text-[11px] font-mono text-[#6B7280]">
                            Role: {ws.role} {isCurrent ? '· Active' : ''}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingWorkspaceId(ws.id);
                            setRenameWorkspaceValue('');
                          }}
                          className="p-1.5 text-[#6B7280] hover:text-[#111827] cursor-pointer"
                          title="Rename workspace"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleCreateWorkspace} className="pt-3 border-t border-[#E5E7EB] space-y-2">
              <label className="block text-xs font-semibold text-[#111827]">
                Create New Isolated Workspace
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace name (e.g., Q1 Product Launch)"
                  className="flex-1 px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-md placeholder:text-[#9CA3AF]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Integrated AI Agent Launcher (available on non-Agent views on desktop) */}
      {activeTab !== 'agent' && !agentDrawerOpen && (
        <button
          type="button"
          onClick={() => setAgentDrawerOpen(true)}
          className="hidden md:inline-flex fixed bottom-5 right-5 z-40 items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#000000] rounded-md shadow-sm hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <Bot className="w-4 h-4" />
          <span>Clemir AI Agent</span>
        </button>
      )}

      {/* Integrated AI Agent Slide-Over Drawer */}
      <IntegratedAgentDrawer
        isOpen={agentDrawerOpen}
        onClose={() => setAgentDrawerOpen(false)}
        onOpenFullWorkspace={() => setActiveTab('agent')}
        conversations={conversations}
        simulations={simulations}
        personas={personas}
        additionalContexts={additionalContexts}
        onAdditionalContextsChange={setAdditionalContexts}
        activeSimulationId={agentFocusSimId || selectedSimId}
        authToken={authToken}
        onConversationsChanged={() => fetchWorkspaceState(authToken, activeWorkspaceId)}
      />

      {/* DELETE SIMULATION CONFIRMATION DIALOG */}
      {confirmDeleteSimId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-lg p-6">
            <h3 className="text-base font-bold text-[#111827]">Delete Simulation?</h3>
            <p className="mt-2 text-xs text-[#6B7280]">
              This action permanently deletes the simulation and its persona responses from your workspace.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteSimId(null)}
                className="px-4 py-2 text-xs font-medium text-[#111827] border border-[#E5E7EB] rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSimulation(confirmDeleteSimId)}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 cursor-pointer"
              >
                Delete Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
