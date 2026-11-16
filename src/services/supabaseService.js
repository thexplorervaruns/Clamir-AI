import { supabase } from "../supabaseClient.js";
import { BUILT_IN_PERSONAS } from "../data/seedData.ts";

const OWNER_EMAIL = "thexplorervaruns@gmail.com";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(val) {
  return typeof val === "string" && UUID_REGEX.test(val.trim());
}

async function resolveSupabaseWorkspaceId(userId, workspaceId) {
  if (isUuid(workspaceId)) return workspaceId.trim();
  if (!userId) return null;
  try {
    const { data: wsRows } = await supabase
      .from("workspaces")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);
    if (Array.isArray(wsRows) && wsRows[0]?.id) {
      return wsRows[0].id;
    }
  } catch {
    // ignore
  }
  return null;
}

export function normalizeConsistentUserName(rawName, email = "") {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const trimmed = String(rawName || "").trim();
  const lower = trimmed.toLowerCase();

  const isInvalidOrUnexpected =
    !trimmed ||
    lower === "tank" ||
    lower.startsWith("tank ") ||
    lower === "varun (workspace owner)" ||
    lower === "clamir user" ||
    lower === "clamir explorer" ||
    lower === "clemir user" ||
    lower === "clemir explorer";

  if (!isInvalidOrUnexpected) {
    return trimmed;
  }

  if (cleanEmail === OWNER_EMAIL) {
    return "Varuna";
  }
  if (cleanEmail === "mailattvaruns@gmail.com") {
    return "Varun S";
  }
  if (cleanEmail && cleanEmail.includes("@")) {
    const prefix = cleanEmail.split("@")[0];
    if (prefix && prefix.toLowerCase() !== "tank") {
      return prefix;
    }
  }
  return "Varuna";
}

// ---------------------------------------------------------------------------
// 1. SUPABASE AUTHENTICATION HELPERS
// ---------------------------------------------------------------------------
export async function signUpWithSupabase({ email, password, name = "" }) {
  const cleanEmail = String(email).trim();
  const resolvedName = normalizeConsistentUserName(name, cleanEmail);
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: String(password),
    options: {
      data: {
        full_name: resolvedName,
      },
    },
  });
  return { data, error };
}

export async function signInWithSupabase({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email).trim(),
    password: String(password),
  });
  return { data, error };
}

export async function signOutFromSupabase() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSupabaseSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  return { session, error };
}

export function subscribeToAuthChanges(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// ---------------------------------------------------------------------------
// 2. ROW MAPPERS (Snake_Case DB Rows <-> CamelCase App Types)
// ---------------------------------------------------------------------------
function mapWorkspaceRow(row) {
  return {
    id: row.id,
    name: row.name === "Clamir Workspace" ? "Clemir Workspace" : row.name || "Clemir Workspace",
    ownerId: row.user_id,
    createdAt: row.created_at || new Date().toISOString(),
    role: row.role || "Owner",
    favoritePersonaIds: Array.isArray(row.favorite_persona_ids)
      ? row.favorite_persona_ids
      : [],
    deletedBuiltInPersonaIds: Array.isArray(row.deleted_builtin_persona_ids)
      ? row.deleted_builtin_persona_ids
      : [],
  };
}

function mapPersonaRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    tagline: row.tagline || "",
    description: row.description || "",
    avatarCode: row.avatar_code || "CA",
    segment: row.segment || "Custom Segment",
    tags: Array.isArray(row.tags) ? row.tags : [],
    characteristics: Array.isArray(row.characteristics) ? row.characteristics : [],
    preferences: Array.isArray(row.preferences) ? row.preferences : [],
    motivations: Array.isArray(row.motivations) ? row.motivations : [],
    purchasingBehavior: row.purchasing_behavior || "",
    decisionFactors: Array.isArray(row.decision_factors) ? row.decision_factors : [],
    concerns: Array.isArray(row.concerns) ? row.concerns : [],
    context: row.context || "",
    priceSensitivity: row.price_sensitivity || "Moderate",
    decisionSpeed: row.decision_speed || "Deliberate",
    brandLoyalty: typeof row.brand_loyalty === "number" ? row.brand_loyalty : 60,
    isBuiltIn: Boolean(row.is_built_in),
    isFavorite: Boolean(row.is_favorite),
    createdAt: row.created_at,
  };
}

function mapSimulationRow(row) {
  const rawTypeSpecific = row.type_specific_data || {};
  const { _forecastConfig, ...cleanTypeSpecific } = rawTypeSpecific;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    type: row.type || "test_idea",
    description: row.description || "",
    hypothesis: row.hypothesis || "",
    researchContext: row.research_context || "",
    targetAudience: row.target_audience || "",
    researchObjectives: row.research_objectives || "",
    typeSpecificData: cleanTypeSpecific,
    materials: Array.isArray(row.materials) ? row.materials : [],
    questions: Array.isArray(row.questions) ? row.questions : [],
    selectedPersonas: Array.isArray(row.selected_personas) ? row.selected_personas : [],
    forecastConfig: _forecastConfig || undefined,
    status: row.status || "Active",
    stage: row.stage || "Queued",
    progress: typeof row.progress === "number" ? row.progress : 0,
    startedAt: row.started_at || row.created_at || new Date().toISOString(),
    completedAt: row.completed_at || undefined,
    estimatedSecondsRemaining: row.estimated_seconds_remaining,
    results: row.results || undefined,
  };
}

function mapConversationRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title || "Research Conversation",
    simulationId: row.simulation_id || null,
    personaId: row.persona_id || null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    messages: Array.isArray(row.messages) ? row.messages : [],
  };
}

function mapReportRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    simulationId: row.simulation_id,
    simulationName: row.simulation_name,
    title: row.title,
    format: row.format || "PDF",
    sizeLabel: row.size_label || "24 KB",
    createdAt: row.created_at || new Date().toISOString(),
    summarySnippet: row.summary_snippet || "",
  };
}

function mapRecentSearchRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    query: row.query,
    category: row.category || "Simulation",
    targetId: row.target_id || undefined,
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// 3. USER PROFILE & WORKSPACE BOOTSTRAP IN SUPABASE
// ---------------------------------------------------------------------------
export async function loadUserWorkspaceFromSupabase(sessionUser, requestedWorkspaceId) {
  if (!sessionUser || !sessionUser.id) return null;
  const userId = sessionUser.id;
  const email = sessionUser.email || "";
  const defaultName = normalizeConsistentUserName(
    sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name,
    email
  );
  const isOwner = email.toLowerCase() === OWNER_EMAIL;

  // 1. Load or create user_profiles row
  let userProfile = {
    id: userId,
    name: defaultName,
    email,
    plan: "Explorer",
    isOwner,
    createdAt: sessionUser.created_at || new Date().toISOString(),
  };

  const { data: profileRow, error: profileErr } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profileErr && profileRow) {
    const resolvedProfileName = normalizeConsistentUserName(
      profileRow.name,
      profileRow.email || email
    );
    userProfile = {
      id: profileRow.id,
      name: resolvedProfileName,
      email: profileRow.email || email,
      plan: profileRow.plan || "Explorer",
      isOwner: Boolean(profileRow.is_owner) || isOwner,
      createdAt: profileRow.created_at || userProfile.createdAt,
    };

    // Permanently repair stale or "tank" username in Supabase user_profiles if detected
    if (profileRow.name !== resolvedProfileName) {
      await supabase
        .from("user_profiles")
        .update({ name: resolvedProfileName })
        .eq("user_id", userId);
    }
  } else if (!profileErr && !profileRow) {
    const { data: insertedProfile } = await supabase
      .from("user_profiles")
      .insert({
        id: userId,
        user_id: userId,
        name: defaultName,
        email,
        plan: "Explorer",
        is_owner: isOwner,
      })
      .select("*")
      .maybeSingle();

    if (insertedProfile) {
      userProfile = {
        id: insertedProfile.id,
        name: normalizeConsistentUserName(insertedProfile.name, insertedProfile.email || email),
        email: insertedProfile.email,
        plan: insertedProfile.plan,
        isOwner: Boolean(insertedProfile.is_owner) || isOwner,
        createdAt: insertedProfile.created_at,
      };
    }
  }

  // 2. Load or create default workspace in public.workspaces
  const { data: wsRows, error: wsError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  // If Supabase tables have not yet been created via SQL editor, return null so backend API handles fallback seamlessly
  if (wsError) {
    return null;
  }

  let workspaces = (wsRows || []).map(mapWorkspaceRow);
  if (workspaces.length === 0) {
    const { data: createdWs, error: createWsErr } = await supabase
      .from("workspaces")
      .insert({
        user_id: userId,
        name: "Clemir Workspace",
        role: "Owner",
        favorite_persona_ids: [],
        deleted_builtin_persona_ids: [],
      })
      .select("*")
      .single();

    if (createWsErr || !createdWs) {
      return null;
    }
    workspaces = [mapWorkspaceRow(createdWs)];
  }

  const activeWs =
    workspaces.find((w) => w.id === requestedWorkspaceId) || workspaces[0];
  const wsId = activeWs.id;

  // 3. Load workspace-scoped records in parallel with RLS enforcement
  const [simRes, personaRes, convRes, repRes, searchRes] = await Promise.all([
    supabase
      .from("simulations")
      .select("*")
      .eq("user_id", userId)
      .eq("workspace_id", wsId)
      .order("started_at", { ascending: false }),
    supabase
      .from("personas")
      .select("*")
      .eq("user_id", userId)
      .or(`workspace_id.eq.${wsId},workspace_id.is.null`)
      .order("created_at", { ascending: true }),
    supabase
      .from("agent_conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("workspace_id", wsId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .eq("workspace_id", wsId)
      .order("created_at", { ascending: false }),
    supabase
      .from("recent_searches")
      .select("*")
      .eq("user_id", userId)
      .eq("workspace_id", wsId)
      .order("timestamp", { ascending: false })
      .limit(30),
  ]);

  const deletedBuiltIns = activeWs.deletedBuiltInPersonaIds || [];
  const favIds = activeWs.favoritePersonaIds || [];

  const activeBuiltIns = BUILT_IN_PERSONAS.filter(
    (p) => !deletedBuiltIns.includes(p.id)
  ).map((p) => ({
    ...p,
    isFavorite: favIds.includes(p.id),
  }));

  const customPersonas = (personaRes.data || []).map((row) => {
    const mapped = mapPersonaRow(row);
    return {
      ...mapped,
      isFavorite: mapped.isFavorite || favIds.includes(mapped.id),
    };
  });

  return {
    user: userProfile,
    workspaces,
    activeWorkspaceId: wsId,
    simulations: (simRes.data || []).map(mapSimulationRow),
    personas: [...activeBuiltIns, ...customPersonas],
    conversations: (convRes.data || []).map(mapConversationRow),
    reports: (repRes.data || []).map(mapReportRow),
    recentSearches: (searchRes.data || []).map(mapRecentSearchRow),
  };
}

// ---------------------------------------------------------------------------
// 4. DIRECT SUPABASE CRUD OPERATIONS
// ---------------------------------------------------------------------------
export async function createWorkspaceInSupabase(userId, name) {
  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      user_id: userId,
      name: String(name || "Clemir Workspace").trim(),
      role: "Owner",
    })
    .select("*")
    .single();

  if (error || !data) return null;
  return mapWorkspaceRow(data);
}

export async function renameWorkspaceInSupabase(userId, workspaceId, name) {
  const { data, error } = await supabase
    .from("workspaces")
    .update({ name: String(name).trim() })
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) return null;
  return mapWorkspaceRow(data);
}

export async function savePersonaToSupabase(userId, workspaceId, personaPayload, existingId = null) {
  if (!userId) return null;
  const safeWsId = await resolveSupabaseWorkspaceId(userId, workspaceId);
  const rowPayload = {
    user_id: userId,
    workspace_id: safeWsId,
    name: personaPayload.name,
    tagline: personaPayload.tagline || "",
    description: personaPayload.description || "",
    avatar_code: personaPayload.avatarCode || "CA",
    segment: personaPayload.segment || "Custom Segment",
    tags: personaPayload.tags || [],
    characteristics: personaPayload.characteristics || [],
    preferences: personaPayload.preferences || [],
    motivations: personaPayload.motivations || [],
    purchasing_behavior: personaPayload.purchasingBehavior || "",
    decision_factors: personaPayload.decisionFactors || [],
    concerns: personaPayload.concerns || [],
    context: personaPayload.context || "",
    price_sensitivity: personaPayload.priceSensitivity || "Moderate",
    decision_speed: personaPayload.decisionSpeed || "Deliberate",
    brand_loyalty: Number(personaPayload.brandLoyalty) || 0,
    is_built_in: false,
  };

  if (existingId && isUuid(existingId)) {
    const { data, error } = await supabase
      .from("personas")
      .update(rowPayload)
      .eq("id", existingId)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (!error && data) return mapPersonaRow(data);
  }

  const { data, error } = await supabase
    .from("personas")
    .insert(rowPayload)
    .select("*")
    .single();

  if (error || !data) return null;
  return mapPersonaRow(data);
}

export async function deletePersonaInSupabase(userId, workspaceId, personaId) {
  if (!userId) return false;
  const safeWsId = await resolveSupabaseWorkspaceId(userId, workspaceId);
  if (String(personaId).startsWith("persona-") && !String(personaId).startsWith("persona-custom-")) {
    if (!safeWsId) return true;
    // Built-in persona: record in workspace deleted_builtin_persona_ids
    const { data: ws } = await supabase
      .from("workspaces")
      .select("deleted_builtin_persona_ids")
      .eq("id", safeWsId)
      .eq("user_id", userId)
      .maybeSingle();

    if (ws) {
      const existing = Array.isArray(ws.deleted_builtin_persona_ids)
        ? ws.deleted_builtin_persona_ids
        : [];
      if (!existing.includes(personaId)) {
        await supabase
          .from("workspaces")
          .update({ deleted_builtin_persona_ids: [...existing, personaId] })
          .eq("id", safeWsId)
          .eq("user_id", userId);
      }
    }
    return true;
  }

  if (!isUuid(personaId)) return true;
  const { error } = await supabase
    .from("personas")
    .delete()
    .eq("id", personaId)
    .eq("user_id", userId);
  return !error;
}

export async function restoreBuiltInPersonasInSupabase(userId, workspaceId) {
  if (!userId) return false;
  const safeWsId = await resolveSupabaseWorkspaceId(userId, workspaceId);
  if (!safeWsId) return false;
  const { error } = await supabase
    .from("workspaces")
    .update({ deleted_builtin_persona_ids: [] })
    .eq("id", safeWsId)
    .eq("user_id", userId);
  return !error;
}

export async function saveSimulationToSupabase(userId, workspaceId, sim) {
  if (!userId) return null;
  const safeWsId = await resolveSupabaseWorkspaceId(userId, workspaceId);
  const typeSpecificPayload = {
    ...(sim.typeSpecificData || {}),
    ...(sim.forecastConfig ? { _forecastConfig: sim.forecastConfig } : {}),
  };

  const rowPayload = {
    user_id: userId,
    workspace_id: safeWsId,
    name: sim.name,
    type: sim.type,
    description: sim.description || "",
    hypothesis: sim.hypothesis || "",
    research_context: sim.researchContext || "",
    target_audience: sim.targetAudience || "",
    research_objectives: sim.researchObjectives || "",
    type_specific_data: typeSpecificPayload,
    materials: sim.materials || [],
    questions: sim.questions || [],
    selected_personas: sim.selectedPersonas || [],
    status: sim.status || "Active",
    stage: sim.stage || "Queued",
    progress: typeof sim.progress === "number" ? sim.progress : 0,
    started_at: sim.startedAt || new Date().toISOString(),
    completed_at: sim.completedAt || null,
    estimated_seconds_remaining: sim.estimatedSecondsRemaining ?? null,
    is_sample: false,
    results: sim.results || null,
  };

  if (isUuid(sim.id)) {
    const { data, error } = await supabase
      .from("simulations")
      .upsert({ id: sim.id, ...rowPayload })
      .select("*")
      .single();
    if (!error && data) return mapSimulationRow(data);
  } else {
    const { data, error } = await supabase
      .from("simulations")
      .insert(rowPayload)
      .select("*")
      .single();
    if (!error && data) return mapSimulationRow(data);
  }
  return null;
}

export async function deleteSimulationInSupabase(userId, simulationId) {
  if (!isUuid(simulationId)) return true;
  const { error } = await supabase
    .from("simulations")
    .delete()
    .eq("id", simulationId)
    .eq("user_id", userId);
  return !error;
}

export async function saveReportToSupabase(userId, workspaceId, report) {
  if (!userId) return null;
  const safeWsId = await resolveSupabaseWorkspaceId(userId, workspaceId);
  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: userId,
      workspace_id: safeWsId,
      simulation_id: report.simulationId,
      simulation_name: report.simulationName,
      title: report.title,
      format: report.format || "PDF",
      size_label: report.sizeLabel || "32 KB",
      summary_snippet: report.summarySnippet || "",
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapReportRow(data);
}

export async function deleteReportInSupabase(userId, reportId) {
  if (!isUuid(reportId)) return true;
  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId)
    .eq("user_id", userId);
  return !error;
}

export async function logRecentSearchToSupabase(userId, workspaceId, item) {
  if (!userId) return null;
  const safeWsId = await resolveSupabaseWorkspaceId(userId, workspaceId);
  const { data, error } = await supabase
    .from("recent_searches")
    .insert({
      user_id: userId,
      workspace_id: safeWsId,
      query: item.query,
      category: item.category || "Simulation",
      target_id: item.targetId || null,
      timestamp: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return mapRecentSearchRow(data);
}

export async function deleteRecentSearchInSupabase(userId, searchId) {
  const { error } = await supabase
    .from("recent_searches")
    .delete()
    .eq("id", searchId)
    .eq("user_id", userId);
  return !error;
}

export async function clearRecentSearchesInSupabase(userId, workspaceId) {
  const { error } = await supabase
    .from("recent_searches")
    .delete()
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId);
  return !error;
}

export async function updateProfileInSupabase(userId, { name, email, plan }) {
  const updates = {};
  if (name) {
    const normalizedName = normalizeConsistentUserName(name, email);
    updates.name = normalizedName;
    await supabase.auth
      .updateUser({ data: { full_name: normalizedName } })
      .catch(() => null);
  }
  if (email) updates.email = String(email).trim();
  if (plan) updates.plan = plan;

  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) return null;
  return data;
}

export async function toggleFavoritePersonaInSupabase(userId, workspaceId, personaId) {
  if (!userId) return false;
  const safeWsId = await resolveSupabaseWorkspaceId(userId, workspaceId);
  if (!safeWsId) return false;
  const { data: ws } = await supabase
    .from("workspaces")
    .select("favorite_persona_ids")
    .eq("id", safeWsId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!ws) return false;
  const list = Array.isArray(ws.favorite_persona_ids) ? ws.favorite_persona_ids : [];
  const nextList = list.includes(personaId)
    ? list.filter((id) => id !== personaId)
    : [...list, personaId];

  const { error } = await supabase
    .from("workspaces")
    .update({ favorite_persona_ids: nextList })
    .eq("id", safeWsId)
    .eq("user_id", userId);

  return !error;
}

export async function saveConversationToSupabase(userId, workspaceId, conv) {
  if (!userId) return null;
  const safeWsId = await resolveSupabaseWorkspaceId(userId, workspaceId);
  const convIsUuid = isUuid(conv.id);
  const simUuid = isUuid(conv.simulationId) ? conv.simulationId : null;

  const rowPayload = {
    user_id: userId,
    workspace_id: safeWsId,
    simulation_id: simUuid,
    persona_id: conv.personaId || null,
    title: conv.title || "Research Conversation",
    messages: Array.isArray(conv.messages) ? conv.messages : [],
  };

  if (convIsUuid) {
    const { data, error } = await supabase
      .from("agent_conversations")
      .upsert({ id: conv.id, ...rowPayload })
      .select("*")
      .single();
    if (!error && data) return mapConversationRow(data);
  } else {
    const { data, error } = await supabase
      .from("agent_conversations")
      .insert(rowPayload)
      .select("*")
      .single();
    if (!error && data) return mapConversationRow(data);
  }
  return null;
}

export async function deleteConversationInSupabase(userId, conversationId) {
  const { error } = await supabase
    .from("agent_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId);
  return !error;
}

export async function clearAllConversationsInSupabase(userId, workspaceId) {
  const { error } = await supabase
    .from("agent_conversations")
    .delete()
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId);
  return !error;
}

export async function clearAllAccountDataInSupabase(userId) {
  if (!userId) return { ok: false, workspaceId: null };

  // Delete all user-owned stored data across tables (respecting foreign keys)
  await Promise.allSettled([
    supabase.from("reports").delete().eq("user_id", userId),
    supabase.from("recent_searches").delete().eq("user_id", userId),
    supabase.from("agent_conversations").delete().eq("user_id", userId),
  ]);

  await Promise.allSettled([
    supabase.from("simulations").delete().eq("user_id", userId),
    supabase.from("personas").delete().eq("user_id", userId),
  ]);

  // Reset user's workspaces back to a single clean empty workspace
  let primaryWorkspaceId = null;
  const { data: wsRows } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (Array.isArray(wsRows) && wsRows.length > 0) {
    const primary = wsRows[0];
    primaryWorkspaceId = primary.id;
    const extraIds = wsRows.slice(1).map((w) => w.id);
    if (extraIds.length > 0) {
      await supabase
        .from("workspaces")
        .delete()
        .eq("user_id", userId)
        .in("id", extraIds);
    }
    await supabase
      .from("workspaces")
      .update({
        name: "Clemir Workspace",
        favorite_persona_ids: [],
        deleted_builtin_persona_ids: [],
      })
      .eq("id", primary.id)
      .eq("user_id", userId);
  }

  return { ok: true, workspaceId: primaryWorkspaceId };
}


