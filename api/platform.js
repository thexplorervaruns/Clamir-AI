import crypto from "crypto";
import { callOpenRouterChat, cleanNaturalAssistantText, generateSmartAssistantResponse } from "./ai/generate.js";
import { extractUrlContentSafely, performRealTimeWebResearch } from "./research/search.js";
import { executeEvidenceBasedSimulation } from "./simulation/run.js";
import { executeEmbeddedTimesFMForecast } from "./forecast/run.js";

const OWNER_EMAIL = "thexplorervaruns@gmail.com";

const DEFAULT_PLATFORM_CONFIG = {
  pricingPlans: [
    {
      id: "Explorer",
      name: "Explorer",
      priceLabel: "Free",
      billingPeriod: "forever",
      audienceTag: "For individuals, teams & new researchers",
      description: "Validate product ideas, create custom audiences, and access full Accounts & Reports.",
      features: [
        "Core simulations (up to 10 runs/month)",
        "Custom target audience & persona creation",
        "Full Accounts & Reports workspace access",
        "Downloadable PDF, JSON, CSV & TXT reports",
        "Context & AI Research Agent access",
      ],
      simulationsLimit: 10,
    },
    {
      id: "Growth",
      name: "Growth",
      priceLabel: "$149",
      billingPeriod: "/month",
      audienceTag: "For scaling product, marketing & insights teams",
      description: "Unlimited audience intelligence, multi-persona comparisons, and live web-grounded research.",
      features: [
        "Unlimited monthly simulations",
        "Full custom audience & persona library",
        "Full Accounts & Reports with batch exports",
        "AI Research Agent with live Web Search grounding",
        "Multi-option A/B & pricing elasticity matrices",
      ],
      simulationsLimit: 500,
    },
    {
      id: "Enterprise",
      name: "Enterprise",
      priceLabel: "Custom",
      billingPeriod: "annual billing",
      audienceTag: "For global organizations & research agencies",
      description: "Dedicated simulation throughput, multi-workspace governance, and bespoke segment calibration.",
      features: [
        "Custom usage limits & dedicated concurrency",
        "Multi-workspace team access & role controls",
        "Bespoke industry audience calibration",
        "Advanced API & data warehouse integrations",
        "Dedicated enterprise research strategist",
      ],
      simulationsLimit: 10000,
    },
  ],
  allowWebSearch: true,
  defaultAgentsPerPersona: 5,
  updatedAt: "2026-11-16T00:00:00Z",
};

function parseBody(req) {
  if (!req || req.body === undefined || req.body === null) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function normalizeUserName(rawName, email = "") {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const trimmed = String(rawName || "").trim();
  const lower = trimmed.toLowerCase();
  const isInvalid =
    !trimmed ||
    lower === "tank" ||
    lower.startsWith("tank ") ||
    lower === "varun (workspace owner)" ||
    lower === "clamir user" ||
    lower === "clamir explorer" ||
    lower === "clemir user" ||
    lower === "clemir explorer";

  if (!isInvalid) return trimmed;
  if (cleanEmail === OWNER_EMAIL) return "Varuna";
  if (cleanEmail === "mailattvaruns@gmail.com") return "Varun S";
  if (cleanEmail && cleanEmail.includes("@")) {
    const prefix = cleanEmail.split("@")[0];
    if (prefix && prefix.toLowerCase() !== "tank") return prefix;
  }
  return "Varuna";
}

function extractRoutePath(req) {
  const qRoute = req.query?.route;
  if (qRoute) {
    return "/" + String(Array.isArray(qRoute) ? qRoute.join("/") : qRoute).replace(/^\/+/, "");
  }
  const rawUrl = String(req.url || "/");
  const pathOnly = rawUrl.split("?")[0];
  return pathOnly.replace(/^\/api\/?/, "/").replace(/^\/platform\.js\/?/, "/");
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  const method = String(req.method || "GET").toUpperCase();
  const route = extractRoutePath(req);
  const body = parseBody(req);

  try {
    // 1. Public Platform Config
    if (route === "/public/config" && method === "GET") {
      return res.status(200).json({ config: DEFAULT_PLATFORM_CONFIG });
    }

    // 2. Public Interactive Demo (Landing Page)
    if (route === "/public/interactive-demo" && method === "POST") {
      const qText = String(body.question || "").trim().slice(0, 500);
      if (!qText) {
        return res.status(400).json({ error: "Question is required." });
      }
      const personaName =
        String(body.customAudienceName || "").trim() ||
        (body.personaId === "persona-experience-seekers"
          ? "Experience Seekers"
          : body.personaId === "persona-brand-loyalists"
          ? "Brand Loyalists"
          : "Value Optimizers");

      const aiRes = await callOpenRouterChat({
        model: "google/gemini-2.5-flash",
        temperature: 0.25,
        responseFormatJson: true,
        messages: [
          {
            role: "user",
            content: `Simulate how the customer audience "${personaName}" responds to this business question: "${qText}".
Return ONLY a valid JSON object with keys: "reaction" (string), "acceptanceScore" (number 0-100), "response" (string), "keyObjection" (string), "opportunity" (string).`,
          },
        ],
      });

      const cleaned = aiRes.content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      return res.status(200).json({
        personaName,
        reaction: cleanNaturalAssistantText(parsed.reaction || "Analytical Interest"),
        acceptanceScore: parsed.acceptanceScore ?? 78,
        response: cleanNaturalAssistantText(parsed.response || ""),
        keyObjection: cleanNaturalAssistantText(parsed.keyObjection || ""),
        opportunity: cleanNaturalAssistantText(parsed.opportunity || ""),
        engineMode: "Clemir AI Assistant",
      });
    }

    // 3. Supabase Session Sync (Stateless)
    if (route === "/auth/supabase-session" && method === "POST") {
      const uid = String(body.userId || crypto.randomUUID());
      const email = String(body.email || "");
      const name = normalizeUserName(body.name, email);
      const authHeader = String(req.headers.authorization || "");
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : crypto.randomBytes(24).toString("hex");

      return res.status(200).json({
        token,
        user: {
          id: uid,
          name,
          email,
          plan: "Explorer",
          isOwner: email.toLowerCase() === OWNER_EMAIL,
          createdAt: new Date().toISOString(),
        },
        workspaces: [
          {
            id: "ws-default",
            name: "Clemir Workspace",
            ownerId: uid,
            createdAt: new Date().toISOString(),
            role: "Owner",
          },
        ],
      });
    }

    // 4. Demo Login (Quick preview without local server DB)
    if (route === "/auth/demo-login" && method === "POST") {
      const asOwner = Boolean(body.asOwner);
      const demoId = asOwner ? "owner-varun" : "demo-explorer";
      const demoEmail = asOwner ? OWNER_EMAIL : "demo@clemir.ai";
      return res.status(200).json({
        token: `stateless-demo-${crypto.randomBytes(12).toString("hex")}`,
        user: {
          id: demoId,
          name: asOwner ? "Varuna" : "Explorer Demo",
          email: demoEmail,
          plan: asOwner ? "Enterprise" : "Explorer",
          isOwner: asOwner,
          createdAt: new Date().toISOString(),
        },
        workspaces: [
          {
            id: "ws-default",
            name: "Clemir Workspace",
            ownerId: demoId,
            createdAt: new Date().toISOString(),
            role: "Owner",
          },
        ],
      });
    }

    // 5. URL Material Extraction
    if (route === "/materials/extract-url" && method === "POST") {
      const extracted = await extractUrlContentSafely(body.url);
      if (!extracted.ok) {
        return res.status(extracted.status || 400).json({ error: extracted.error });
      }
      return res.status(200).json({
        title: extracted.title,
        url: extracted.url,
        extractedContent: extracted.extractedContent,
      });
    }

    // 6. Launch & Synchronously Execute Simulation (Vercel Serverless-Compatible)
    if (route === "/simulations" && method === "POST") {
      if (!body.name || !String(body.name).trim()) {
        return res.status(400).json({ error: "Simulation name is required." });
      }
      const selectedPersonas = Array.isArray(body.selectedPersonas) ? body.selectedPersonas : [];
      if (selectedPersonas.length === 0) {
        return res.status(400).json({ error: "Select at least one persona for simulation." });
      }

      const simId = crypto.randomUUID();
      const newSim = {
        id: simId,
        workspaceId: String(body.workspaceId || "ws-default"),
        name: String(body.name).trim(),
        type: body.type || "test_idea",
        description: String(body.description || "").trim(),
        hypothesis: String(body.hypothesis || "").trim(),
        researchContext: String(body.researchContext || "").trim(),
        targetAudience: String(body.targetAudience || "").trim(),
        researchObjectives: String(body.researchObjectives || "").trim(),
        typeSpecificData: body.typeSpecificData || {},
        materials: Array.isArray(body.materials) ? body.materials : [],
        questions: Array.isArray(body.questions) ? body.questions : [],
        selectedPersonas,
        forecastConfig: body.forecastConfig || undefined,
        webSearchEnabled: body.webSearchEnabled !== false,
        status: "Completed",
        stage: "Completed",
        progress: 100,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        estimatedSecondsRemaining: 0,
      };

      const personasList = Array.isArray(body.personas) ? body.personas : [];
      const { results } = await executeEvidenceBasedSimulation({
        sim: newSim,
        allPersonas: personasList,
        enableWebSearch: newSim.webSearchEnabled !== false,
        existingWebResearch: body.existingWebResearch || null,
        existingTimesfmForecast: body.existingTimesfmForecast || null,
        fastDeterministic: Boolean(body.fastDeterministic),
        maxExecutionMs: 5800,
      });

      newSim.results = results;
      return res.status(201).json({ ok: true, simulation: newSim });
    }

    // 7. Embedded TimesFM Forecast execution
    const fcMatch = route.match(/^\/simulations\/([^/]+)\/forecast$/);
    if (fcMatch && method === "POST") {
      const execRes = await executeEmbeddedTimesFMForecast({
        seriesName: String(body.seriesName || "Simulation Core Metric").trim(),
        unitLabel: String(body.unitLabel || "").trim(),
        frequency: body.frequency || "monthly",
        horizon: body.horizon || 12,
        patchLength: body.patchLength || "auto",
        seasonalPeriod: body.seasonalPeriod || "auto",
        domainContext: String(body.domainContext || "").trim(),
        rawData: body.rawData !== undefined ? String(body.rawData) : "",
        points: Array.isArray(body.points) ? body.points : [],
        enableWebSearch: body.enableWebSearch !== false,
      });

      if (!execRes.ok || !execRes.result) {
        return res.status(400).json({
          ok: false,
          error: `Please provide at least 6 valid numeric historical observations (detected ${execRes.detectedCount}).`,
        });
      }

      return res.status(200).json({
        ok: true,
        result: execRes.result,
        forecastConfig: {
          enabled: true,
          seriesName: execRes.result.seriesName,
          unitLabel: execRes.result.unitLabel,
          frequency: execRes.result.frequency,
          horizon: execRes.result.horizon,
          patchLength: body.patchLength ?? "auto",
          seasonalPeriod: body.seasonalPeriod ?? "auto",
          rawData: body.rawData || "",
          points: Array.isArray(body.points) ? body.points : [],
        },
      });
    }

    // 8. Stateless Agent Message Endpoint (Vercel Serverless-Compatible)
    if (route === "/agent/message" && method === "POST") {
      const message = String(body.message || "").trim();
      if (!message) {
        return res.status(400).json({ error: "Message is required." });
      }
      const shouldWebSearch = body.webSearch !== false;
      let sources = [];
      let rawWebSources = [];
      if (shouldWebSearch) {
        const sr = await performRealTimeWebResearch({
          queries: [message],
          maxResultsPerQuery: 5,
          timeBudgetMs: 2600,
        }).catch(() => null);
        if (sr && Array.isArray(sr.sources)) {
          rawWebSources = sr.sources;
          sources = sr.sources.map((s) => ({ title: s.title || s.url, uri: s.url }));
        }
      }

      const clientHistory = Array.isArray(body.history)
        ? body.history
            .filter((m) => m && m.content)
            .map((m, idx) => ({
              id: m.id || `msg-hist-${idx}`,
              role: m.role === "assistant" ? "assistant" : "user",
              content: String(m.content),
              timestamp: m.timestamp || new Date().toISOString(),
              webSearchUsed: Boolean(m.webSearchUsed),
              sources: Array.isArray(m.sources) ? m.sources : undefined,
            }))
        : [];

      const aiReply = await generateSmartAssistantResponse({
        userMessage: message,
        history: clientHistory,
        simulation: body.simulation || null,
        persona: body.persona || null,
        webSources: rawWebSources,
        customNote: String(body.customContextNote || "").trim(),
        additionalContexts: Array.isArray(body.additionalContexts) ? body.additionalContexts : [],
      });

      const replyContent = cleanNaturalAssistantText(aiReply?.reply || "");

      const userMsg = {
        id: `msg-u-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };
      const assistantMsg = {
        id: `msg-a-${Date.now() + 1}`,
        role: "assistant",
        content:
          replyContent ||
          `I received your message about "${message}". Feel free to share any extra details or follow-up questions.`,
        timestamp: new Date().toISOString(),
        webSearchUsed: shouldWebSearch,
        sources,
      };
      const conv = {
        id: body.conversationId || crypto.randomUUID(),
        workspaceId: String(body.workspaceId || "ws-default"),
        title: message.slice(0, 48),
        simulationId: body.simulationId || null,
        personaId: body.personaId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [...clientHistory, userMsg, assistantMsg],
      };
      return res.status(200).json({
        conversation: conv,
        model: aiReply?.model || "clemir-contextual-assistant",
      });
    }

    // 9. Personas CRUD / Safe Stateless Ack for Supabase & Local-Cached Workspace Routes
    if (route === "/personas" && method === "POST") {
      const cleanName = String(body.name || "Custom Persona").trim();
      return res.status(200).json({
        persona: {
          id: body.id || `persona-custom-${Date.now()}`,
          workspaceId: String(body.workspaceId || "ws-default"),
          name: cleanName,
          tagline: String(body.tagline || "").trim(),
          description: String(body.description || "").trim(),
          avatarCode: String(body.avatarCode || cleanName.slice(0, 2) || "CP")
            .slice(0, 3)
            .toUpperCase(),
          segment: String(body.segment || "Custom Segment").trim(),
          tags: Array.isArray(body.tags) ? body.tags : [],
          characteristics: Array.isArray(body.characteristics) ? body.characteristics : [],
          preferences: Array.isArray(body.preferences) ? body.preferences : [],
          motivations: Array.isArray(body.motivations) ? body.motivations : [],
          purchasingBehavior: String(body.purchasingBehavior || "").trim(),
          decisionFactors: Array.isArray(body.decisionFactors) ? body.decisionFactors : [],
          concerns: Array.isArray(body.concerns) ? body.concerns : [],
          context: String(body.context || "").trim(),
          priceSensitivity: body.priceSensitivity || "Moderate",
          decisionSpeed: body.decisionSpeed || "Deliberate",
          brandLoyalty: Number(body.brandLoyalty) || 0,
          isBuiltIn: false,
          isFavorite: false,
          createdAt: new Date().toISOString(),
        },
      });
    }

    const personaDupMatch = route.match(/^\/personas\/([^/]+)\/duplicate$/);
    if (personaDupMatch && method === "POST") {
      const source = body.sourcePersona || {};
      const baseName = String(source.name || "Audience Persona").trim();
      return res.status(200).json({
        persona: {
          ...source,
          id: `persona-custom-${Date.now()}`,
          workspaceId: String(source.workspaceId || body.workspaceId || "ws-default"),
          name: `${baseName} (Copy)`,
          isBuiltIn: false,
          createdAt: new Date().toISOString(),
        },
      });
    }

    const personaFavMatch = route.match(/^\/personas\/([^/]+)\/favorite$/);
    if (personaFavMatch && method === "POST") {
      return res.status(200).json({ ok: true, stateless: true });
    }

    if (route === "/personas/builtin/restore" && method === "POST") {
      return res.status(200).json({ ok: true, stateless: true });
    }

    const personaIdMatch = route.match(/^\/personas\/([^/]+)$/);
    if (personaIdMatch && method === "PUT") {
      const targetId = personaIdMatch[1];
      const isBuiltInSource =
        targetId.startsWith("persona-") && !targetId.startsWith("persona-custom-");
      const cleanName = String(body.name || "Custom Persona").trim();
      return res.status(200).json({
        persona: {
          id: isBuiltInSource ? `persona-custom-${Date.now()}` : targetId,
          workspaceId: String(body.workspaceId || "ws-default"),
          name: cleanName,
          tagline: String(body.tagline || "").trim(),
          description: String(body.description || "").trim(),
          avatarCode: String(body.avatarCode || cleanName.slice(0, 2) || "CP")
            .slice(0, 3)
            .toUpperCase(),
          segment: String(body.segment || "Custom Segment").trim(),
          tags: Array.isArray(body.tags) ? body.tags : [],
          characteristics: Array.isArray(body.characteristics) ? body.characteristics : [],
          preferences: Array.isArray(body.preferences) ? body.preferences : [],
          motivations: Array.isArray(body.motivations) ? body.motivations : [],
          purchasingBehavior: String(body.purchasingBehavior || "").trim(),
          decisionFactors: Array.isArray(body.decisionFactors) ? body.decisionFactors : [],
          concerns: Array.isArray(body.concerns) ? body.concerns : [],
          context: String(body.context || "").trim(),
          priceSensitivity: body.priceSensitivity || "Moderate",
          decisionSpeed: body.decisionSpeed || "Deliberate",
          brandLoyalty: Number(body.brandLoyalty) || 0,
          isBuiltIn: false,
          isFavorite: Boolean(body.isFavorite),
          createdAt: body.createdAt || new Date().toISOString(),
        },
      });
    }

    if (personaIdMatch && method === "DELETE") {
      return res.status(200).json({ ok: true, stateless: true });
    }

    // Return clean JSON acknowledgment for auxiliary stateless workspace/account requests
    // (Data is persisted natively in Supabase + client workspace state)
    return res.status(200).json({
      ok: true,
      stateless: true,
      route,
      workspaces: [],
      simulations: [],
      conversations: [],
      reports: [],
      recentSearches: [],
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Serverless API error.",
    });
  }
}
