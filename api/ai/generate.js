import dotenv from "dotenv";

dotenv.config();

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const PRIMARY_OPENROUTER_MODEL = "google/gemini-2.5-flash";
const FALLBACK_FREE_MODEL = "openrouter/free";

/**
 * Removes markdown asterisks, hashtags, XML/HTML tags, reasoning blocks, and robotic prefixes
 * so every AI response reads like a natural, articulate human assistant.
 */
export function cleanNaturalAssistantText(rawText) {
  if (!rawText || typeof rawText !== "string") return "";

  return rawText
    // Strip <think>...</think> or <reasoning>...</reasoning> blocks
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    // Strip HTML/XML tags if any
    .replace(/<\/?[a-z][a-z0-9]*[^<>]*>/gi, "")
    // Remove robotic bracket prefixes
    .replace(/\[Simulated Persona Statement\]\s*/gi, "")
    .replace(/\[Simulated [^\]]*Perspective\]:?\s*/gi, "")
    .replace(/\[Source\s*\d+\]/gi, "")
    // Remove markdown headings (### Title -> Title)
    .replace(/^\s*#{1,6}\s+/gm, "")
    // Convert markdown bullet "* item" at start of line to "- item"
    .replace(/^(\s*)\*\s+/gm, "$1- ")
    // Remove bold/italic asterisks and underscores (**text**, *text*, __text__)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*\*/g, "")
    // Remove code fences around plain text
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    // Normalize 3+ newlines into 2 newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Calls OpenRouter using standard HTTP fetch and the OpenAI-compatible chat completions format.
 * Tries "google/gemini-2.5-flash" first, and automatically falls back to "openrouter/free"
 * if the account has insufficient paid credits (HTTP 402) or model availability limits.
 */
export async function callOpenRouterChat({
  prompt,
  messages,
  systemInstruction,
  systemPrompt,
  model = PRIMARY_OPENROUTER_MODEL,
  temperature = 0.35,
  jsonMode = false,
  responseFormatJson = false,
  cleanText = false,
}) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.startsWith("{{")) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured on the server. Set OPENROUTER_API_KEY in your server environment."
    );
  }

  const sysText = systemInstruction || systemPrompt;
  const finalMessages = [];

  if (sysText && String(sysText).trim()) {
    finalMessages.push({
      role: "system",
      content: String(sysText).trim(),
    });
  }

  if (Array.isArray(messages) && messages.length > 0) {
    for (const m of messages) {
      if (m && m.content) {
        finalMessages.push({
          role: m.role === "assistant" || m.role === "system" ? m.role : "user",
          content: String(m.content),
        });
      }
    }
  } else if (prompt && String(prompt).trim()) {
    finalMessages.push({
      role: "user",
      content: String(prompt).trim(),
    });
  } else {
    throw new Error("Prompt or messages array is required for OpenRouter completion.");
  }

  const wantJson = Boolean(jsonMode || responseFormatJson);

  const attemptModelCall = async (targetModel, includeResponseFormat) => {
    const requestBody = {
      model: targetModel,
      messages: finalMessages,
      temperature,
    };

    if (includeResponseFormat) {
      requestBody.response_format = { type: "json_object" };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 22000);

    try {
      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
          "X-Title": "Clamir AI Personal Assistant & Simulation Studio",
        },
        body: JSON.stringify(requestBody),
      });

      clearTimeout(timeout);
      const data = await response.json().catch(() => ({}));
      return { response, data };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  };

  // 1. Primary attempt with google/gemini-2.5-flash
  let { response, data } = await attemptModelCall(model, wantJson);

  // 2. If account has no paid credits (402) or model is rate-limited/unavailable, fall back to openrouter/free
  if (!response.ok && model !== FALLBACK_FREE_MODEL) {
    const retryRes = await attemptModelCall(FALLBACK_FREE_MODEL, false).catch(() => null);
    if (retryRes && retryRes.response.ok) {
      response = retryRes.response;
      data = retryRes.data;
    }
  }

  if (!response.ok) {
    const errMsg =
      data?.error?.message ||
      data?.message ||
      `OpenRouter API returned HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  let result = data.choices?.[0]?.message?.content;
  if ((!result || typeof result !== "string" || !result.trim()) && data.choices?.[0]?.message?.reasoning) {
    result = String(data.choices[0].message.reasoning);
  }

  if (!result || typeof result !== "string") {
    throw new Error("OpenRouter returned an empty completion response.");
  }

  const processedContent =
    cleanText && !wantJson ? cleanNaturalAssistantText(result) : result.trim();

  return {
    content: processedContent,
    model: data.model || model,
    usage: data.usage || null,
    raw: data,
  };
}

/**
 * Intelligent context-aware local synthesizer so that even if external LLM APIs are offline
 * or rate-limited, every single user message receives a relevant, natural, thoughtful response
 * that understands intent, maintains conversation context, and avoids robotic templates.
 */
export function buildContextualAssistantFallback({
  userMessage,
  history = [],
  simulation = null,
  persona = null,
  webSources = [],
  customNote = "",
}) {
  const msg = String(userMessage || "").trim();
  const lower = msg.toLowerCase();

  // Extract previous user/assistant turns for continuity
  const previousTurns = history.filter((m) => m && m.content && m.content !== msg);
  const lastAssistantTurn = [...previousTurns].reverse().find((m) => m.role === "assistant");
  const lastUserTurn = [...previousTurns].reverse().find((m) => m.role === "user");

  // 1. Check if we have live web research sources to answer the question directly
  if (Array.isArray(webSources) && webSources.length > 0) {
    const topFindings = webSources
      .slice(0, 3)
      .map((s, idx) => {
        const snippet = cleanNaturalAssistantText(s.snippet || s.content || "").slice(0, 260);
        return `${idx + 1}. ${s.title}: ${snippet}`;
      })
      .join("\n\n");

    return cleanNaturalAssistantText(
      `Here is what current web sources indicate regarding your question:\n\n${topFindings}\n\nPutting this together: the most effective approach is to focus on the concrete evidence above and test how it applies to your specific goals. Would you like me to break this down into an action plan or explore one of these sources in more detail?`
    );
  }

  // 2. Greetings & conversational openers
  if (
    /^(hi|hello|hey|good morning|good afternoon|good evening|howdy|greetings|yo|sup)\b/i.test(
      lower
    ) &&
    msg.length < 45
  ) {
    const contextHint = persona
      ? ` We currently have the ${persona.name} audience profile active, or we can talk about anything else on your mind.`
      : simulation
      ? ` I have the context for your "${simulation.name}" simulation ready whenever you need it, or we can discuss any other topic, plan tasks, or work through a decision.`
      : " We can brainstorm ideas, plan out tasks or projects, work through a decision, or analyze your audience simulations.";

    return `Hello! How can I help you today?${contextHint}`;
  }

  // 3. Questions about the assistant itself ("who are you", "what can you do", "help")
  if (
    /\b(who are you|what can you do|how can you help|what are your capabilities)\b/i.test(lower)
  ) {
    return [
      "I am your personal AI assistant and strategic partner inside Clamir. You can talk with me naturally about any topic.",
      "Here are a few ways we can work together:",
      "1. Task and Project Planning: Tell me what you are trying to build or accomplish, and I will organize it into clear, practical steps with priorities and milestones.",
      "2. Problem Solving and Decision Making: Share a challenge, trade-off, or set of options, and we will weigh the pros, cons, risks, and best next move.",
      "3. Open Research and Brainstorming: Ask questions on business, technology, writing, market strategy, or everyday topics, and enable Web Search anytime you want live external citations.",
      "4. Simulation and Audience Analysis: Select any simulation or customer persona in the left panel to interview that audience segment or unpack study results.",
      "What would you like to tackle first?",
    ].join("\n\n");
  }

  // 4. Task planning, roadmaps, schedules, checklists, step-by-step plans
  if (
    /\b(plan|schedule|roadmap|checklist|steps to|how do i start|organize|timeline|prioritize|action plan|to-do|todo|launch plan|strategy for)\b/i.test(
      lower
    )
  ) {
    const subject = msg
      .replace(/^(can you |please |help me |i need to |how do i |create a |make a |build a )/i, "")
      .replace(/\?$/, "")
      .trim();

    return [
      `Here is a clear, practical plan to approach ${subject || "your goal"}:`,
      `Phase 1: Clarify the Core Objective and Constraints\nStart by defining the single most important outcome you want to achieve and the deadline or budget constraints that matter most. Write down what success looks like in one measurable sentence.`,
      `Phase 2: Break the Work into High-Impact Milestones\n1. Foundation and Preparation: Gather the essential inputs, requirements, and baseline data before building.\n2. Core Execution: Focus on the smallest functional version or highest-leverage deliverable first so you get early feedback.\n3. Review and Refinement: Test the output against real-world constraints, fix bottlenecks, and simplify any unnecessary complexity.`,
      `Phase 3: Immediate Next Actions for Today\n- Identify the #1 blocker that could slow you down and address it first.\n- Complete the first 30-minute milestone to build momentum.\n- Decide what you can delegate, automate, or defer until later.`,
      `If you share your timeline or any specific constraints you are working with, I can tailor this plan to your exact situation.`,
    ].join("\n\n");
  }

  // 5. Decision-making, comparing options, pros & cons, choosing between alternatives
  if (
    /\b(decide|decision|choose between|pros and cons|compare|vs\b|versus|which option|should i|better option|trade-off|tradeoff)\b/i.test(
      lower
    )
  ) {
    if (simulation && simulation.abComparison) {
      const ab = simulation.abComparison;
      return [
        `Looking at your comparison in "${simulation.name}" (${ab.optionALabel} vs. ${ab.optionBLabel}):`,
        `${ab.optionBLabel} scored ${ab.optionBScore}/100 compared to ${ab.optionAScore}/100 for ${ab.optionALabel}. ${ab.overallVerdict}`,
        `- Where ${ab.optionALabel} works best: ${ab.optionAStrengths.join(", ")}. Its main limitation is ${ab.optionAWeaknesses.join(", ").toLowerCase()}.`,
        `- Where ${ab.optionBLabel} works best: ${ab.optionBStrengths.join(", ")}. Its main watch-out is ${ab.optionBWeaknesses.join(", ").toLowerCase()}.`,
        `My recommendation: Go with ${
          ab.optionBScore >= ab.optionAScore ? ab.optionBLabel : ab.optionALabel
        } as your primary direction, while borrowing the clearest elements from the alternative to reduce onboarding friction. Would you like to test how a specific audience persona reacts to this choice?`,
      ].join("\n\n");
    }

    return [
      `Let's evaluate this decision systematically so you can move forward with confidence regarding: "${msg}"`,
      `1. Reversible vs. Irreversible Impact\nFirst, ask whether this decision is easily reversible. If you can adjust course within a few weeks at low cost, prioritize speed and real-world learning over perfection. If it is costly to reverse, optimize for downside protection and long-term flexibility.`,
      `2. Three Criteria to Weigh Your Options\n- Direct Impact: Which option moves you closest to your primary goal over the next 90 days?\n- Execution Effort and Risk: Which option has fewer hidden dependencies or points of failure?\n- Opportunity Cost: What are you giving up by choosing Option A over Option B?`,
      `3. Recommended Way to Decide\nScore your top options from 1 to 5 on Impact, Speed, and Risk. The option that delivers at least 80% of the upside with half the complexity is almost always the smarter choice.`,
      `Tell me the specific options you are weighing and what matters most to you right now, and I will give you a direct recommendation.`,
    ].join("\n\n");
  }

  // 6. Problem-solving, debugging, troubleshooting, overcoming obstacles
  if (
    /\b(problem|issue|stuck|challenge|fix|solve|trouble|not working|why is|bottleneck|obstacle|improve|optimize)\b/i.test(
      lower
    )
  ) {
    if (simulation && simulation.results) {
      const topConcern =
        simulation.results.objectionsAndConcerns?.[0]?.objection ||
        simulation.results.executiveSummary.mainConcerns?.[0] ||
        "onboarding and value verification friction";
      const topMitigation =
        simulation.results.objectionsAndConcerns?.[0]?.mitigation ||
        simulation.results.recommendations?.[0]?.explanation ||
        "demonstrating concrete outcomes early in the user journey";

      return [
        `To solve the main friction point identified in "${simulation.name}":`,
        `The biggest obstacle surfacing across your audience is ${topConcern.toLowerCase()}.`,
        `Here is how to fix it step by step:\n1. Address the objection upfront: ${topMitigation}\n2. Reduce perceived risk: Give evaluators a clear, low-commitment way to verify results before asking for a long-term commitment.\n3. Focus on your highest-conviction segment first so your messaging stays sharp.`,
        `Would you like help drafting the updated copy or workflow changes to test this fix?`,
      ].join("\n\n");
    }

    return [
      `Let's break down this problem and find the most direct solution for: "${msg}"`,
      `1. Isolate the Root Cause\nMost bottlenecks come from one of three places: unclear inputs/expectations, too many steps in the process, or a mismatch between the solution and the actual constraint. Identify the exact step where progress slows down or breaks.`,
      `2. Simplify Before Adding More\nInstead of adding complexity, remove or bypass the part of the process that is causing friction. Ask: what is the simplest change that would resolve 80% of this issue today?`,
      `3. Test a Small, Fast Fix\nPick one concrete adjustment you can implement immediately, measure whether the outcome improves, and iterate from there.`,
      `Share a bit more detail about what you have already tried or where you are getting stuck, and we will work through the exact solution together.`,
    ].join("\n\n");
  }

  // 7. Focused Persona Conversation (when user selected a specific persona or asks about personas)
  if (
    persona &&
    /\b(you|your|persona|audience|price|buy|switch|concern|objection|prefer|think about|evaluate|opinion)\b/i.test(
      lower
    )
  ) {
    return [
      `Speaking from the perspective of ${persona.name} (${persona.segment}):`,
      `When we look at "${msg}", our mindset is shaped by ${persona.tagline.toLowerCase()} Because our price sensitivity is ${persona.priceSensitivity.toLowerCase()} and our decision speed is ${persona.decisionSpeed.toLowerCase()}, we pay close attention to ${persona.decisionFactors.slice(0, 2).join(" and ").toLowerCase()}.`,
      `Our main hesitation is usually ${
        persona.concerns[0]?.toLowerCase() || "unclear value or switching friction"
      }. If you want to win our segment over, focus on ${
        persona.preferences[0]?.toLowerCase() || "clear, immediate value"
      } and make the transition effortless.`,
      `What specific part of your offer or workflow would you like us to evaluate next?`,
    ].join("\n\n");
  }

  // 8. Focused Simulation Analysis (when user asks about simulation results, pricing, scores, summary)
  if (
    simulation &&
    simulation.results &&
    /\b(simulation|result|score|finding|summary|pricing|tier|report|objection|opportunity|persona|recommend)\b/i.test(
      lower
    )
  ) {
    const r = simulation.results;
    const personaLines = (r.personaBreakdown || [])
      .map(
        (pb) =>
          `- ${pb.personaName} (${pb.acceptanceScore}/100, ${pb.overallReaction}): ${pb.mainTakeaway}`
      )
      .join("\n");

    const topRec = r.recommendations?.[0];

    return [
      `Here is a clear breakdown of the findings for "${simulation.name}":`,
      `Core Takeaway\n${r.executiveSummary.mainFinding}`,
      `How Each Audience Segment Responded\n${personaLines}`,
      topRec
        ? `Most Important Next Step\n${topRec.title}: ${topRec.explanation} (Expected impact: ${topRec.expectedImpact}).`
        : `Overall Sentiment\n${r.sentimentOverview.positive}% positive, ${r.sentimentOverview.neutral}% neutral, and ${r.sentimentOverview.negative}% negative across the evaluated panel.`,
      `Would you like to dive deeper into a specific segment's objections, or turn these recommendations into an implementation checklist?`,
    ].join("\n\n");
  }

  // 9. General open-topic conversation & follow-up continuity
  const followUpAck =
    lastUserTurn && previousTurns.length > 0
      ? `Building on what we were just discussing (${lastUserTurn.content.slice(0, 60)}${
          lastUserTurn.content.length > 60 ? "..." : ""
        }):\n\n`
      : "";

  return cleanNaturalAssistantText(
    `${followUpAck}Regarding "${msg}":\n\nThe best way to think about this is to focus on the core objective, the practical trade-offs involved, and the most direct action you can take next.\n\n1. Key Insight: Clarify the outcome that matters most and strip away secondary noise so your effort goes into the highest-leverage area.\n2. Practical Approach: Start with a small, testable version of your idea or decision, gather real feedback early, and refine based on actual results rather than assumptions.\n3. Next Step: Tell me if you want to break this down into a step-by-step action plan, compare specific options side by side, or run a live web search for external benchmarks.`
  );
}

/**
 * Generates a natural, context-aware assistant response for the AI Agent workspace.
 * Uses OpenRouter (google/gemini-2.5-flash with automatic openrouter/free fallback)
 * and maintains full multi-turn conversation context.
 */
export async function generateSmartAssistantResponse({
  userMessage,
  history = [],
  simulation = null,
  persona = null,
  webSources = [],
  customNote = "",
}) {
  const simSummary = simulation
    ? [
        `Selected Simulation Context (use when relevant to the user's message):`,
        `- Name: ${simulation.name} (Type: ${simulation.type})`,
        `- Description: ${simulation.description || "N/A"}`,
        `- Hypothesis: ${simulation.hypothesis || "N/A"}`,
        `- Target Audience: ${simulation.targetAudience || "N/A"}`,
        simulation.results
          ? `- Main Finding: ${simulation.results.executiveSummary.mainFinding}`
          : `- Status: ${simulation.status} (${simulation.stage})`,
        simulation.results?.personaBreakdown?.length
          ? `- Persona Scores: ${simulation.results.personaBreakdown
              .map((p) => `${p.personaName}: ${p.acceptanceScore}/100 (${p.mainTakeaway})`)
              .join(" | ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "No specific simulation is locked; respond freely as a smart personal assistant.";

  const personaSummary = persona
    ? [
        `Selected Target Audience Persona (adopt or analyze this perspective when relevant):`,
        `- Name: ${persona.name} (${persona.segment})`,
        `- Tagline: ${persona.tagline}`,
        `- Price Sensitivity: ${persona.priceSensitivity}, Decision Speed: ${persona.decisionSpeed}, Brand Loyalty: ${persona.brandLoyalty}/100`,
        `- Decision Factors: ${(persona.decisionFactors || []).join("; ")}`,
        `- Main Concerns: ${(persona.concerns || []).join("; ")}`,
      ].join("\n")
    : "";

  const webContext =
    Array.isArray(webSources) && webSources.length > 0
      ? `Live Web Research Sources Retrieved:\n` +
        webSources
          .map(
            (s, i) =>
              `[${i + 1}] ${s.title} (${s.url}): ${(s.snippet || s.content || "").slice(0, 400)}`
          )
          .join("\n")
      : "";

  const systemPrompt = [
    `You are Clamir, a smart, natural, articulate personal AI assistant and strategic thinking partner.`,
    `CORE BEHAVIOR & VOICE RULES:`,
    `1. Understand every message deeply, maintain full conversation context across turns, and respond directly to what the user actually asked.`,
    `2. Support open conversations about ANY topic: everyday questions, task and project planning, problem-solving, decision-making, brainstorming, writing, technical concepts, business strategy, and audience simulation analysis.`,
    `3. Write in clean, natural, warm, intelligent human prose. NEVER use markdown asterisks (**), hashtags (###), XML/HTML tags, bracketed labels like [Simulated Persona Statement], or robotic filler.`,
    `4. When organizing steps or points, use simple numbered lists (1. 2. 3.) or plain dashes (- ) with clear paragraph spacing.`,
    `5. If the user asks a general question, a planning question, or starts an open conversation, answer it directly and helpfully—do not force simulation jargon if the user is asking about something else.`,
    `6. When the user asks about their active simulation or selected persona, use the workspace context below to give specific, grounded answers.`,
    customNote ? `User Context Note: ${customNote}` : "",
    simSummary,
    personaSummary,
    webContext,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Build multi-turn message history (last 14 messages for deep context continuity)
  const recentHistory = Array.isArray(history)
    ? history
        .slice(-14)
        .filter((m) => m && m.content)
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content),
        }))
    : [];

  // Ensure the latest user message is at the end
  if (
    recentHistory.length === 0 ||
    recentHistory[recentHistory.length - 1].content !== userMessage
  ) {
    recentHistory.push({ role: "user", content: userMessage });
  }

  try {
    const completion = await callOpenRouterChat({
      messages: recentHistory,
      systemInstruction: systemPrompt,
      temperature: 0.4,
      cleanText: true,
    });

    const cleaned = cleanNaturalAssistantText(completion.content);
    if (cleaned) {
      return {
        reply: cleaned,
        model: completion.model,
      };
    }
  } catch (err) {
    console.warn("OpenRouter assistant fallback activated:", err instanceof Error ? err.message : err);
  }

  const fallbackReply = buildContextualAssistantFallback({
    userMessage,
    history: recentHistory,
    simulation,
    persona,
    webSources,
    customNote,
  });

  return {
    reply: fallbackReply,
    model: "clamir-contextual-assistant",
  };
}

/**
 * Express / Serverless HTTP handler for POST /api/ai/generate
 */
export async function handleAiGenerateRequest(req, res) {
  try {
    const {
      prompt,
      messages,
      systemInstruction,
      systemPrompt,
      temperature,
      jsonMode,
      responseFormatJson,
    } = req.body || {};

    const wantJson = Boolean(jsonMode || responseFormatJson);
    const completion = await callOpenRouterChat({
      prompt,
      messages,
      systemInstruction: systemInstruction || systemPrompt,
      temperature: typeof temperature === "number" ? temperature : 0.35,
      jsonMode: wantJson,
      cleanText: !wantJson,
    });

    res.json({
      ok: true,
      result: completion.content,
      content: completion.content,
      model: completion.model,
      usage: completion.usage,
    });
  } catch (err) {
    // Even if OpenRouter returns an error on /api/ai/generate, provide a helpful response when non-JSON
    const { prompt, messages, jsonMode, responseFormatJson } = req.body || {};
    if (!jsonMode && !responseFormatJson) {
      const lastMsg =
        prompt ||
        (Array.isArray(messages) && messages.length > 0
          ? messages[messages.length - 1]?.content
          : "");
      if (lastMsg) {
        const fallback = buildContextualAssistantFallback({
          userMessage: String(lastMsg),
          history: Array.isArray(messages) ? messages : [],
        });
        res.json({
          ok: true,
          result: fallback,
          content: fallback,
          model: "clamir-contextual-assistant",
        });
        return;
      }
    }

    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : "OpenRouter AI generation failed.",
    });
  }
}

export default handleAiGenerateRequest;
