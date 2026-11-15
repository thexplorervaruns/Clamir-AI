import React, { useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  FileText,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import {
  PlatformConfig,
  RecentSearchItem,
  ReportArtifact,
  Simulation,
  UserProfile,
  Workspace,
} from '../types/clamir.ts';
import { exportSimulationReport } from '../utils/reportExporter.ts';

interface AccountAndReportsProps {
  user: UserProfile;
  activeWorkspace: Workspace;
  simulations: Simulation[];
  reports: ReportArtifact[];
  recentSearches: RecentSearchItem[];
  platformConfig: PlatformConfig;
  authToken: string;
  initialSubTab?: 'profile' | 'reports' | 'activity' | 'owner';
  onUserUpdated: (user: UserProfile) => void;
  onReportsChanged: () => void;
  onConfigUpdated: (config: PlatformConfig) => void;
  onOpenSimulation: (simId: string) => void;
  onLogout: () => void;
}

export const AccountAndReports: React.FC<AccountAndReportsProps> = ({
  user,
  activeWorkspace,
  simulations,
  reports,
  recentSearches,
  platformConfig,
  authToken,
  initialSubTab = 'profile',
  onUserUpdated,
  onReportsChanged,
  onConfigUpdated,
  onOpenSimulation,
  onLogout,
}) => {
  const [subTab, setSubTab] = useState<'profile' | 'reports' | 'activity' | 'owner'>(
    initialSubTab
  );
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Reports filter state
  const [reportSearch, setReportSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'PDF' | 'JSON' | 'TXT' | 'CSV'>('ALL');
  const [confirmDeleteReportId, setConfirmDeleteReportId] = useState<string | null>(null);

  // Owner Settings state
  const [editableConfig, setEditableConfig] = useState<PlatformConfig>(platformConfig);
  const [ownerMsg, setOwnerMsg] = useState<string | null>(null);
  const [savingOwner, setSavingOwner] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: profileName.trim(),
          email: profileEmail.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onUserUpdated(data.user);
        setProfileMsg('Profile information updated.');
      } else {
        setProfileMsg(data.error || 'Could not update profile.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePlanChange = async (newPlan: 'Explorer' | 'Growth' | 'Enterprise') => {
    setProfileMsg(null);
    const res = await fetch('/api/account/plan', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ plan: newPlan }),
    });
    if (res.ok) {
      const data = await res.json();
      onUserUpdated(data.user);
      setProfileMsg(
        `Workspace plan switched to ${newPlan}. (Note: Payment billing is disabled until a live payment provider is connected.)`
      );
    }
  };

  const handleDownloadReport = (report: ReportArtifact) => {
    const relatedSim =
      simulations.find((s) => s.id === report.simulationId) || simulations[0];
    if (relatedSim) {
      exportSimulationReport(relatedSim, report.format);
    }
  };

  const handleDeleteReport = async (id: string) => {
    const res = await fetch(`/api/reports/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      setConfirmDeleteReportId(null);
      onReportsChanged();
    }
  };

  const handleSaveOwnerConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOwner(true);
    setOwnerMsg(null);
    try {
      const res = await fetch('/api/owner/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(editableConfig),
      });
      const data = await res.json();
      if (res.ok) {
        onConfigUpdated(data.config);
        setOwnerMsg('Owner platform configuration saved and synced across public landing page.');
      } else {
        setOwnerMsg(data.error || 'Server rejected owner configuration update.');
      }
    } finally {
      setSavingOwner(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (formatFilter !== 'ALL' && r.format !== formatFilter) return false;
    if (reportSearch.trim()) {
      const q = reportSearch.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.simulationName.toLowerCase().includes(q) ||
        r.summarySnippet.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const currentPlanMeta =
    platformConfig.pricingPlans.find((p) => p.id === user.plan) ||
    platformConfig.pricingPlans[0];

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
            Explorer — Accounts &amp; Plan Reports
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Manage your account profile, subscription plan, and exported simulation reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md self-start">
          <button
            type="button"
            onClick={() => setSubTab('profile')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
              subTab === 'profile'
                ? 'bg-[#000000] text-white'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Accounts
          </button>
          <button
            type="button"
            onClick={() => setSubTab('reports')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
              subTab === 'reports'
                ? 'bg-[#000000] text-white'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Report ({reports.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('activity')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
              subTab === 'activity' ? 'bg-[#000000] text-white' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Recent Activity
          </button>
          {user.isOwner && (
            <button
              type="button"
              onClick={() => setSubTab('owner')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer inline-flex items-center gap-1 ${
                subTab === 'owner' ? 'bg-[#000000] text-white' : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Owner Settings</span>
            </button>
          )}
        </div>
      </div>

      {profileMsg && (
        <div className="p-3.5 bg-[#F9FAFB] border border-[#111827] rounded-md text-xs text-[#111827]">
          {profileMsg}
        </div>
      )}

      {/* ACCOUNTS & PLAN INFORMATION */}
      {subTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Account Profile Card */}
          <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#111827]" />
                <h2 className="text-base font-bold text-[#111827]">Account Profile</h2>
              </div>
              {user.isOwner && (
                <span className="text-[11px] font-mono text-[#111827] font-semibold">
                  Verified Owner
                </span>
              )}
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#111827] mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">Email Address</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md">
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Active Workspace</span>
                  <span className="font-semibold text-[#111827]">{activeWorkspace.name}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Current Plan</span>
                  <span className="font-semibold text-[#111827] font-mono">{user.plan}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3.5 py-2 text-xs font-medium text-red-700 border border-red-200 bg-red-50 rounded-md hover:bg-red-100 cursor-pointer"
                >
                  Sign Out
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile ? 'Saving...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Plan & Usage Information */}
          <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#111827]">Subscription &amp; Usage Summary</h2>
                <p className="text-xs text-[#6B7280]">
                  Current subscription: <strong className="text-[#111827]">{currentPlanMeta.name} ({currentPlanMeta.priceLabel}{currentPlanMeta.billingPeriod ? ` ${currentPlanMeta.billingPeriod}` : ''})</strong>
                </p>
              </div>
              <span className="text-xs font-mono text-[#6B7280] tabular-nums">
                Usage: {simulations.length} / {currentPlanMeta.simulationsLimit} Simulations
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {platformConfig.pricingPlans.map((plan) => {
                const isCurrent = user.plan === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-md border flex flex-col justify-between text-xs ${
                      isCurrent ? 'bg-[#F9FAFB] border-[#000000]' : 'bg-white border-[#E5E7EB]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between font-bold text-[#111827]">
                        <span>{plan.name}</span>
                        <span className="font-mono">{plan.priceLabel}</span>
                      </div>
                      <ul className="mt-3 space-y-1.5 text-[#6B7280]">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-[#111827] shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      disabled={isCurrent}
                      onClick={() => handlePlanChange(plan.id)}
                      className={`mt-4 w-full py-1.5 px-3 rounded font-semibold transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-gray-200 text-[#111827] cursor-default'
                          : 'bg-[#000000] text-white hover:bg-neutral-800'
                      }`}
                    >
                      {isCurrent ? 'Current Plan' : `Switch to ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[11px] text-[#6B7280]">
              Billing Notice: Plan upgrades in this environment update workspace quotas immediately without charging a card until a live payment provider is connected.
            </div>
          </div>
        </div>
      )}

      {/* PLAN REPORTS AND ARTIFACTS */}
      {subTab === 'reports' && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
            <h2 className="text-base font-bold text-[#111827]">
              Plan Reports &amp; Exported Artifacts ({reports.length})
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E7EB]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5" />
              <input
                type="text"
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                placeholder="Search saved reports by title or simulation..."
                className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md">
              {(['ALL', 'PDF', 'JSON', 'CSV', 'TXT'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormatFilter(fmt)}
                  className={`px-2.5 py-1 text-xs font-mono font-medium rounded cursor-pointer ${
                    formatFilter === fmt
                      ? 'bg-[#000000] text-white'
                      : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <FileText className="w-6 h-6 text-[#6B7280] mx-auto" />
              <p className="text-sm font-semibold text-[#111827]">No matching report artifacts</p>
              <p className="text-xs text-[#6B7280]">
                Open any completed simulation and click PDF, JSON, CSV, or TXT to generate and save a report here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {filteredReports.map((rep) => (
                <div
                  key={rep.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#111827]">
                      <span className="font-mono px-2 py-0.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded">
                        {rep.format}
                      </span>
                      <span className="truncate">{rep.title}</span>
                    </div>
                    <p className="text-xs text-[#6B7280] line-clamp-1">{rep.summarySnippet}</p>
                    <div className="text-[11px] font-mono text-[#6B7280] tabular-nums">
                      Simulation: {rep.simulationName} · Size: {rep.sizeLabel} · Created:{' '}
                      {new Date(rep.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenSimulation(rep.simulationId)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#111827] border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB] cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Simulation</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadReport(rep)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download {rep.format}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteReportId(rep.id)}
                      className="p-1.5 text-[#6B7280] hover:text-red-600 border border-[#E5E7EB] rounded-md cursor-pointer"
                      title="Delete report"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: RECENT ACTIVITY */}
      {subTab === 'activity' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#111827] border-b border-[#E5E7EB] pb-2">
              Recent Simulations ({simulations.length})
            </h3>
            <div className="space-y-2.5 text-xs">
              {simulations.slice(0, 6).map((sim) => (
                <div key={sim.id} className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#111827] truncate">{sim.name}</p>
                    <p className="text-[11px] font-mono text-[#6B7280]">
                      {sim.status} · {new Date(sim.startedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenSimulation(sim.id)}
                    className="text-xs font-semibold text-[#111827] underline shrink-0 cursor-pointer"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#111827] border-b border-[#E5E7EB] pb-2">
              Recent Searches ({recentSearches.length})
            </h3>
            <div className="space-y-2.5 text-xs">
              {recentSearches.length === 0 ? (
                <p className="text-[#6B7280]">No recent search activities logged.</p>
              ) : (
                recentSearches.slice(0, 6).map((rs) => (
                  <div key={rs.id} className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md">
                    <p className="font-semibold text-[#111827] truncate">{rs.query}</p>
                    <p className="text-[11px] font-mono text-[#6B7280]">
                      {rs.category} · {new Date(rs.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#111827] border-b border-[#E5E7EB] pb-2">
              Recent Reports ({reports.length})
            </h3>
            <div className="space-y-2.5 text-xs">
              {reports.slice(0, 6).map((rep) => (
                <div key={rep.id} className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#111827] truncate">{rep.title}</p>
                    <p className="text-[11px] font-mono text-[#6B7280]">
                      {rep.format} · {new Date(rep.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadReport(rep)}
                    className="text-xs font-semibold text-[#111827] underline shrink-0 cursor-pointer"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: VERIFIED APPLICATION OWNER SETTINGS */}
      {subTab === 'owner' && user.isOwner && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#111827]" />
              <div>
                <h2 className="text-base font-bold text-[#111827]">
                  Application Owner Settings (Server-Verified)
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Configure platform pricing cards, simulation defaults, and global agent settings.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#111827]">Owner: {user.email}</span>
          </div>

          {ownerMsg && (
            <div className="p-3 bg-[#F9FAFB] border border-[#111827] rounded-md text-xs text-[#111827]">
              {ownerMsg}
            </div>
          )}

          <form onSubmit={handleSaveOwnerConfig} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {editableConfig.pricingPlans.map((plan, idx) => (
                <div key={plan.id} className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-3">
                  <div className="font-bold text-sm text-[#111827]">{plan.name} Tier Config</div>
                  <div>
                    <label className="block font-semibold text-[#111827] mb-1">Price Label</label>
                    <input
                      type="text"
                      value={plan.priceLabel}
                      onChange={(e) => {
                        const next = [...editableConfig.pricingPlans];
                        next[idx] = { ...next[idx], priceLabel: e.target.value };
                        setEditableConfig({ ...editableConfig, pricingPlans: next });
                      }}
                      className="w-full px-2.5 py-1.5 font-mono bg-white border border-[#E5E7EB] rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#111827] mb-1">Billing Period</label>
                    <input
                      type="text"
                      value={plan.billingPeriod}
                      onChange={(e) => {
                        const next = [...editableConfig.pricingPlans];
                        next[idx] = { ...next[idx], billingPeriod: e.target.value };
                        setEditableConfig({ ...editableConfig, pricingPlans: next });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#111827] mb-1">Monthly Simulation Limit</label>
                    <input
                      type="number"
                      value={plan.simulationsLimit}
                      onChange={(e) => {
                        const next = [...editableConfig.pricingPlans];
                        next[idx] = { ...next[idx], simulationsLimit: Number(e.target.value) };
                        setEditableConfig({ ...editableConfig, pricingPlans: next });
                      }}
                      className="w-full px-2.5 py-1.5 font-mono bg-white border border-[#E5E7EB] rounded"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={savingOwner}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
              >
                {savingOwner ? 'Saving Configuration...' : 'Save Owner Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Report Confirmation Modal */}
      {confirmDeleteReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-lg p-6">
            <h3 className="text-base font-bold text-[#111827]">Delete Saved Report?</h3>
            <p className="mt-2 text-xs text-[#6B7280]">
              Are you sure you want to remove this report artifact from your workspace?
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteReportId(null)}
                className="px-4 py-2 text-xs font-medium text-[#111827] border border-[#E5E7EB] rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteReport(confirmDeleteReportId)}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 cursor-pointer"
              >
                Delete Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
