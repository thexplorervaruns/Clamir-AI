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

  let cleaned = rawText
    // Decode HTML entities first so encoded tags/slashes get stripped cleanly
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x2F;|&#47;/gi, "/")
    .replace(/&nbsp;/gi, " ")
    // Convert escaped sequences if returned literally
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\\\//g, "/")
    // Strip reasoning blocks
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/\[think\][\s\S]*?\[\/think\]/gi, "")
    .replace(/\[reasoning\][\s\S]*?\[\/reasoning\]/gi, "")
    // Strip LLM special tokens
    .replace(/<\|[^|>]*\|>/g, "")
    .replace(/<｜[^｜>]*｜>/g, "")
    .replace(/\[\/?(?:INST|SYS|s|THOUGHT|ANSWER|RESPONSE|OUT|ASSISTANT|USER)\]/gi, "")
    // Convert block tags to line breaks before stripping all tags
    .replace(/<\/?(?:br|p|div|li|tr|h[1-6])\b[^>]*\/?>/gi, "\n")
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9:_-]*[^>]*\/?>/g, "")
    .replace(/(?:^|\s)\/[a-zA-Z][a-zA-Z0-9_-]*>/g, " ")
    .replace(/<\/[a-zA-Z][a-zA-Z0-9_-]*/g, "")
    // Remove robotic bracket prefixes & citation numbers
    .replace(/^\[Custom Audience & Context Note:[^\]]*\]\s*/gim, "")
    .replace(/\[Simulated Persona Statement\]\s*/gi, "")
    .replace(/\[Simulated [^\]]*Perspective\]:?\s*/gi, "")
    .replace(/\[Context\s*\d*:[^\]]*\]\s*/gi, "")
    .replace(/\[Source\s*\d+\]/gi, "")
    .replace(/\[\d{1,2}\]/g, "")
    // Strip markdown images ![alt](url) and clean markdown links [label](url) -> label
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
    // Strip raw URLs inside prose (citations render separately as clickable links)
    .replace(/\(\s*https?:\/\/[^\s)]+\s*\)/gi, "")
    .replace(/https?:\/\/[^\s<>()]+/gi, "")
    // Remove markdown headings, fences, code ticks, quotes, and bold/italic asterisks
    .replace(/^\s*```[a-zA-Z0-9_-]*\s*$/gm, "")
    .replace(/```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^(\s*)\*\s+/gm, "$1- ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*\*/g, "");

  // Replace "/" symbols in prose so responses read cleanly as normal text
  cleaned = cleaned
    .replace(/\/{2,}/g, " ")
    .replace(/(\d+)\s*\/\s*100\b/g, "$1 out of 100")
    .replace(/(\$\d[\d,.]*)\s*\/\s*(month|mo|year|yr|week|day|user|seat)\b/gi, "$1 per $2")
    .replace(/\b24\s*\/\s*7\b/g, "around the clock")
    .replace(/\band\s*\/\s*or\b/gi, "and or")
    .replace(/\bpros\s*\/\s*cons\b/gi, "pros and cons")
    .replace(/\bA\s*\/\s*B\b/g, "A vs B")
    .replace(/\b([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)\b/g, "$1 or $2")
    .replace(/\b([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)\b/g, "$1 or $2")
    .replace(/\s+\/\s+/g, ", ")
    .replace(/(^|\s)\/+(\s|$)/g, " ")
    .replace(/\//g, " ");

  return cleaned
    .replace(/[ \t]+([.,!?;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n +/g, "\n")
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
          "X-Title": "Clemir AI Personal Assistant & Simulation Studio",
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
 * Normalizes multi-box Additional Contexts and legacy customNote into structured context items.
 */
function normalizeAdditionalContexts({ customNote = "", additionalContexts = [] } = {}) {
  const items = [];
  if (Array.isArray(additionalContexts)) {
    for (let i = 0; i < additionalContexts.length; i++) {
      const entry = additionalContexts[i];
      if (!entry) continue;
      if (typeof entry === "string") {
        const clean = entry.trim();
        if (clean) items.push({ title: `Context ${items.length + 1}`, content: clean });
      } else if (typeof entry === "object") {
        const content = String(entry.content || "").trim();
        const title = String(entry.title || "").trim() || `Context ${items.length + 1}`;
        if (content) {
          items.push({ title, content });
        }
      }
    }
  }
  const cleanLegacy = String(customNote || "").trim();
  if (cleanLegacy) {
    const alreadyIncluded = items.some(
      (it) => cleanLegacy.includes(it.content) && it.content.length > 5
    );
    if (!alreadyIncluded) {
      items.push({ title: "Additional Context Note", content: cleanLegacy });
    }
  }
  return items;
}

/**
 * Intelligent context-aware local synthesizer so that even if external LLM APIs are offline
 * or rate-limited, every single user message receives a relevant, natural, thoughtful response
 * that understands intent, maintains conversation context, incorporates all Additional Context boxes,
 * synthesizes web research sources, and avoids robotic templates.
 */
export function buildContextualAssistantFallback({
  userMessage,
  history = [],
  simulation = null,
  persona = null,
  webSources = [],
  customNote = "",
  additionalContexts = [],
}) {
  const msg = String(userMessage || "").trim();
  const lower = msg.toLowerCase();

  const contextItems = normalizeAdditionalContexts({ customNote, additionalContexts });
  const hasAdditionalContext = contextItems.length > 0;
  const contextSummaryBlock = hasAdditionalContext
    ? contextItems
        .map((c) => `- ${c.title}: ${c.content}`)
        .join("\n")
    : "";

  // Extract previous user/assistant turns for continuity
  const previousTurns = history.filter((m) => m && m.content && m.content !== msg);
  const lastUserTurn = [...previousTurns].reverse().find((m) => m.role === "user");

  // 1. Check if we have live web research sources to answer the question directly
  if (Array.isArray(webSources) && webSources.length > 0) {
    const topFindings = webSources
      .slice(0, 4)
      .map((s, idx) => {
        const rawSnippet = s.excerpt || s.snippet || s.content || "";
        const snippet = cleanNaturalAssistantText(rawSnippet).slice(0, 280);
        return `${idx + 1}. ${s.title}${snippet ? `: ${snippet}` : ""}`;
      })
      .join("\n\n");

    const contextBridge = hasAdditionalContext
      ? `\n\nConnecting this to your provided context (${contextItems
          .map((c) => c.title)
          .join(", ")}):\n${contextSummaryBlock}\nFocusing on the web findings above within these parameters helps keep your next step aligned with your actual goals and constraints.`
      : `\n\nPutting this together: the most effective approach is to focus on the concrete evidence above and test how it applies to your specific goals.`;

    return cleanNaturalAssistantText(
      `Here is what live web search returned for "${msg}":\n\n${topFindings}${contextBridge}\n\nWould you like me to turn these findings into an action plan or analyze one of these points further?`
    );
  }

  // 2. Greetings & conversational openers
  if (
    /^(hi|hello|hey|good morning|good afternoon|good evening|howdy|greetings|yo|sup)\b/i.test(
      lower
    ) &&
    msg.length < 45
  ) {
    const contextHint = hasAdditionalContext
      ? ` I have your ${contextItems.length} Additional Context note${
          contextItems.length === 1 ? "" : "s"
        } (${contextItems.map((c) => c.title).join(", ")}) loaded and ready.`
      : persona
      ? ` We currently have the ${persona.name} audience profile selected, or we can talk about anything else on your mind.`
      : simulation
      ? ` I have the context for your "${simulation.name}" simulation ready whenever you need it, or we can discuss any other topic, plan tasks, or work through a decision.`
      : " We can brainstorm ideas, plan out tasks or projects, work through a decision, or analyze your audience simulations.";

    return `Hello! How can I help you today?${contextHint}`;
  }

  // 3. Questions about what context is currently loaded
  if (
    hasAdditionalContext &&
    /\b(context|notes?|details?|what do you know|what have i given|remember|instructions)\b/i.test(
      lower
    )
  ) {
    return cleanNaturalAssistantText(
      `Yes, I have all ${contextItems.length} of your Additional Context box${
        contextItems.length === 1 ? "" : "es"
      } in memory for this conversation:\n\n${contextSummaryBlock}\n\nTell me what you would like to analyze, plan, or decide using this information.`
    );
  }

  // 4. Questions about the assistant itself ("who are you", "what can you do", "help")
  if (
    /\b(who are you|what can you do|how can you help|what are your capabilities)\b/i.test(lower)
  ) {
    return [
      "I am Clemir AI, your personal AI assistant and strategic partner. You can talk with me naturally about any topic.",
      "Here are a few ways we can work together:",
      "1. Task and Project Planning: Tell me what you are trying to build or accomplish, and I will organize it into clear, practical steps with priorities and milestones.",
      "2. Context-Aware Strategy: Add one or more Additional Context boxes with your product details, audience constraints, or goals, and I will tailor every answer around them.",
      "3. Decision Making and Problem Solving: Share a challenge, trade-off, or set of options, and we will weigh the pros, cons, risks, and best next move.",
      "4. Live Web Search and Simulation Analysis: Toggle Web Search anytime for live web sources, or select any simulation or persona to inspect results.",
      "What would you like to tackle first?",
    ].join("\n\n");
  }

  // 5. Task planning, roadmaps, schedules, checklists, step-by-step plans
  if (
    /\b(plan|schedule|roadmap|checklist|steps to|how do i start|organize|timeline|prioritize|action plan|to-do|todo|launch plan|strategy for)\b/i.test(
      lower
    )
  ) {
    const subject = msg
      .replace(/^(can you |please |help me |i need to |how do i |create a |make a |build a )/i, "")
      .replace(/\?$/, "")
      .trim();

    const contextTailoring = hasAdditionalContext
      ? `\n\nTailored to your Additional Context:\n${contextSummaryBlock}\nEvery milestone above should be scoped directly around these constraints.`
      : "";

    return cleanNaturalAssistantText([
      `Here is a clear, practical plan to approach ${subject || "your goal"}:`,
      `Phase 1: Clarify the Core Objective and Constraints\nStart by defining the single most important outcome you want to achieve and the deadline or budget constraints that matter most. Write down what success looks like in one measurable sentence.`,
      `Phase 2: Break the Work into High-Impact Milestones\n1. Foundation and Preparation: Gather the essential inputs, requirements, and baseline data before building.\n2. Core Execution: Focus on the smallest functional version or highest-leverage deliverable first so you get early feedback.\n3. Review and Refinement: Test the output against real-world constraints, fix bottlenecks, and simplify any unnecessary complexity.`,
      `Phase 3: Immediate Next Actions for Today\n- Identify the #1 blocker that could slow you down and address it first.\n- Complete the first 30-minute milestone to build momentum.\n- Decide what you can delegate, automate, or defer until later.${contextTailoring}`,
      `If you share your timeline or want to adjust any part of this plan, let me know.`,
    ].join("\n\n"));
  }

  // 6. Decision-making, comparing options, pros & cons, choosing between alternatives
  if (
    /\b(decide|decision|choose between|pros and cons|compare|vs\b|versus|which option|should i|better option|trade-off|tradeoff)\b/i.test(
      lower
    )
  ) {
    if (simulation && simulation.abComparison) {
      const ab = simulation.abComparison;
      return cleanNaturalAssistantText([
        `Looking at your comparison in "${simulation.name}" (${ab.optionALabel} vs. ${ab.optionBLabel}):`,
        `${ab.optionBLabel} scored ${ab.optionBScore} out of 100 compared to ${ab.optionAScore} out of 100 for ${ab.optionALabel}. ${ab.overallVerdict}`,
        `- Where ${ab.optionALabel} works best: ${ab.optionAStrengths.join(", ")}. Its main limitation is ${ab.optionAWeaknesses.join(", ").toLowerCase()}.`,
        `- Where ${ab.optionBLabel} works best: ${ab.optionBStrengths.join(", ")}. Its main watch-out is ${ab.optionBWeaknesses.join(", ").toLowerCase()}.`,
        `My recommendation: Go with ${
          ab.optionBScore >= ab.optionAScore ? ab.optionBLabel : ab.optionALabel
        } as your primary direction, while borrowing the clearest elements from the alternative to reduce onboarding friction.${
          hasAdditionalContext ? `\n\nApplied Context:\n${contextSummaryBlock}` : ""
        }`,
      ].join("\n\n"));
    }

    return cleanNaturalAssistantText([
      `Let's evaluate this decision systematically so you can move forward with confidence regarding: "${msg}"`,
      hasAdditionalContext ? `Context Factors Weighed:\n${contextSummaryBlock}` : "",
      `1. Reversible vs. Irreversible Impact\nFirst, ask whether this decision is easily reversible. If you can adjust course within a few weeks at low cost, prioritize speed and real-world learning over perfection. If it is costly to reverse, optimize for downside protection and long-term flexibility.`,
      `2. Three Criteria to Weigh Your Options\n- Direct Impact: Which option moves you closest to your primary goal over the next 90 days?\n- Execution Effort and Risk: Which option has fewer hidden dependencies or points of failure?\n- Opportunity Cost: What are you giving up by choosing Option A over Option B?`,
      `3. Recommended Way to Decide\nScore your top options from 1 to 5 on Impact, Speed, and Risk. The option that delivers at least 80% of the upside with half the complexity is almost always the smarter choice.`,
      `Tell me the specific options you are weighing and what matters most to you right now, and I will give you a direct recommendation.`,
    ]
      .filter(Boolean)
      .join("\n\n"));
  }

  // 7. Problem-solving, debugging, troubleshooting, overcoming obstacles
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

      return cleanNaturalAssistantText([
        `To solve the main friction point identified in "${simulation.name}":`,
        `The biggest obstacle surfacing across your audience is ${topConcern.toLowerCase()}.`,
        `Here is how to fix it step by step:\n1. Address the objection upfront: ${topMitigation}\n2. Reduce perceived risk: Give evaluators a clear, low-commitment way to verify results before asking for a long-term commitment.\n3. Focus on your highest-conviction segment first so your messaging stays sharp.`,
        hasAdditionalContext ? `Your Added Context Considered:\n${contextSummaryBlock}` : "",
        `Would you like help drafting the updated copy or workflow changes to test this fix?`,
      ]
        .filter(Boolean)
        .join("\n\n"));
    }

    return cleanNaturalAssistantText([
      `Let's break down this problem and find the most direct solution for: "${msg}"`,
      hasAdditionalContext ? `Operating Context Considered:\n${contextSummaryBlock}` : "",
      `1. Isolate the Root Cause\nMost bottlenecks come from one of three places: unclear inputs or expectations, too many steps in the process, or a mismatch between the solution and the actual constraint. Identify the exact step where progress slows down or breaks.`,
      `2. Simplify Before Adding More\nInstead of adding complexity, remove or bypass the part of the process that is causing friction. Ask: what is the simplest change that would resolve 80% of this issue today?`,
      `3. Test a Small, Fast Fix\nPick one concrete adjustment you can implement immediately, measure whether the outcome improves, and iterate from there.`,
      `Share a bit more detail about what you have already tried or where you are getting stuck, and we will work through the exact solution together.`,
    ]
      .filter(Boolean)
      .join("\n\n"));
  }

  // 8. Focused Persona Conversation (when user selected a specific persona)
  if (
    persona &&
    /\b(you|your|persona|audience|price|buy|switch|concern|objection|prefer|think about|evaluate|opinion)\b/i.test(
      lower
    )
  ) {
    return cleanNaturalAssistantText([
      `Speaking from the perspective of ${persona.name} (${persona.segment}):`,
      `When we look at "${msg}", our mindset is shaped by ${persona.tagline.toLowerCase()} Because our price sensitivity is ${persona.priceSensitivity.toLowerCase()} and our decision speed is ${persona.decisionSpeed.toLowerCase()}, we pay close attention to ${persona.decisionFactors.slice(0, 2).join(" and ").toLowerCase()}.`,
      `Our main hesitation is usually ${
        persona.concerns[0]?.toLowerCase() || "unclear value or switching friction"
      }. If you want to win our segment over, focus on ${
        persona.preferences[0]?.toLowerCase() || "clear, immediate value"
      } and make the transition effortless.`,
      hasAdditionalContext ? `Specifically weighing your added context:\n${contextSummaryBlock}` : "",
      `What specific part of your offer or workflow would you like us to evaluate next?`,
    ]
      .filter(Boolean)
      .join("\n\n"));
  }

  // 9. Focused Simulation Analysis (when user asks about simulation results)
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
          `- ${pb.personaName} (${pb.acceptanceScore} out of 100, ${pb.overallReaction}): ${pb.mainTakeaway}`
      )
      .join("\n");

    const topRec = r.recommendations?.[0];

    return cleanNaturalAssistantText([
      `Here is a clear breakdown of the findings for "${simulation.name}":`,
      `Core Takeaway\n${r.executiveSummary.mainFinding}`,
      `How Each Audience Segment Responded\n${personaLines}`,
      topRec
        ? `Most Important Next Step\n${topRec.title}: ${topRec.explanation} (Expected impact: ${topRec.expectedImpact}).`
        : `Overall Sentiment\n${r.sentimentOverview.positive}% positive, ${r.sentimentOverview.neutral}% neutral, and ${r.sentimentOverview.negative}% negative across the evaluated panel.`,
      hasAdditionalContext ? `Additional Context Applied:\n${contextSummaryBlock}` : "",
      `Would you like to dive deeper into a specific segment's objections, or turn these recommendations into an implementation checklist?`,
    ]
      .filter(Boolean)
      .join("\n\n"));
  }

  // 10. General open-topic conversation & Additional Context synthesis
  const followUpAck =
    lastUserTurn && previousTurns.length > 0
      ? `Building on what we were just discussing (${lastUserTurn.content.slice(0, 60)}${
          lastUserTurn.content.length > 60 ? "..." : ""
        }):\n\n`
      : "";

  if (hasAdditionalContext) {
    return cleanNaturalAssistantText(
      `${followUpAck}Regarding "${msg}" in light of your Additional Context:\n\n${contextSummaryBlock}\n\n1. Direct Takeaway: Align your next step directly with the constraints and details you outlined above rather than treating this as a generic problem.\n2. Practical Action: Focus on validating the biggest assumption in your context first, keeping execution tight and measurable.\n3. Next Step: Tell me whether you would like a step-by-step plan, pros and cons across options, or live Web Search benchmarks around these specifics.`
    );
  }

  return cleanNaturalAssistantText(
    `${followUpAck}Regarding "${msg}":\n\nThe best way to think about this is to focus on the core objective, the practical trade-offs involved, and the most direct action you can take next.\n\n1. Key Insight: Clarify the outcome that matters most and strip away secondary noise so your effort goes into the highest-leverage area.\n2. Practical Approach: Start with a small, testable version of your idea or decision, gather real feedback early, and refine based on actual results rather than assumptions.\n3. Next Step: Tell me if you want to break this down into a step-by-step action plan, compare specific options side by side, or run a live Web Search for external benchmarks.`
  );
}

/**
 * Generates a natural, context-aware assistant response for the AI Agent workspace.
 * Uses OpenRouter (google/gemini-2.5-flash with automatic openrouter/free fallback)
 * and maintains full multi-turn conversation context + multiple Additional Context boxes.
 */
export async function generateSmartAssistantResponse({
  userMessage,
  history = [],
  simulation = null,
  persona = null,
  webSources = [],
  customNote = "",
  additionalContexts = [],
}) {
  const contextItems = normalizeAdditionalContexts({ customNote, additionalContexts });
  const additionalContextPromptBlock =
    contextItems.length > 0
      ? `USER ADDITIONAL CONTEXT (MUST BE UNDERSTOOD AND USED IN EVERY RELEVANT RESPONSE):\n` +
        contextItems.map((c, idx) => `[Context ${idx + 1}: ${c.title}]\n${c.content}`).join("\n\n")
      : "";

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
              `[${i + 1}] ${s.title} (${s.url}): ${(
                s.excerpt ||
                s.snippet ||
                s.content ||
                ""
              ).slice(0, 450)}`
          )
          .join("\n")
      : "";

  const systemPrompt = [
    `You are Clemir, a smart, natural, articulate personal AI assistant and strategic thinking partner inside Clemir AI.`,
    `CORE BEHAVIOR & VOICE RULES:`,
    `1. Understand every message deeply, maintain full conversation context across turns, and respond directly to what the user actually asked.`,
    `2. Support open conversations about ANY topic: everyday questions, task and project planning, problem-solving, decision-making, brainstorming, writing, technical concepts, business strategy, and audience simulation analysis.`,
    `3. Write in clean, natural, warm, intelligent human prose. NEVER use XML or HTML tags, markdown asterisks (**), hashtags (#), code backticks, bracketed labels, raw URLs inside sentences, or slash (/) separators in your text.`,
    `4. When organizing steps or points, use simple numbered lists (1. 2. 3.) or plain dashes (- ) with clear paragraph spacing.`,
    `5. If the user provided Additional Context boxes below, treat them as primary background knowledge and constraints—actively apply and reference them naturally.`,
    `6. If live Web Research sources are provided below, synthesize their concrete findings cleanly in your answer.`,
    additionalContextPromptBlock,
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
    additionalContexts,
  });

  return {
    reply: fallbackReply,
    model: "clemir-contextual-assistant",
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
      additionalContexts,
      customNote,
    } = req.body || {};

    const wantJson = Boolean(jsonMode || responseFormatJson);
    const contextItems = normalizeAdditionalContexts({ customNote, additionalContexts });
    const mergedSystem = [
      systemInstruction || systemPrompt || "",
      contextItems.length > 0
        ? `User Additional Context:\n` +
          contextItems.map((c, idx) => `[${idx + 1}. ${c.title}] ${c.content}`).join("\n")
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const completion = await callOpenRouterChat({
      prompt,
      messages,
      systemInstruction: mergedSystem || undefined,
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
    const { prompt, messages, jsonMode, responseFormatJson, additionalContexts, customNote } =
      req.body || {};
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
          additionalContexts: Array.isArray(additionalContexts) ? additionalContexts : [],
          customNote: customNote || "",
        });
        res.json({
          ok: true,
          result: fallback,
          content: fallback,
          model: "clemir-contextual-assistant",
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
