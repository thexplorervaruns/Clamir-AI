import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import * as dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  callOpenRouterChat,
  cleanNaturalAssistantText,
  generateSmartAssistantResponse,
  handleAiGenerateRequest,
} from './api/ai/generate.js';
import {
  performRealTimeWebResearch,
  scrapeUrlWithFirecrawl,
  handleResearchSearchRequest,
} from './api/research/search.js';
import {
  executeEvidenceBasedSimulation,
  handleSimulationRunRequest,
} from './api/simulation/run.js';
import {
  executeEmbeddedTimesFMForecast,
  handleForecastRunRequest,
} from './api/forecast/run.js';
import {
  AgentConversation,
  AgentSourceCitation,
  ForecastFrequency,
  Persona,
  PlatformConfig,
  RecentSearchItem,
  ReportArtifact,
  Simulation,
  SimulationResults,
  TimesFMForecastResult,
  UserProfile,
  Workspace,
} from './src/types/clamir.ts';
import {
  BUILT_IN_PERSONAS,
  INITIAL_PLATFORM_CONFIG,
} from './src/data/seedData.ts';

dotenv.config();

const PORT = 3000;
const OWNER_EMAIL = 'thexplorervaruns@gmail.com';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'clamir-db.json');

// ---------------------------------------------------------------------------
// 1. Minimal Pure-Node PNG Generator for Compliant PWA Icons (192, 512, 180)
// ---------------------------------------------------------------------------
function createClamirPngIcon(size: number, paddedMaskable = false): Buffer {
  const width = size;
  const height = size;
  // Raw scanlines: each row starts with filter byte 0, followed by RGBA pixels
  const raw = Buffer.alloc(height * (1 + width * 4), 255);

  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // Filter type 0 (None)
  }

  const setPixel = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * (1 + width * 4) + 1 + x * 4;
    raw[idx] = r;
    raw[idx + 1] = g;
    raw[idx + 2] = b;
    raw[idx + 3] = 255;
  };

  // Coordinate transform from 120x120 viewBox
  const marginRatio = paddedMaskable ? 0.16 : 0.08;
  const drawArea = size * (1 - marginRatio * 2);
  const offset = size * marginRatio;

  const drawComet = (headX: number, headY: number, radius: number, tailX: number, tailY: number) => {
    const hx = offset + (headX / 120) * drawArea;
    const hy = offset + (headY / 120) * drawArea;
    const r = (radius / 120) * drawArea;
    const tx = offset + (tailX / 120) * drawArea;
    const ty = offset + (tailY / 120) * drawArea;

    // Draw circular head and tapered trail along segment (hx,hy) -> (tx,ty)
    const steps = Math.ceil(Math.hypot(tx - hx, ty - hy) * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / Math.max(1, steps);
      const cx = hx + (tx - hx) * t;
      const cy = hy + (ty - hy) * t;
      const cr = r * (1 - t * 0.92);
      const minX = Math.floor(cx - cr);
      const maxX = Math.ceil(cx + cr);
      const minY = Math.floor(cy - cr);
      const maxY = Math.ceil(cy + cr);
      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          if ((px - cx) * (px - cx) + (py - cy) * (py - cy) <= cr * cr) {
            setPixel(px, py, 0, 0, 0);
          }
        }
      }
    }
  };

  const drawStar = (cx120: number, cy120: number, arm120: number) => {
    const cx = offset + (cx120 / 120) * drawArea;
    const cy = offset + (cy120 / 120) * drawArea;
    const arm = (arm120 / 120) * drawArea;
    const minX = Math.floor(cx - arm);
    const maxX = Math.ceil(cx + arm);
    const minY = Math.floor(cy - arm);
    const maxY = Math.ceil(cy + arm);
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = Math.abs(px - cx) / arm;
        const dy = Math.abs(py - cy) / arm;
        if (Math.sqrt(dx) + Math.sqrt(dy) <= 1.0) {
          setPixel(px, py, 0, 0, 0);
        }
      }
    }
  };

  // Three comets + small stars matching Clemir AI logo reference
  drawComet(38, 82, 12.5, 100, 16);
  drawComet(65, 94, 9.5, 110, 42);
  drawComet(24, 52, 8.5, 74, 8);
  drawStar(52, 32, 9);
  drawStar(89, 73.5, 6.5);
  drawStar(19, 24.5, 5.5);

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }

  const crc32 = (buf: Buffer): number => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  };

  const makeChunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  };

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idatData = zlib.deflateSync(raw);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function ensurePwaIcons() {
  const pubDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(pubDir)) {
    fs.mkdirSync(pubDir, { recursive: true });
  }
  const targets: { name: string; size: number; maskable: boolean }[] = [
    { name: 'pwa-192x192.png', size: 192, maskable: false },
    { name: 'pwa-512x512.png', size: 512, maskable: false },
    { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
  ];
  for (const t of targets) {
    const filePath = path.join(pubDir, t.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, createClamirPngIcon(t.size, t.maskable));
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Password Hashing & Database Persistence Layer
// ---------------------------------------------------------------------------
interface StoredUser extends UserProfile {
  passwordHash: string;
  passwordSalt: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  sessions: { token: string; userId: string; createdAt: string }[];
  workspaces: Workspace[];
  customPersonas: Persona[];
  favoritePersonaIdsByWorkspace: Record<string, string[]>;
  deletedBuiltInPersonaIdsByWorkspace?: Record<string, string[]>;
  simulations: Simulation[];
  conversations: AgentConversation[];
  reports: ReportArtifact[];
  recentSearches: RecentSearchItem[];
  platformConfig: PlatformConfig;
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash: derived, salt: actualSalt };
}

function normalizeServerUserName(
  rawName?: string | null,
  email?: string | null,
  existingValidName?: string | null
): string {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const isInvalid = (val?: string | null) => {
    const t = String(val || '').trim();
    const l = t.toLowerCase();
    return (
      !t ||
      l === 'tank' ||
      l.startsWith('tank ') ||
      l === 'varun (workspace owner)' ||
      l === 'clamir user' ||
      l === 'clamir explorer' ||
      l === 'clemir user' ||
      l === 'clemir explorer'
    );
  };

  if (!isInvalid(rawName)) {
    return String(rawName).trim();
  }
  if (!isInvalid(existingValidName)) {
    return String(existingValidName).trim();
  }
  if (cleanEmail === OWNER_EMAIL.toLowerCase()) {
    return 'Varuna';
  }
  if (cleanEmail === 'mailattvaruns@gmail.com') {
    return 'Varun S';
  }
  if (cleanEmail && cleanEmail.includes('@')) {
    const prefix = cleanEmail.split('@')[0];
    if (prefix && prefix.toLowerCase() !== 'tank') {
      return prefix;
    }
  }
  return 'Varuna';
}

function loadDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      if (!parsed.deletedBuiltInPersonaIdsByWorkspace) {
        parsed.deletedBuiltInPersonaIdsByWorkspace = {};
      }
      // Ensure Explorer plan always includes Accounts & Reports access
      parsed.platformConfig = INITIAL_PLATFORM_CONFIG;
      parsed.users = parsed.users.map((u) => ({
        ...u,
        name: normalizeServerUserName(u.name, u.email),
      }));
      parsed.workspaces = (parsed.workspaces || [])
        .filter((w) => w.id !== 'ws-growth-experiments')
        .map((w) =>
          w.id === 'ws-default' ||
          w.name === 'Clamir Workspace' ||
          w.name === 'Clamir Research Lab' ||
          w.name === "Varun's Workspace" ||
          w.name === 'VUser Workspace' ||
          w.name === "VUser's Workspace"
            ? { ...w, name: 'Clemir Workspace' }
            : w
        );

      if (Array.isArray(parsed.conversations)) {
        parsed.conversations = parsed.conversations
          .filter((c) => c && c.id && !c.id.startsWith('conv-seed-'))
          .map((c) => ({
            ...c,
            messages: (c.messages || []).map((m) => ({
              ...m,
              content: cleanNaturalAssistantText(
                (m.content || '').replace(/Clamir Studio Pro/g, 'Clemir Studio Pro')
              ),
            })),
          }));
      } else {
        parsed.conversations = [];
      }

      if (Array.isArray(parsed.reports)) {
        parsed.reports = parsed.reports
          .filter((r) => r && r.id && !r.id.startsWith('rep-seed-'))
          .map((r) => ({
            ...r,
            title: (r.title || '').replace(/Clamir/g, 'Clemir'),
            simulationName: (r.simulationName || '').replace(/Clamir/g, 'Clemir'),
          }));
      } else {
        parsed.reports = [];
      }

      if (Array.isArray(parsed.simulations)) {
        parsed.simulations = parsed.simulations
          .filter(
            (s) =>
              s &&
              s.id &&
              !s.id.startsWith('sim-sample-') &&
              !(s as Simulation & { isSample?: boolean }).isSample
          )
          .map((s) => {
            const { isSample: _removedSampleFlag, ...rest } = s as Simulation & {
              isSample?: boolean;
            };
            return {
              ...rest,
              name: (rest.name || '').replace(/Clamir Studio Pro/g, 'Clemir Studio Pro'),
              results: rest.results
                ? {
                    ...rest.results,
                    simulationNotice: (rest.results.simulationNotice || '').replace(
                      /Clamir Engine/g,
                      'Clemir Engine'
                    ),
                    personaBreakdown: (rest.results.personaBreakdown || []).map((pb) => ({
                      ...pb,
                      simulatedStatement: cleanNaturalAssistantText(pb.simulatedStatement || ''),
                    })),
                  }
                : undefined,
            };
          });
      } else {
        parsed.simulations = [];
      }

      if (Array.isArray(parsed.recentSearches)) {
        parsed.recentSearches = parsed.recentSearches.filter(
          (rs) =>
            rs &&
            rs.id &&
            !rs.id.startsWith('rs-seed-') &&
            rs.query !== 'Temp Verification Sim'
        );
      } else {
        parsed.recentSearches = [];
      }

      saveDatabase(parsed);
      return parsed;
    } catch {
      // Fall through to initialize clean DB
    }
  }

  const ownerPw = hashPassword('clamir-owner-2026');
  const ownerUser: StoredUser = {
    id: 'user-owner-1',
    name: 'Varuna',
    email: OWNER_EMAIL,
    plan: 'Explorer',
    isOwner: true,
    createdAt: '2026-11-10T09:00:00Z',
    passwordHash: ownerPw.hash,
    passwordSalt: ownerPw.salt,
  };

  const defaultWorkspace: Workspace = {
    id: 'ws-default',
    name: 'Clemir Workspace',
    ownerId: ownerUser.id,
    createdAt: '2026-11-10T09:00:00Z',
    role: 'Owner',
  };

  const cleanDb: DatabaseSchema = {
    users: [ownerUser],
    sessions: [],
    workspaces: [defaultWorkspace],
    customPersonas: [],
    favoritePersonaIdsByWorkspace: {},
    deletedBuiltInPersonaIdsByWorkspace: {},
    simulations: [],
    conversations: [],
    reports: [],
    recentSearches: [],
    platformConfig: INITIAL_PLATFORM_CONFIG,
  };

  saveDatabase(cleanDb);
  return cleanDb;
}

function saveDatabase(db: DatabaseSchema) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

const db = loadDatabase();

// ---------------------------------------------------------------------------
// 3. Helper: Persona Lookup by Workspace
// ---------------------------------------------------------------------------
function getAllPersonasForWorkspace(workspaceId: string): Persona[] {
  const favIds = db.favoritePersonaIdsByWorkspace[workspaceId] || [];
  const deletedBuiltInIds = db.deletedBuiltInPersonaIdsByWorkspace?.[workspaceId] || [];
  const activeBuiltIns = BUILT_IN_PERSONAS.filter((p) => !deletedBuiltInIds.includes(p.id));
  const custom = db.customPersonas.filter((p) => p.workspaceId === workspaceId);
  const combined = [...activeBuiltIns, ...custom];
  return combined.map((p) => ({
    ...p,
    isFavorite: favIds.includes(p.id),
  }));
}

function dedupeRecentSearchList(items: RecentSearchItem[]): RecentSearchItem[] {
  const seenKeys = new Set<string>();
  const out: RecentSearchItem[] = [];
  for (const item of items) {
    if (!item || !item.query) continue;
    const cat = String(item.category || 'Simulation').trim().toLowerCase();
    const targetKey = item.targetId ? `id:${cat}:${item.targetId}` : '';
    const queryKey = `q:${cat}:${String(item.query).trim().toLowerCase()}`;
    if ((targetKey && seenKeys.has(targetKey)) || seenKeys.has(queryKey)) {
      continue;
    }
    if (targetKey) seenKeys.add(targetKey);
    seenKeys.add(queryKey);
    out.push(item);
  }
  return out;
}

function upsertRecentSearchRecord(params: {
  workspaceId: string;
  query: string;
  category?: RecentSearchItem['category'];
  targetId?: string;
}): RecentSearchItem {
  const cleanQuery = String(params.query || '').trim().slice(0, 80);
  const category = params.category || 'Simulation';
  const targetId = params.targetId ? String(params.targetId).trim() : undefined;
  const now = new Date().toISOString();

  const normQuery = cleanQuery.toLowerCase();
  const normCat = String(category).toLowerCase();
  const existingIdx = db.recentSearches.findIndex((r) => {
    if (r.workspaceId !== params.workspaceId) return false;
    const sameCategory = String(r.category || '').toLowerCase() === normCat;
    if (targetId && r.targetId === targetId && sameCategory) return true;
    return sameCategory && String(r.query || '').trim().toLowerCase() === normQuery;
  });

  if (existingIdx !== -1) {
    const existing = {
      ...db.recentSearches[existingIdx],
      query: cleanQuery || db.recentSearches[existingIdx].query,
      targetId: targetId || db.recentSearches[existingIdx].targetId,
      timestamp: now,
    };
    db.recentSearches.splice(existingIdx, 1);
    db.recentSearches.unshift(existing);
    db.recentSearches = dedupeRecentSearchList(db.recentSearches).slice(0, 30);
    return existing;
  }

  const created: RecentSearchItem = {
    id: `rs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    workspaceId: params.workspaceId,
    query: cleanQuery,
    category,
    targetId,
    timestamp: now,
  };
  db.recentSearches.unshift(created);
  db.recentSearches = dedupeRecentSearchList(db.recentSearches).slice(0, 30);
  return created;
}

// ---------------------------------------------------------------------------
// 4. Real-Time Web Research & OpenRouter Simulation Processing Pipeline
// ---------------------------------------------------------------------------
const activeJobTimers = new Map<string, NodeJS.Timeout>();

const STAGE_PROGRESS_MAP: Record<string, { progress: number; estSec: number }> = {
  'Preparing simulation': { progress: 15, estSec: 12 },
  'Searching the web': { progress: 38, estSec: 9 },
  'Analyzing sources': { progress: 60, estSec: 6 },
  'Verifying information': { progress: 76, estSec: 4 },
  'Generating results': { progress: 90, estSec: 2 },
  Completed: { progress: 100, estSec: 0 },
};

async function synthesizeSimulationResults(
  sim: Simulation,
  onStageChange?: (stage: string) => void
): Promise<SimulationResults> {
  const allPersonas = getAllPersonasForWorkspace(sim.workspaceId);
  const { results } = await executeEvidenceBasedSimulation({
    simulation: sim,
    personas: allPersonas,
    enableWebSearch: sim.webSearchEnabled !== false,
    onStageChange,
  });
  return results as SimulationResults;
}

function startBackgroundSimulationJob(simId: string) {
  const initialTimer = setTimeout(async () => {
    const sim = db.simulations.find((s) => s.id === simId);
    if (!sim || sim.status !== 'Active') {
      activeJobTimers.delete(simId);
      return;
    }

    try {
      const results = await synthesizeSimulationResults(sim, (stageName: string) => {
        const currentSim = db.simulations.find((s) => s.id === simId);
        if (!currentSim || currentSim.status !== 'Active') return;
        const meta = STAGE_PROGRESS_MAP[stageName] || { progress: 50, estSec: 5 };
        currentSim.stage = stageName as Simulation['stage'];
        currentSim.progress = meta.progress;
        currentSim.estimatedSecondsRemaining = meta.estSec;
        saveDatabase(db);
      });

      const finalSim = db.simulations.find((s) => s.id === simId);
      if (!finalSim || finalSim.status !== 'Active') return;

      finalSim.results = results;
      finalSim.stage = 'Completed';
      finalSim.status = 'Completed';
      finalSim.progress = 100;
      finalSim.estimatedSecondsRemaining = 0;
      finalSim.completedAt = new Date().toISOString();
      saveDatabase(db);
    } catch (err) {
      console.error('Simulation job failed:', err);
      const failedSim = db.simulations.find((s) => s.id === simId);
      if (failedSim) {
        failedSim.stage = 'Failed';
        failedSim.status = 'Failed';
        saveDatabase(db);
      }
    } finally {
      activeJobTimers.delete(simId);
    }
  }, 250);

  activeJobTimers.set(simId, initialTimer);
}

// Helper to ensure a Supabase user exists in local workspace state for hybrid routes
function ensureUserAndWorkspaceForSupabase(params: {
  userId: string;
  email: string;
  name?: string;
  token?: string;
}): { user: StoredUser; workspaces: Workspace[] } {
  const cleanEmail = String(params.email || '').trim().toLowerCase();
  let user = db.users.find(
    (u) => u.id === params.userId || (cleanEmail && u.email.toLowerCase() === cleanEmail)
  );

  if (!user) {
    const { hash, salt } = hashPassword(crypto.randomBytes(16).toString('hex'));
    user = {
      id: params.userId || `user-${Date.now()}`,
      name: normalizeServerUserName(params.name, cleanEmail),
      email: cleanEmail || 'user@clemir.ai',
      plan: 'Explorer',
      isOwner: cleanEmail === OWNER_EMAIL.toLowerCase(),
      createdAt: new Date().toISOString(),
      passwordHash: hash,
      passwordSalt: salt,
    };
    db.users.push(user);

    const newWs: Workspace = {
      id: `ws-${Date.now()}`,
      name: 'Clemir Workspace',
      ownerId: user.id,
      createdAt: new Date().toISOString(),
      role: 'Owner',
    };
    db.workspaces.push(newWs);
    saveDatabase(db);
  } else {
    const resolvedName = normalizeServerUserName(user.name, user.email || cleanEmail, params.name);
    if (user.name !== resolvedName) {
      user.name = resolvedName;
      saveDatabase(db);
    }
  }

  if (params.token && !db.sessions.some((s) => s.token === params.token)) {
    db.sessions.push({
      token: params.token,
      userId: user.id,
      createdAt: new Date().toISOString(),
    });
    saveDatabase(db);
  }

  let userWorkspaces = db.workspaces.filter((w) => w.ownerId === user!.id);
  if (userWorkspaces.length === 0) {
    const fallbackWs: Workspace = {
      id: `ws-${Date.now()}`,
      name: 'Clemir Workspace',
      ownerId: user.id,
      createdAt: new Date().toISOString(),
      role: 'Owner',
    };
    db.workspaces.push(fallbackWs);
    saveDatabase(db);
    userWorkspaces = [fallbackWs];
  }

  return { user, workspaces: userWorkspaces };
}

function tryDecodeJwtPayload(token: string): Record<string, any> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 5. Express Server & Routes
// ---------------------------------------------------------------------------
async function startServer() {
  ensurePwaIcons();

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Authentication Middleware (Supports both Session Tokens and Supabase JWTs)
  interface AuthedRequest extends Request {
    user?: StoredUser;
  }

  const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const session = db.sessions.find((s) => s.token === token);
    if (session) {
      const user = db.users.find((u) => u.id === session.userId);
      if (user) {
        req.user = user;
        next();
        return;
      }
    }

    // Check if Bearer token is a valid Supabase JWT access token
    const jwtPayload = tryDecodeJwtPayload(token);
    if (jwtPayload && jwtPayload.sub) {
      const { user } = ensureUserAndWorkspaceForSupabase({
        userId: String(jwtPayload.sub),
        email: String(jwtPayload.email || ''),
        name: String(jwtPayload.user_metadata?.full_name || jwtPayload.user_metadata?.name || ''),
        token,
      });
      req.user = user;
      next();
      return;
    }

    res.status(401).json({ error: 'Invalid or expired session token.' });
  };

  const sanitizeUser = (u: StoredUser): UserProfile => ({
    id: u.id,
    name: normalizeServerUserName(u.name, u.email),
    email: u.email,
    plan: u.plan,
    isOwner: u.email.toLowerCase() === OWNER_EMAIL.toLowerCase() || u.isOwner,
    createdAt: u.createdAt,
  });

  // Dedicated Modular AI, Web Research, Simulation, and Forecasting Endpoints
  app.post('/api/ai/generate', handleAiGenerateRequest);
  app.post('/api/research/search', handleResearchSearchRequest);
  app.post('/api/simulation/run', handleSimulationRunRequest);
  app.post('/api/forecast/run', handleForecastRunRequest);

  // Register/Sync Supabase Auth Session with Backend
  app.post('/api/auth/supabase-session', (req, res) => {
    const header = req.headers.authorization || '';
    const bearerToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const { userId, email, name } = req.body || {};

    if (!userId && !email && !bearerToken) {
      res.status(400).json({ error: 'Supabase user details or token required.' });
      return;
    }

    const tokenToRegister = bearerToken || crypto.randomBytes(24).toString('hex');
    const { user, workspaces } = ensureUserAndWorkspaceForSupabase({
      userId: String(userId || ''),
      email: String(email || ''),
      name: String(name || ''),
      token: tokenToRegister,
    });

    res.json({
      token: tokenToRegister,
      user: sanitizeUser(user),
      workspaces,
    });
  });

  // Public Endpoints
  app.get('/api/public/config', (_req, res) => {
    res.json({ config: db.platformConfig });
  });

  app.post('/api/public/interactive-demo', async (req, res) => {
    const {
      question,
      personaId,
      customAudienceName,
      customAudienceDescription,
      customPriceSensitivity,
      customDecisionSpeed,
    } = req.body || {};
    const qText = String(question || '').trim().slice(0, 500);

    const isCustom = Boolean(customAudienceName && String(customAudienceName).trim());
    const persona = isCustom
      ? {
          id: 'custom-demo-persona',
          name: String(customAudienceName).trim(),
          tagline:
            String(customAudienceDescription || '').trim() ||
            `Custom target audience evaluating product and market fit.`,
          priceSensitivity: (customPriceSensitivity || 'Moderate') as Persona['priceSensitivity'],
          decisionSpeed: (customDecisionSpeed || 'Deliberate') as Persona['decisionSpeed'],
          brandLoyalty: 65,
          decisionFactors: ['Direct relevance to audience needs', 'Clear value proposition'],
          concerns: ['Unclear onboarding or hidden complexity'],
          preferences: ['Tailored workflow and transparent pricing'],
        }
      : BUILT_IN_PERSONAS.find((p) => p.id === personaId) || BUILT_IN_PERSONAS[1];

    if (!qText) {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }

    try {
      const aiRes = await callOpenRouterChat({
        model: 'google/gemini-2.5-flash',
        temperature: 0.25,
        responseFormatJson: true,
        messages: [
          {
            role: 'user',
            content: `Simulate how the customer audience "${persona.name}" (${persona.tagline}; Price Sensitivity: ${persona.priceSensitivity}; Decision Speed: ${persona.decisionSpeed}; Brand Loyalty: ${persona.brandLoyalty}/100) responds to this business question: "${qText}".
Return ONLY a valid JSON object with keys: "reaction" (string), "acceptanceScore" (number 0-100), "response" (string), "keyObjection" (string), "opportunity" (string).`,
          },
        ],
      });

      const cleaned = aiRes.content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      res.json({
        personaName: persona.name,
        reaction: cleanNaturalAssistantText(parsed.reaction || 'Analytical Interest'),
        acceptanceScore: parsed.acceptanceScore ?? 78,
        response: cleanNaturalAssistantText(parsed.response || ''),
        keyObjection: cleanNaturalAssistantText(parsed.keyObjection || ''),
        opportunity: cleanNaturalAssistantText(parsed.opportunity || ''),
        engineMode: 'Clemir AI Assistant',
      });
      return;
    } catch (err) {
      res.status(502).json({
        error:
          err instanceof Error
            ? err.message
            : 'Unable to run live AI simulation right now. Please try again.',
      });
    }
  });

  // Authentication Endpoints
  app.post('/api/auth/signup', (req, res) => {
    const { name, email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(name || '').trim();
    const rawPw = String(password || '');

    if (!cleanName || !cleanEmail || rawPw.length < 6) {
      res.status(400).json({ error: 'Name, valid email, and password (6+ chars) are required.' });
      return;
    }

    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    const { hash, salt } = hashPassword(rawPw);
    const isOwner = cleanEmail === OWNER_EMAIL.toLowerCase();
    const newUser: StoredUser = {
      id: `user-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      plan: 'Explorer',
      isOwner,
      createdAt: new Date().toISOString(),
      passwordHash: hash,
      passwordSalt: salt,
    };

    const newWs: Workspace = {
      id: `ws-${Date.now()}`,
      name: 'Clemir Workspace',
      ownerId: newUser.id,
      createdAt: new Date().toISOString(),
      role: 'Owner',
    };

    const token = crypto.randomBytes(24).toString('hex');
    db.users.push(newUser);
    db.workspaces.push(newWs);
    db.sessions.push({ token, userId: newUser.id, createdAt: new Date().toISOString() });
    saveDatabase(db);

    res.json({
      token,
      user: sanitizeUser(newUser),
      workspaces: [newWs],
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const rawPw = String(password || '');

    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const { hash } = hashPassword(rawPw, user.passwordSalt);
    if (hash !== user.passwordHash) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
    saveDatabase(db);

    const userWorkspaces = db.workspaces.filter((w) => w.ownerId === user.id);
    res.json({
      token,
      user: sanitizeUser(user),
      workspaces: userWorkspaces.length > 0 ? userWorkspaces : [db.workspaces[0]],
    });
  });

  app.post('/api/auth/demo-login', (_req, res) => {
    const ownerUser = db.users[0];
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions.push({ token, userId: ownerUser.id, createdAt: new Date().toISOString() });
    saveDatabase(db);

    const userWorkspaces = db.workspaces.filter((w) => w.ownerId === ownerUser.id);
    res.json({
      token,
      user: sanitizeUser(ownerUser),
      workspaces: userWorkspaces,
    });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body || {};
    res.json({
      message: `If an account exists for ${email}, password recovery instructions have been recorded. You may also use Instant Workspace Access below.`,
    });
  });

  // Workspace Bootstrap Endpoint (Workspace Isolation Enforced)
  app.get('/api/workspace/bootstrap', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const userWorkspaces = db.workspaces.filter((w) => w.ownerId === user.id);
    const requestedWsId = String(req.query.workspaceId || '');
    const activeWs =
      userWorkspaces.find((w) => w.id === requestedWsId) ||
      userWorkspaces[0] ||
      db.workspaces[0];

    const wsId = activeWs.id;

    res.json({
      user: sanitizeUser(user),
      workspaces: userWorkspaces,
      activeWorkspaceId: wsId,
      simulations: db.simulations.filter((s) => s.workspaceId === wsId),
      personas: getAllPersonasForWorkspace(wsId),
      conversations: db.conversations.filter((c) => c.workspaceId === wsId),
      reports: db.reports.filter((r) => r.workspaceId === wsId),
      recentSearches: dedupeRecentSearchList(
        db.recentSearches.filter((rs) => rs.workspaceId === wsId)
      ),
      platformConfig: db.platformConfig,
    });
  });

  // Workspaces CRUD
  app.post('/api/workspaces', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const name = String(req.body?.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'Workspace name is required.' });
      return;
    }
    const newWs: Workspace = {
      id: `ws-${Date.now()}`,
      name,
      ownerId: user.id,
      createdAt: new Date().toISOString(),
      role: 'Owner',
    };
    db.workspaces.push(newWs);
    saveDatabase(db);
    res.json({
      workspace: newWs,
      workspaces: db.workspaces.filter((w) => w.ownerId === user.id),
    });
  });

  app.put('/api/workspaces/:id', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const ws = db.workspaces.find((w) => w.id === req.params.id && w.ownerId === user.id);
    if (!ws) {
      res.status(404).json({ error: 'Workspace not found.' });
      return;
    }
    const name = String(req.body?.name || '').trim();
    if (name) {
      ws.name = name;
      saveDatabase(db);
    }
    res.json({
      workspace: ws,
      workspaces: db.workspaces.filter((w) => w.ownerId === user.id),
    });
  });

  // Safe URL Extraction for Research Material (Protected against SSRF / Private IPs)
  app.post('/api/materials/extract-url', requireAuth, async (req: AuthedRequest, res) => {
    const rawUrl = String(req.body?.url || '').trim();
    try {
      const parsed = new URL(rawUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        res.status(400).json({ error: 'Only HTTP and HTTPS URLs are permitted.' });
        return;
      }
      const host = parsed.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '::1' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        host.startsWith('169.254.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
        host.endsWith('.internal') ||
        host.endsWith('.local')
      ) {
        res.status(403).json({
          error: 'Access to private network addresses or internal services is forbidden.',
        });
        return;
      }

      // First try Firecrawl URL extraction if configured
      try {
        const scraped = await scrapeUrlWithFirecrawl(parsed.toString());
        const scrapedText = scraped && scraped.ok ? scraped.extractedContent : '';
        if (scrapedText) {
          res.json({
            title: scraped.title || parsed.hostname,
            extractedContent: scrapedText.slice(0, 2400),
          });
          return;
        }
      } catch {
        // Fallback to standard HTTP extraction below
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(parsed.toString(), {
          signal: controller.signal,
          headers: { 'User-Agent': 'Clemir-Research-Extractor/1.0' },
        });
        clearTimeout(timeout);
        const html = await response.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const cleanText = html
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 1800);

        res.json({
          title: titleMatch ? titleMatch[1].trim() : parsed.hostname,
          extractedContent:
            cleanText || `Extracted reference metadata from ${parsed.toString()}`,
        });
      } catch {
        clearTimeout(timeout);
        res.json({
          title: parsed.hostname,
          extractedContent: `Public URL reference registered: ${parsed.toString()} (Host: ${parsed.hostname}, Path: ${parsed.pathname}).`,
        });
      }
    } catch {
      res.status(400).json({ error: 'Invalid URL format. Please include https://' });
    }
  });

  // Simulations CRUD & Job Control
  app.post('/api/simulations', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const userWorkspaces = db.workspaces.filter((w) => w.ownerId === user.id);
    const activeWs = userWorkspaces[0] || db.workspaces[0];
    const body = req.body || {};

    const newSim: Simulation = {
      id: crypto.randomUUID(),
      workspaceId: body.workspaceId || activeWs.id,
      name: String(body.name || 'Untitled Simulation').trim(),
      type: body.type || 'test_idea',
      description: String(body.description || '').trim(),
      hypothesis: String(body.hypothesis || '').trim(),
      researchContext: String(body.researchContext || '').trim(),
      targetAudience: String(body.targetAudience || '').trim(),
      researchObjectives: String(body.researchObjectives || '').trim(),
      typeSpecificData: body.typeSpecificData || {},
      materials: Array.isArray(body.materials) ? body.materials : [],
      questions: Array.isArray(body.questions) ? body.questions : [],
      selectedPersonas: Array.isArray(body.selectedPersonas) ? body.selectedPersonas : [],
      forecastConfig: body.forecastConfig || undefined,
      webSearchEnabled: body.webSearchEnabled !== false,
      status: 'Active',
      stage: 'Queued',
      progress: 8,
      startedAt: new Date().toISOString(),
      estimatedSecondsRemaining: 8,
    };

    db.simulations.unshift(newSim);
    upsertRecentSearchRecord({
      workspaceId: newSim.workspaceId,
      query: newSim.name,
      category: 'Simulation',
      targetId: newSim.id,
    });
    saveDatabase(db);

    startBackgroundSimulationJob(newSim.id);
    res.json({ simulation: newSim });
  });

  app.get('/api/simulations/:id', requireAuth, (req: AuthedRequest, res) => {
    const sim = db.simulations.find((s) => s.id === req.params.id);
    if (!sim) {
      res.status(404).json({ error: 'Simulation not found.' });
      return;
    }
    res.json({ simulation: sim });
  });

  app.post('/api/simulations/:id/stop', requireAuth, (req: AuthedRequest, res) => {
    const sim = db.simulations.find((s) => s.id === req.params.id);
    if (!sim) {
      res.status(404).json({ error: 'Simulation not found.' });
      return;
    }
    const timer = activeJobTimers.get(sim.id);
    if (timer) {
      clearTimeout(timer);
      activeJobTimers.delete(sim.id);
    }
    sim.status = 'Stopped';
    sim.stage = 'Stopped';
    sim.estimatedSecondsRemaining = 0;
    saveDatabase(db);
    res.json({ simulation: sim });
  });

  app.delete('/api/simulations/:id', requireAuth, (req: AuthedRequest, res) => {
    const idx = db.simulations.findIndex((s) => s.id === req.params.id);
    const timer = activeJobTimers.get(req.params.id);
    if (timer) {
      clearTimeout(timer);
      activeJobTimers.delete(req.params.id);
    }
    if (idx !== -1) {
      db.simulations.splice(idx, 1);
      saveDatabase(db);
    }
    res.json({ ok: true });
  });

  // Attach or re-run embedded TimesFM Forecast inside an existing simulation
  app.post('/api/simulations/:id/forecast', requireAuth, async (req: AuthedRequest, res) => {
    const sim = db.simulations.find((s) => s.id === req.params.id);
    if (!sim) {
      res.status(404).json({ error: 'Simulation not found.' });
      return;
    }

    try {
      const b = req.body || {};
      const existingCfg = sim.forecastConfig || {
        enabled: true,
        frequency: 'monthly' as const,
        horizon: 12,
        patchLength: 'auto',
        seasonalPeriod: 'auto',
      };

      const seriesName =
        String(b.seriesName ?? existingCfg.seriesName ?? `${sim.name} Core Metric`).trim() ||
        `${sim.name} Core Metric`;
      const unitLabel = String(b.unitLabel ?? existingCfg.unitLabel ?? '').trim();
      const rawFreq = String(b.frequency || existingCfg.frequency || 'monthly');
      const frequency: ForecastFrequency = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].includes(
        rawFreq
      )
        ? (rawFreq as ForecastFrequency)
        : 'monthly';
      const horizon = Math.max(2, Math.min(48, Number(b.horizon ?? existingCfg.horizon ?? 12)));
      const patchLength = b.patchLength ?? existingCfg.patchLength ?? 'auto';
      const seasonalPeriod = b.seasonalPeriod ?? existingCfg.seasonalPeriod ?? 'auto';
      const rawData = b.rawData !== undefined ? String(b.rawData) : existingCfg.rawData || '';
      const points = Array.isArray(b.points) ? b.points : existingCfg.points || [];

      const simSources = sim.results?.structuredSimulationReport?.sourcesAndReferences || [];
      const existingWebResearch =
        simSources.length > 0
          ? {
              queriesExecuted: sim.results?.structuredSimulationReport?.researchDiagnostics?.queriesExecuted || [],
              sources: simSources,
            }
          : null;

      const execRes = await executeEmbeddedTimesFMForecast({
        seriesName,
        unitLabel,
        frequency,
        horizon,
        patchLength,
        seasonalPeriod,
        domainContext: [sim.researchContext, sim.hypothesis, sim.targetAudience]
          .filter(Boolean)
          .join(' | '),
        rawData,
        points,
        enableWebSearch: b.enableWebSearch !== false,
        existingWebResearch: existingWebResearch as any,
      });

      if (!execRes.ok || !execRes.result) {
        res.status(400).json({
          ok: false,
          error: `Please provide at least 6 valid numeric historical observations (detected ${execRes.detectedCount}).`,
        });
        return;
      }

      sim.forecastConfig = {
        enabled: true,
        seriesName,
        unitLabel,
        frequency,
        horizon,
        patchLength,
        seasonalPeriod,
        rawData,
        points,
      };

      if (sim.results) {
        sim.results = {
          ...sim.results,
          timesfmForecast: execRes.result as unknown as TimesFMForecastResult,
        };
      }

      saveDatabase(db);
      res.json({ ok: true, simulation: sim });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Unable to execute embedded TimesFM forecast.',
      });
    }
  });

  // Personas & Custom Persona CRUD
  app.post('/api/personas', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const activeWs = db.workspaces.find((w) => w.ownerId === user.id) || db.workspaces[0];
    const b = req.body || {};
    const requestedWs =
      b.workspaceId && db.workspaces.some((w) => w.id === b.workspaceId)
        ? String(b.workspaceId)
        : activeWs.id;
    const targetId = String(b.id || `persona-custom-${Date.now()}`);

    const cleanName = String(b.name || 'Custom Persona').trim();
    const newPersona: Persona = {
      id: targetId,
      workspaceId: requestedWs,
      name: cleanName,
      tagline: String(b.tagline || '').trim(),
      description: String(b.description || '').trim(),
      avatarCode: String(b.avatarCode || cleanName.slice(0, 2) || 'CP').slice(0, 3).toUpperCase(),
      segment: String(b.segment || 'Custom Segment').trim(),
      tags: Array.isArray(b.tags) ? b.tags : [],
      characteristics: Array.isArray(b.characteristics) ? b.characteristics : [],
      preferences: Array.isArray(b.preferences) ? b.preferences : [],
      motivations: Array.isArray(b.motivations) ? b.motivations : [],
      purchasingBehavior: String(b.purchasingBehavior || '').trim(),
      decisionFactors: Array.isArray(b.decisionFactors) ? b.decisionFactors : [],
      concerns: Array.isArray(b.concerns) ? b.concerns : [],
      context: String(b.context || '').trim(),
      priceSensitivity: b.priceSensitivity || 'Moderate',
      decisionSpeed: b.decisionSpeed || 'Deliberate',
      brandLoyalty: b.brandLoyalty !== undefined && b.brandLoyalty !== '' ? Number(b.brandLoyalty) || 0 : 0,
      isBuiltIn: false,
      isFavorite: Boolean(b.isFavorite),
      createdAt: b.createdAt || new Date().toISOString(),
    };

    const existingIdx = db.customPersonas.findIndex((p) => p.id === newPersona.id);
    if (existingIdx !== -1) {
      db.customPersonas[existingIdx] = newPersona;
    } else {
      db.customPersonas.push(newPersona);
    }
    saveDatabase(db);
    res.json({ persona: newPersona });
  });

  app.put('/api/personas/:id', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const activeWs = db.workspaces.find((w) => w.ownerId === user.id) || db.workspaces[0];
    const b = req.body || {};
    let target = db.customPersonas.find((p) => p.id === req.params.id);

    // If user edits a built-in persona, save a customized copy or update custom
    if (!target) {
      const builtIn = BUILT_IN_PERSONAS.find((p) => p.id === req.params.id);
      if (!builtIn) {
        res.status(404).json({ error: 'Persona not found.' });
        return;
      }
      target = {
        ...builtIn,
        id: `persona-custom-${Date.now()}`,
        workspaceId: activeWs.id,
        isBuiltIn: false,
      };
      db.customPersonas.push(target);
    }

    target.name = String(b.name || target.name).trim();
    target.tagline = String(b.tagline ?? target.tagline).trim();
    target.description = String(b.description ?? target.description).trim();
    target.avatarCode = String(b.avatarCode || target.avatarCode).slice(0, 3).toUpperCase();
    target.segment = String(b.segment || target.segment).trim();
    target.tags = Array.isArray(b.tags) ? b.tags : target.tags;
    target.characteristics = Array.isArray(b.characteristics) ? b.characteristics : target.characteristics;
    target.preferences = Array.isArray(b.preferences) ? b.preferences : target.preferences;
    target.motivations = Array.isArray(b.motivations) ? b.motivations : target.motivations;
    target.purchasingBehavior = String(b.purchasingBehavior ?? target.purchasingBehavior).trim();
    target.decisionFactors = Array.isArray(b.decisionFactors) ? b.decisionFactors : target.decisionFactors;
    target.concerns = Array.isArray(b.concerns) ? b.concerns : target.concerns;
    target.context = String(b.context ?? target.context).trim();
    target.priceSensitivity = b.priceSensitivity || target.priceSensitivity;
    target.decisionSpeed = b.decisionSpeed || target.decisionSpeed;
    target.brandLoyalty = typeof b.brandLoyalty === 'number' ? b.brandLoyalty : target.brandLoyalty;

    saveDatabase(db);
    res.json({ persona: target });
  });

  app.post('/api/personas/:id/favorite', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const activeWs = db.workspaces.find((w) => w.ownerId === user.id) || db.workspaces[0];
    const wsId = activeWs.id;
    const list = db.favoritePersonaIdsByWorkspace[wsId] || [];
    const pid = req.params.id;
    if (list.includes(pid)) {
      db.favoritePersonaIdsByWorkspace[wsId] = list.filter((id) => id !== pid);
    } else {
      db.favoritePersonaIdsByWorkspace[wsId] = [...list, pid];
    }
    saveDatabase(db);
    res.json({ ok: true });
  });

  app.post('/api/personas/:id/duplicate', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const activeWs = db.workspaces.find((w) => w.ownerId === user.id) || db.workspaces[0];
    const all = getAllPersonasForWorkspace(activeWs.id);
    const source = all.find((p) => p.id === req.params.id);
    if (!source) {
      res.status(404).json({ error: 'Persona not found.' });
      return;
    }
    const copy: Persona = {
      ...source,
      id: `persona-custom-${Date.now()}`,
      workspaceId: activeWs.id,
      name: `${source.name} (Copy)`,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
    };
    db.customPersonas.push(copy);
    saveDatabase(db);
    res.json({ persona: copy });
  });

  app.delete('/api/personas/builtin/all', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const activeWs = db.workspaces.find((w) => w.ownerId === user.id) || db.workspaces[0];
    if (!db.deletedBuiltInPersonaIdsByWorkspace) {
      db.deletedBuiltInPersonaIdsByWorkspace = {};
    }
    db.deletedBuiltInPersonaIdsByWorkspace[activeWs.id] = BUILT_IN_PERSONAS.map((p) => p.id);
    saveDatabase(db);
    res.json({ ok: true });
  });

  app.post('/api/personas/builtin/restore', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const activeWs = db.workspaces.find((w) => w.ownerId === user.id) || db.workspaces[0];
    if (db.deletedBuiltInPersonaIdsByWorkspace) {
      db.deletedBuiltInPersonaIdsByWorkspace[activeWs.id] = [];
      saveDatabase(db);
    }
    res.json({ ok: true });
  });

  app.delete('/api/personas/:id', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const activeWs = db.workspaces.find((w) => w.ownerId === user.id) || db.workspaces[0];
    const targetId = req.params.id;

    const customIdx = db.customPersonas.findIndex((p) => p.id === targetId);
    if (customIdx !== -1) {
      db.customPersonas.splice(customIdx, 1);
      saveDatabase(db);
      res.json({ ok: true });
      return;
    }

    const isBuiltIn = BUILT_IN_PERSONAS.some((p) => p.id === targetId);
    if (isBuiltIn) {
      if (!db.deletedBuiltInPersonaIdsByWorkspace) {
        db.deletedBuiltInPersonaIdsByWorkspace = {};
      }
      const existing = db.deletedBuiltInPersonaIdsByWorkspace[activeWs.id] || [];
      if (!existing.includes(targetId)) {
        db.deletedBuiltInPersonaIdsByWorkspace[activeWs.id] = [...existing, targetId];
      }
      saveDatabase(db);
      res.json({ ok: true });
      return;
    }

    res.status(404).json({ error: 'Persona not found.' });
  });

  // AI Research Agent Conversations & Grounded Web Search
  app.post('/api/agent/conversations', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const activeWs = db.workspaces.find((w) => w.ownerId === user.id) || db.workspaces[0];
    const { title, simulationId, personaId } = req.body || {};

    const conv: AgentConversation = {
      id: crypto.randomUUID(),
      workspaceId: activeWs.id,
      title: String(title || 'New Chat').trim(),
      simulationId: simulationId || null,
      personaId: personaId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    db.conversations.unshift(conv);
    saveDatabase(db);
    res.json({ conversation: conv });
  });

  app.post('/api/agent/conversations/:id/reset', requireAuth, (req: AuthedRequest, res) => {
    const conv = db.conversations.find((c) => c.id === req.params.id);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    conv.messages = [];
    conv.updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.json({ conversation: conv });
  });

  app.delete('/api/agent/conversations/:id', requireAuth, (req: AuthedRequest, res) => {
    const idx = db.conversations.findIndex((c) => c.id === req.params.id);
    if (idx !== -1) {
      db.conversations.splice(idx, 1);
      saveDatabase(db);
    }
    res.json({ ok: true });
  });

  app.delete('/api/agent/conversations', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const requestedWsId = String(req.query.workspaceId || '').trim();
    const userWorkspaces = db.workspaces.filter((w) => w.ownerId === user.id);
    const activeWs =
      (requestedWsId && userWorkspaces.find((w) => w.id === requestedWsId)) ||
      userWorkspaces[0] ||
      db.workspaces[0];

    if (activeWs) {
      db.conversations = db.conversations.filter((c) => c.workspaceId !== activeWs.id);
      saveDatabase(db);
    }
    res.json({ ok: true });
  });

  app.post('/api/agent/message', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.user!;
    const activeWs = db.workspaces.find((w) => w.ownerId === user.id) || db.workspaces[0];
    const {
      conversationId,
      simulationId,
      personaId,
      message,
      customContextNote,
      additionalContexts,
      history,
      webSearch,
    } = req.body || {};
    const cleanMsg = String(message || '').trim();
    if (!cleanMsg) {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    const clientHistory = Array.isArray(history)
      ? history
          .filter((m: any) => m && m.content)
          .map((m: any, idx: number) => ({
            id: m.id || `msg-hist-${idx}`,
            role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
            content: String(m.content),
            timestamp: m.timestamp || new Date().toISOString(),
            webSearchUsed: Boolean(m.webSearchUsed),
            sources: Array.isArray(m.sources) ? m.sources : undefined,
          }))
      : [];

    let conv = db.conversations.find((c) => c.id === conversationId);
    if (!conv) {
      conv = {
        id: conversationId || crypto.randomUUID(),
        workspaceId: activeWs.id,
        title: cleanMsg.slice(0, 48),
        simulationId: simulationId || null,
        personaId: personaId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: clientHistory,
      };
      db.conversations.unshift(conv);
    } else {
      conv.simulationId = simulationId !== undefined ? simulationId || null : conv.simulationId;
      conv.personaId = personaId !== undefined ? personaId || null : conv.personaId;
      if (conv.messages.length === 0 && clientHistory.length > 0) {
        conv.messages = clientHistory;
      }
    }

    const sim = simulationId
      ? db.simulations.find((s) => s.id === simulationId) || req.body?.simulation || null
      : req.body?.simulation || null;
    const allPersonas = getAllPersonasForWorkspace(activeWs.id);
    const persona = personaId
      ? allPersonas.find((p) => p.id === personaId) || req.body?.persona || null
      : req.body?.persona || null;

    const userMsgObj = {
      id: `msg-u-${Date.now()}`,
      role: 'user' as const,
      content: cleanMsg,
      timestamp: new Date().toISOString(),
    };
    conv.messages.push(userMsgObj);

    const shouldWebSearch = webSearch !== false;

    upsertRecentSearchRecord({
      workspaceId: activeWs.id,
      query: cleanMsg.slice(0, 60),
      category: shouldWebSearch ? 'WebSearch' : 'Agent',
      targetId: conv.id,
    });

    const extractedSources: AgentSourceCitation[] = [];
    let rawWebSources: any[] = [];

    if (shouldWebSearch) {
      try {
        const searchBundle = await performRealTimeWebResearch({
          queries: [cleanMsg],
          maxResultsPerQuery: 5,
          timeBudgetMs: 4500,
        });
        rawWebSources = searchBundle.sources || [];
        for (const src of rawWebSources) {
          extractedSources.push({
            title: src.title || src.url,
            uri: src.url,
          });
        }
      } catch (err) {
        console.warn('Web research in Agent fallback:', err);
      }
    }

    const normalizedAdditionalContexts = Array.isArray(additionalContexts)
      ? additionalContexts
          .filter((c: any) => c && String(c.content || '').trim())
          .map((c: any) => ({
            id: String(c.id || ''),
            title: String(c.title || '').trim(),
            content: String(c.content || '').trim(),
          }))
      : [];

    const { reply, model } = await generateSmartAssistantResponse({
      userMessage: cleanMsg,
      history: conv.messages,
      simulation: sim,
      persona,
      webSources: rawWebSources,
      customNote: String(customContextNote || '').trim(),
      additionalContexts: normalizedAdditionalContexts,
    });

    conv.messages.push({
      id: `msg-a-${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: new Date().toISOString(),
      webSearchUsed: shouldWebSearch,
      sources: extractedSources,
    });
    conv.updatedAt = new Date().toISOString();
    saveDatabase(db);

    res.json({
      conversation: conv,
      model,
      webSearchInfo: {
        executed: shouldWebSearch,
        sourcesFound: extractedSources.length,
      },
    });
  });

  // Reports & Artifacts Endpoints
  app.post('/api/reports', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const activeWs = db.workspaces.find((w) => w.ownerId === user.id) || db.workspaces[0];
    const { simulationId, simulationName, title, format, summarySnippet } = req.body || {};

    const artifact: ReportArtifact = {
      id: `rep-${Date.now()}`,
      workspaceId: activeWs.id,
      simulationId: String(simulationId || ''),
      simulationName: String(simulationName || 'Simulation'),
      title: String(title || 'Exported Simulation Report'),
      format: format || 'PDF',
      sizeLabel: format === 'PDF' ? '46 KB' : format === 'JSON' ? '31 KB' : '18 KB',
      createdAt: new Date().toISOString(),
      summarySnippet: String(summarySnippet || '').slice(0, 220),
    };
    db.reports.unshift(artifact);
    saveDatabase(db);
    res.json({ report: artifact });
  });

  app.delete('/api/reports/:id', requireAuth, (req: AuthedRequest, res) => {
    const idx = db.reports.findIndex((r) => r.id === req.params.id);
    if (idx !== -1) {
      db.reports.splice(idx, 1);
      saveDatabase(db);
    }
    res.json({ ok: true });
  });

  // Recent Searches Endpoints
  app.post('/api/recent-searches', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const activeWs = db.workspaces.find((w) => w.ownerId === user.id) || db.workspaces[0];
    const { query, category, targetId } = req.body || {};
    let savedItem: RecentSearchItem | null = null;
    if (query && String(query).trim()) {
      savedItem = upsertRecentSearchRecord({
        workspaceId: activeWs.id,
        query: String(query),
        category: category || 'Simulation',
        targetId,
      });
      saveDatabase(db);
    }
    res.json({ ok: true, item: savedItem });
  });

  app.delete('/api/recent-searches/:id', requireAuth, (req: AuthedRequest, res) => {
    db.recentSearches = db.recentSearches.filter((r) => r.id !== req.params.id);
    saveDatabase(db);
    res.json({ ok: true });
  });

  app.delete('/api/recent-searches', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const activeWs = db.workspaces.find((w) => w.ownerId === user.id) || db.workspaces[0];
    db.recentSearches = db.recentSearches.filter((r) => r.workspaceId !== activeWs.id);
    saveDatabase(db);
    res.json({ ok: true });
  });

  // Account Profile & Plan Endpoints
  app.put('/api/account/profile', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const { name, email } = req.body || {};
    if (email) user.email = String(email).trim();
    if (name) {
      user.name = normalizeServerUserName(String(name).trim(), user.email, user.name);
    }
    saveDatabase(db);
    res.json({ user: sanitizeUser(user) });
  });

  app.put('/api/account/plan', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const { plan } = req.body || {};
    if (['Explorer', 'Growth', 'Enterprise'].includes(plan)) {
      user.plan = plan;
      saveDatabase(db);
    }
    res.json({ user: sanitizeUser(user) });
  });

  // Permanently clear all stored account data (simulations, chats, reports, searches, custom personas, extra workspaces)
  app.delete('/api/account/data', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const userWorkspaces = db.workspaces.filter((w) => w.ownerId === user.id);
    const userWsIds = new Set(userWorkspaces.map((w) => w.id));

    for (const sim of db.simulations) {
      if (userWsIds.has(sim.workspaceId)) {
        const timer = activeJobTimers.get(sim.id);
        if (timer) {
          clearTimeout(timer);
          activeJobTimers.delete(sim.id);
        }
      }
    }

    db.simulations = db.simulations.filter((s) => !userWsIds.has(s.workspaceId));
    db.conversations = db.conversations.filter((c) => !userWsIds.has(c.workspaceId));
    db.reports = db.reports.filter((r) => !userWsIds.has(r.workspaceId));
    db.recentSearches = db.recentSearches.filter((rs) => !userWsIds.has(rs.workspaceId));
    db.customPersonas = db.customPersonas.filter(
      (p) => !p.workspaceId || !userWsIds.has(p.workspaceId)
    );

    for (const wsId of userWsIds) {
      delete db.favoritePersonaIdsByWorkspace[wsId];
      if (db.deletedBuiltInPersonaIdsByWorkspace) {
        delete db.deletedBuiltInPersonaIdsByWorkspace[wsId];
      }
    }

    const primaryWs: Workspace = userWorkspaces[0]
      ? {
          ...userWorkspaces[0],
          name: 'Clemir Workspace',
        }
      : {
          id: `ws-${Date.now()}`,
          name: 'Clemir Workspace',
          ownerId: user.id,
          createdAt: new Date().toISOString(),
          role: 'Owner',
        };

    db.workspaces = [
      ...db.workspaces.filter((w) => w.ownerId !== user.id),
      primaryWs,
    ];
    db.favoritePersonaIdsByWorkspace[primaryWs.id] = [];
    if (!db.deletedBuiltInPersonaIdsByWorkspace) {
      db.deletedBuiltInPersonaIdsByWorkspace = {};
    }
    db.deletedBuiltInPersonaIdsByWorkspace[primaryWs.id] = [];

    saveDatabase(db);
    res.json({
      ok: true,
      workspace: primaryWs,
      workspaces: [primaryWs],
    });
  });

  // Owner Settings Endpoint (Server-Side Verified Permission Check)
  app.put('/api/owner/config', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const isVerifiedOwner =
      user.email.toLowerCase() === OWNER_EMAIL.toLowerCase() || user.isOwner === true;
    if (!isVerifiedOwner) {
      res.status(403).json({
        error: 'Forbidden: Only the verified application owner may modify platform configuration.',
      });
      return;
    }

    const incoming = req.body;
    if (incoming && Array.isArray(incoming.pricingPlans)) {
      db.platformConfig = {
        ...db.platformConfig,
        pricingPlans: incoming.pricingPlans,
        updatedAt: new Date().toISOString(),
      };
      saveDatabase(db);
    }
    res.json({ config: db.platformConfig });
  });

  // Vite Middleware in Development / Static Dist in Production
  const distPath = path.resolve(process.cwd(), 'dist');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Clemir AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
