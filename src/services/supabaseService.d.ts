import { Session, AuthError, User } from '@supabase/supabase-js';
import {
  AgentConversation,
  Persona,
  RecentSearchItem,
  ReportArtifact,
  Simulation,
  UserProfile,
  Workspace,
} from '../types/clamir.ts';

export declare function signUpWithSupabase(params: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }>;

export declare function signInWithSupabase(params: {
  email: string;
  password: string;
}): Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }>;

export declare function signOutFromSupabase(): Promise<{ error: AuthError | null }>;

export declare function getSupabaseSession(): Promise<{
  session: Session | null;
  error: AuthError | null;
}>;

export declare function subscribeToAuthChanges(
  callback: (event: string, session: Session | null) => void
): { data: { subscription: { unsubscribe: () => void } } };

export declare function loadUserWorkspaceFromSupabase(
  sessionUser: User,
  requestedWorkspaceId?: string
): Promise<{
  user: UserProfile;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  simulations: Simulation[];
  personas: Persona[];
  conversations: AgentConversation[];
  reports: ReportArtifact[];
  recentSearches: RecentSearchItem[];
} | null>;

export declare function createWorkspaceInSupabase(
  userId: string,
  name: string
): Promise<Workspace | null>;

export declare function renameWorkspaceInSupabase(
  userId: string,
  workspaceId: string,
  name: string
): Promise<Workspace | null>;

export declare function savePersonaToSupabase(
  userId: string,
  workspaceId: string,
  personaPayload: Partial<Persona>,
  existingId?: string | null
): Promise<Persona | null>;

export declare function deletePersonaInSupabase(
  userId: string,
  workspaceId: string,
  personaId: string
): Promise<boolean>;

export declare function saveSimulationToSupabase(
  userId: string,
  workspaceId: string,
  sim: Simulation
): Promise<Simulation | null>;

export declare function deleteSimulationInSupabase(
  userId: string,
  simulationId: string
): Promise<boolean>;

export declare function saveReportToSupabase(
  userId: string,
  workspaceId: string,
  report: Partial<ReportArtifact>
): Promise<ReportArtifact | null>;

export declare function deleteReportInSupabase(
  userId: string,
  reportId: string
): Promise<boolean>;

export declare function logRecentSearchToSupabase(
  userId: string,
  workspaceId: string,
  item: { query: string; category?: string; targetId?: string }
): Promise<RecentSearchItem | null>;

export declare function deleteRecentSearchInSupabase(
  userId: string,
  searchId: string
): Promise<boolean>;

export declare function clearRecentSearchesInSupabase(
  userId: string,
  workspaceId: string
): Promise<boolean>;

export declare function updateProfileInSupabase(
  userId: string,
  params: { name?: string; email?: string; plan?: string }
): Promise<any>;
