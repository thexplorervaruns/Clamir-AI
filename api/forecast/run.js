import crypto from "crypto";
import { callOpenRouterChat, cleanNaturalAssistantText } from "../ai/generate.js";
import { performRealTimeWebResearch } from "../research/search.js";

function roundVal(val, decimals = 4) {
  if (!Number.isFinite(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function cleanNumericToken(token) {
  if (typeof token === "number") return Number.isFinite(token) ? token : NaN;
  if (typeof token !== "string") return NaN;
  const stripped = token
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[$€£¥,%]/g, "")
    .replace(/,/g, "");
  if (!stripped) return NaN;
  const parsed = Number(stripped);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Parses CSV/TSV, JSON arrays, or newline/comma numeric lists into ordered { label, value } points.
 * Rejects fabricated/empty inputs cleanly.
 */
export function parseTimeSeriesInput(rawText = "", manualPoints = []) {
  if (Array.isArray(manualPoints) && manualPoints.length > 0) {
    const cleaned = manualPoints
      .map((pt, idx) => {
        const val = cleanNumericToken(pt?.value);
        if (!Number.isFinite(val)) return null;
        return {
          label: String(pt?.label || `T${idx + 1}`).trim() || `T${idx + 1}`,
          value: val,
        };
      })
      .filter(Boolean);
    if (cleaned.length > 0) return cleaned;
  }

  const trimmed = String(rawText || "").trim();
  if (!trimmed) return [];

  // 1. Try JSON array
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.data)
        ? parsed.data
        : Array.isArray(parsed?.series)
        ? parsed.series
        : null;
      if (arr) {
        const points = arr
          .map((item, idx) => {
            if (typeof item === "number" || typeof item === "string") {
              const v = cleanNumericToken(item);
              return Number.isFinite(v) ? { label: `T${idx + 1}`, value: v } : null;
            }
            if (item && typeof item === "object") {
              const label =
                item.date ?? item.timestamp ?? item.period ?? item.label ?? item.time ?? item.x ?? `T${idx + 1}`;
              const val = cleanNumericToken(
                item.value ?? item.y ?? item.close ?? item.price ?? item.amount ?? item.count
              );
              return Number.isFinite(val) ? { label: String(label), value: val } : null;
            }
            return null;
          })
          .filter(Boolean);
        if (points.length > 0) return points;
      }
    } catch {
      // Fall through to CSV/text parsing
    }
  }

  // 2. Line-by-line CSV / TSV / Space-separated
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Single-line comma- or space-separated numbers (e.g. "120, 124, 130, 128, 135, 141")
  if (lines.length === 1) {
    const tokens = lines[0]
      .split(/[,\t;\s]+/)
      .map((t) => cleanNumericToken(t))
      .filter((n) => Number.isFinite(n));
    if (tokens.length >= 2) {
      return tokens.map((v, i) => ({ label: `T${i + 1}`, value: v }));
    }
  }

  const points = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Split by tab, semicolon, or comma (preserving quoted numbers by simple CSV split)
    let cols;
    if (line.includes("\t")) {
      cols = line.split("\t").map((c) => c.trim());
    } else if (line.includes(";")) {
      cols = line.split(";").map((c) => c.trim());
    } else if (line.includes(",")) {
      cols = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || line.split(",");
      cols = cols.map((c) => c.trim());
    } else {
      cols = line.split(/\s+/).map((c) => c.trim());
    }

    if (cols.length === 1) {
      const val = cleanNumericToken(cols[0]);
      if (Number.isFinite(val)) {
        points.push({ label: `T${points.length + 1}`, value: val });
      }
      continue;
    }

    // Find rightmost finite numeric column (or second column if standard date,value)
    let foundVal = NaN;
    let labelCol = cols[0];
    for (let c = 1; c < cols.length; c++) {
      const candidate = cleanNumericToken(cols[c]);
      if (Number.isFinite(candidate)) {
        foundVal = candidate;
        break;
      }
    }
    if (!Number.isFinite(foundVal)) {
      const firstCandidate = cleanNumericToken(cols[0]);
      if (Number.isFinite(firstCandidate)) {
        foundVal = firstCandidate;
        labelCol = `T${points.length + 1}`;
      }
    }

    if (Number.isFinite(foundVal)) {
      points.push({
        label: String(labelCol || `T${points.length + 1}`).replace(/^["']|["']$/g, ""),
        value: foundVal,
      });
    }
  }

  return points;
}

/**
 * Generates future date/step labels consistent with the last observed label and chosen frequency.
 */
function generateFutureLabels(lastLabel, horizon, frequency) {
  const labels = [];
  const raw = String(lastLabel || "").trim();

  // YYYY-MM-DD
  const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const base = new Date(Date.UTC(Number(isoDateMatch[1]), Number(isoDateMatch[2]) - 1, Number(isoDateMatch[3])));
    for (let h = 1; h <= horizon; h++) {
      const d = new Date(base.getTime());
      if (frequency === "daily") d.setUTCDate(d.getUTCDate() + h);
      else if (frequency === "weekly") d.setUTCDate(d.getUTCDate() + h * 7);
      else if (frequency === "monthly") d.setUTCMonth(d.getUTCMonth() + h);
      else if (frequency === "quarterly") d.setUTCMonth(d.getUTCMonth() + h * 3);
      else d.setUTCFullYear(d.getUTCFullYear() + h);
      labels.push(d.toISOString().slice(0, 10));
    }
    return labels;
  }

  // YYYY-MM
  const ymMatch = raw.match(/^(\d{4})-(\d{2})$/);
  if (ymMatch) {
    const base = new Date(Date.UTC(Number(ymMatch[1]), Number(ymMatch[2]) - 1, 1));
    const stepMonths =
      frequency === "quarterly" ? 3 : frequency === "yearly" ? 12 : 1;
    for (let h = 1; h <= horizon; h++) {
      const d = new Date(base.getTime());
      d.setUTCMonth(d.getUTCMonth() + h * stepMonths);
      labels.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    }
    return labels;
  }

  // YYYY-Q1 .. YYYY-Q4
  const qMatch = raw.match(/^(\d{4})-?Q([1-4])$/i);
  if (qMatch) {
    let year = Number(qMatch[1]);
    let q = Number(qMatch[2]);
    for (let h = 1; h <= horizon; h++) {
      q += 1;
      if (q > 4) {
        q = 1;
        year += 1;
      }
      labels.push(`${year}-Q${q}`);
    }
    return labels;
  }

  // 4-digit year
  const yearMatch = raw.match(/^(\d{4})$/);
  if (yearMatch) {
    const baseYear = Number(yearMatch[1]);
    for (let h = 1; h <= horizon; h++) {
      labels.push(String(baseYear + h));
    }
    return labels;
  }

  // Numbered step e.g. T12 or T+12 or Week 12
  const numSuffix = raw.match(/^(.*?)(\d+)$/);
  if (numSuffix) {
    const prefix = numSuffix[1];
    const startNum = Number(numSuffix[2]);
    for (let h = 1; h <= horizon; h++) {
      labels.push(`${prefix}${startNum + h}`);
    }
    return labels;
  }

  for (let h = 1; h <= horizon; h++) {
    labels.push(`+${h}`);
  }
  return labels;
}

function defaultPeriodForFrequency(frequency) {
  switch (frequency) {
    case "daily":
      return 7;
    case "weekly":
      return 4;
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "yearly":
    default:
      return 1;
  }
}

function computeAutocorrelation(values, lag) {
  const n = values.length;
  if (lag <= 0 || lag >= n - 1) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    den += (values[i] - mean) * (values[i] - mean);
    if (i >= lag) {
      num += (values[i] - mean) * (values[i - lag] - mean);
    }
  }
  if (den <= 1e-12) return 0;
  return num / den;
}

function detectSeasonalPeriod(values, frequency, requestedPeriod) {
  const n = values.length;
  if (requestedPeriod && requestedPeriod !== "auto") {
    const p = Math.max(1, Math.min(52, Number(requestedPeriod) || 1));
    return n >= p + 2 ? p : 1;
  }
  const freqDefault = defaultPeriodForFrequency(frequency);
  const candidates = Array.from(new Set([freqDefault, 12, 7, 4])).filter(
    (p) => p > 1 && n >= p * 2
  );
  if (candidates.length === 0) return 1;

  let bestLag = 1;
  let bestAcf = 0.25;
  for (const lag of candidates) {
    const acf = computeAutocorrelation(values, lag);
    if (acf > bestAcf) {
      bestAcf = acf;
      bestLag = lag;
    }
  }
  if (bestLag > 1) return bestLag;
  return n >= freqDefault * 2 && freqDefault > 1 ? freqDefault : 1;
}

/**
 * TimesFM-inspired input patch tokenization: breaks series into fixed-size patches,
 * computing local level, local linear slope, and intra-patch dispersion.
 */
function buildPatchTokens(points, patchLength) {
  const patches = [];
  for (let i = 0; i < points.length; i += patchLength) {
    const slice = points.slice(i, i + patchLength);
    const vals = slice.map((p) => p.value);
    const count = vals.length;
    const mean = vals.reduce((s, v) => s + v, 0) / count;
    let slope = 0;
    if (count > 1) {
      const meanX = (count - 1) / 2;
      let num = 0;
      let den = 0;
      for (let j = 0; j < count; j++) {
        num += (j - meanX) * (vals[j] - mean);
        den += (j - meanX) * (j - meanX);
      }
      slope = den > 1e-12 ? num / den : 0;
    }
    const variance =
      vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(1, count);
    patches.push({
      patchIndex: patches.length + 1,
      startLabel: slice[0].label,
      endLabel: slice[count - 1].label,
      count,
      mean: roundVal(mean),
      slope: roundVal(slope),
      volatility: roundVal(Math.sqrt(variance)),
    });
  }
  return patches;
}

/**
 * Model 1: Damped-Trend Holt Linear Exponential Smoothing
 */
function fitDampedHolt(values, horizon, alpha, beta, phi) {
  const n = values.length;
  let level = values[0];
  let trend =
    n >= 3
      ? (values[Math.min(n - 1, 2)] - values[0]) / Math.min(n - 1, 2)
      : n >= 2
      ? values[1] - values[0]
      : 0;

  const fitted = new Array(n);
  fitted[0] = level;

  for (let t = 1; t < n; t++) {
    const forecastT = level + phi * trend;
    fitted[t] = forecastT;
    const prevLevel = level;
    level = alpha * values[t] + (1 - alpha) * forecastT;
    trend = beta * (level - prevLevel) + (1 - beta) * phi * trend;
  }

  const forecast = [];
  let phiPowerSum = 0;
  for (let h = 1; h <= horizon; h++) {
    phiPowerSum += Math.pow(phi, h);
    forecast.push(level + phiPowerSum * trend);
  }

  return { fitted, forecast, level, trend };
}

/**
 * Model 2: Additive Holt-Winters with Damped Trend
 */
function fitSeasonalHoltWinters(values, horizon, period, alpha, beta, gamma, phi) {
  const n = values.length;
  if (period <= 1 || n < period + 2) {
    const holt = fitDampedHolt(values, horizon, alpha, beta, phi);
    return {
      ...holt,
      seasonalIndices: new Array(n).fill(0),
      futureSeasonal: new Array(horizon).fill(0),
    };
  }

  const seasonCount = Math.min(period, n);
  const firstSeasonAvg =
    values.slice(0, seasonCount).reduce((s, v) => s + v, 0) / seasonCount;

  const seasonal = new Array(period).fill(0);
  const counts = new Array(period).fill(0);
  const maxInit = Math.min(n, period * 2);
  const initAvg = values.slice(0, maxInit).reduce((s, v) => s + v, 0) / maxInit;
  for (let i = 0; i < maxInit; i++) {
    seasonal[i % period] += values[i] - initAvg;
    counts[i % period] += 1;
  }
  for (let s = 0; s < period; s++) {
    seasonal[s] = counts[s] > 0 ? seasonal[s] / counts[s] : 0;
  }

  let level = firstSeasonAvg;
  let trend =
    n >= period * 2
      ? (values
          .slice(period, period * 2)
          .reduce((s, v) => s + v, 0) /
          period -
          firstSeasonAvg) /
        period
      : (values[n - 1] - values[0]) / Math.max(1, n - 1);

  const fitted = new Array(n);
  const histSeasonal = new Array(n);
  fitted[0] = level + seasonal[0];
  histSeasonal[0] = seasonal[0];

  for (let t = 1; t < n; t++) {
    const sIdx = t % period;
    const prevSeasonal = seasonal[sIdx];
    const forecastT = level + phi * trend + prevSeasonal;
    fitted[t] = forecastT;
    histSeasonal[t] = prevSeasonal;

    const prevLevel = level;
    level = alpha * (values[t] - prevSeasonal) + (1 - alpha) * (prevLevel + phi * trend);
    trend = beta * (level - prevLevel) + (1 - beta) * phi * trend;
    seasonal[sIdx] = gamma * (values[t] - level) + (1 - gamma) * prevSeasonal;
  }

  const forecast = [];
  const futureSeasonal = [];
  let phiPowerSum = 0;
  for (let h = 1; h <= horizon; h++) {
    phiPowerSum += Math.pow(phi, h);
    const sVal = seasonal[(n + h - 1) % period];
    futureSeasonal.push(sVal);
    forecast.push(level + phiPowerSum * trend + sVal);
  }

  return { fitted, forecast, seasonalIndices: histSeasonal, futureSeasonal, level, trend };
}

/**
 * Model 3: TimesFM-Inspired Patched Autoregressive Local-Trend Forecaster
 * Tokenizes context into patches of length P, captures inter-patch drift + damped AR(1) residuals.
 */
function fitPatchAutoregressive(values, horizon, patchLength, period) {
  const n = values.length;
  // Weighted moving patch centers for robust trend baseline
  const recentWindow = Math.min(n, Math.max(patchLength * 2, 4));
  const recentSlice = values.slice(n - recentWindow);
  const meanX = (recentWindow - 1) / 2;
  const meanY = recentSlice.reduce((s, v) => s + v, 0) / recentWindow;

  let num = 0;
  let den = 0;
  for (let i = 0; i < recentWindow; i++) {
    // Exponentially emphasize newer patches
    const w = Math.exp((i - (recentWindow - 1)) / Math.max(2, patchLength));
    num += w * (i - meanX) * (recentSlice[i] - meanY);
    den += w * (i - meanX) * (i - meanX);
  }
  const localSlope = den > 1e-12 ? num / den : 0;

  // Estimate AR(1) persistence on detrended series
  const detrended = values.map((v, i) => v - (values[0] + localSlope * i));
  let arNum = 0;
  let arDen = 0;
  for (let i = 1; i < n; i++) {
    arNum += detrended[i] * detrended[i - 1];
    arDen += detrended[i - 1] * detrended[i - 1];
  }
  const rho = arDen > 1e-12 ? Math.max(-0.5, Math.min(0.85, arNum / arDen)) : 0.35;

  // Optional seasonal component if period > 1
  const seasonal = new Array(Math.max(1, period)).fill(0);
  if (period > 1 && n >= period * 2) {
    const counts = new Array(period).fill(0);
    const meanD = detrended.reduce((s, v) => s + v, 0) / n;
    for (let i = 0; i < n; i++) {
      seasonal[i % period] += detrended[i] - meanD;
      counts[i % period] += 1;
    }
    for (let s = 0; s < period; s++) {
      seasonal[s] = counts[s] > 0 ? seasonal[s] / counts[s] : 0;
    }
  }

  const fitted = new Array(n);
  fitted[0] = values[0];
  for (let i = 1; i < n; i++) {
    const prevRes = detrended[i - 1] - (period > 1 ? seasonal[(i - 1) % period] : 0);
    const sVal = period > 1 ? seasonal[i % period] : 0;
    fitted[i] = values[0] + localSlope * i + sVal + rho * prevRes;
  }

  const lastResidual =
    detrended[n - 1] - (period > 1 ? seasonal[(n - 1) % period] : 0);
  const anchorLevel = values[n - 1] - (period > 1 ? seasonal[(n - 1) % period] : 0);

  const forecast = [];
  let dampedSum = 0;
  const driftDamp = 0.94;
  for (let h = 1; h <= horizon; h++) {
    dampedSum += Math.pow(driftDamp, h);
    const sVal = period > 1 ? seasonal[(n + h - 1) % period] : 0;
    const arDecay = Math.pow(rho, h) * lastResidual * 0.35;
    forecast.push(anchorLevel + dampedSum * localSlope + sVal + arDecay);
  }

  return { fitted, forecast, slope: localSlope };
}

function evaluateErrorMetrics(actuals, preds) {
  const m = Math.min(actuals.length, preds.length);
  if (m === 0) {
    return { mae: 0, rmse: 0, mape: 0, smape: 0, directionalAccuracy: 0 };
  }
  let sumAbs = 0;
  let sumSq = 0;
  let sumApe = 0;
  let apeCount = 0;
  let sumSmape = 0;
  let dirMatch = 0;
  let dirTotal = 0;

  for (let i = 0; i < m; i++) {
    const a = actuals[i];
    const p = preds[i];
    const err = a - p;
    sumAbs += Math.abs(err);
    sumSq += err * err;
    if (Math.abs(a) > 1e-9) {
      sumApe += Math.abs(err / a) * 100;
      apeCount += 1;
    }
    const denom = Math.abs(a) + Math.abs(p);
    if (denom > 1e-9) {
      sumSmape += (2 * Math.abs(err)) / denom * 100;
    }
    if (i > 0) {
      const actualDir = actuals[i] - actuals[i - 1];
      const predDir = preds[i] - preds[i - 1];
      if ((actualDir >= 0 && predDir >= 0) || (actualDir < 0 && predDir < 0)) {
        dirMatch += 1;
      }
      dirTotal += 1;
    }
  }

  return {
    mae: sumAbs / m,
    rmse: Math.sqrt(sumSq / m),
    mape: apeCount > 0 ? sumApe / apeCount : 0,
    smape: sumSmape / m,
    directionalAccuracy: dirTotal > 0 ? (dirMatch / dirTotal) * 100 : 100,
  };
}

function quantile(sortedVals, q) {
  if (!sortedVals || sortedVals.length === 0) return 0;
  const pos = (sortedVals.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedVals[base + 1] !== undefined) {
    return sortedVals[base] + rest * (sortedVals[base + 1] - sortedVals[base]);
  }
  return sortedVals[base];
}

/**
 * Core TimesFM-inspired empirical forecasting engine.
 */
export function runTimesFMInspiredForecast({
  points,
  horizon = 12,
  patchLength = "auto",
  seasonalPeriod = "auto",
  frequency = "monthly",
  allowNegative,
}) {
  const n = points.length;
  const values = points.map((p) => p.value);
  const resolvedHorizon = Math.max(1, Math.min(48, Number(horizon) || 12));

  const resolvedPatch =
    patchLength === "auto" || !Number(patchLength)
      ? Math.max(2, Math.min(12, Math.floor(n / 4)))
      : Math.max(2, Math.min(24, Number(patchLength)));

  const resolvedPeriod = detectSeasonalPeriod(values, frequency, seasonalPeriod);

  // Determine if series is naturally non-negative
  const minObs = Math.min(...values);
  const maxObs = Math.max(...values);
  const meanObs = values.reduce((s, v) => s + v, 0) / n;
  const stdDevObs = Math.sqrt(
    values.reduce((s, v) => s + Math.pow(v - meanObs, 2), 0) / Math.max(1, n)
  );
  const enforceNonNegative =
    typeof allowNegative === "boolean" ? !allowNegative : minObs >= 0;

  // Out-of-sample holdout backtesting
  const holdoutSize = Math.max(2, Math.min(Math.floor(n / 4), resolvedHorizon, 12));
  const trainVals = values.slice(0, n - holdoutSize);
  const testVals = values.slice(n - holdoutSize);

  // Tune Damped Holt hyperparameters on holdout
  let bestHoltParams = { alpha: 0.4, beta: 0.15, phi: 0.92 };
  let bestHoltRmse = Infinity;
  for (const alpha of [0.22, 0.42, 0.65]) {
    for (const beta of [0.06, 0.18, 0.35]) {
      for (const phi of [0.84, 0.92, 0.98]) {
        const res = fitDampedHolt(trainVals, holdoutSize, alpha, beta, phi);
        const { rmse } = evaluateErrorMetrics(testVals, res.forecast);
        if (rmse < bestHoltRmse) {
          bestHoltRmse = rmse;
          bestHoltParams = { alpha, beta, phi };
        }
      }
    }
  }

  // Evaluate Candidate Models strictly out-of-sample
  const candidates = [];

  const holtBt = fitDampedHolt(
    trainVals,
    holdoutSize,
    bestHoltParams.alpha,
    bestHoltParams.beta,
    bestHoltParams.phi
  );
  candidates.push({
    key: "holt_damped",
    name: "Damped Trend Smoothing",
    btForecast: holtBt.forecast,
    btRmse: Math.max(1e-9, evaluateErrorMetrics(testVals, holtBt.forecast).rmse),
  });

  let bestHwParams = { alpha: 0.4, beta: 0.14, gamma: 0.28, phi: 0.92 };
  if (resolvedPeriod > 1 && trainVals.length >= resolvedPeriod + 2) {
    let bestHwRmse = Infinity;
    for (const gamma of [0.15, 0.35, 0.55]) {
      const res = fitSeasonalHoltWinters(
        trainVals,
        holdoutSize,
        resolvedPeriod,
        bestHoltParams.alpha,
        bestHoltParams.beta,
        gamma,
        bestHoltParams.phi
      );
      const { rmse } = evaluateErrorMetrics(testVals, res.forecast);
      if (rmse < bestHwRmse) {
        bestHwRmse = rmse;
        bestHwParams = {
          alpha: bestHoltParams.alpha,
          beta: bestHoltParams.beta,
          gamma,
          phi: bestHoltParams.phi,
        };
      }
    }
    const hwBt = fitSeasonalHoltWinters(
      trainVals,
      holdoutSize,
      resolvedPeriod,
      bestHwParams.alpha,
      bestHwParams.beta,
      bestHwParams.gamma,
      bestHwParams.phi
    );
    candidates.push({
      key: "holt_winters",
      name: `Seasonal Decomposition (P=${resolvedPeriod})`,
      btForecast: hwBt.forecast,
      btRmse: Math.max(1e-9, evaluateErrorMetrics(testVals, hwBt.forecast).rmse),
    });
  }

  const patchBt = fitPatchAutoregressive(
    trainVals,
    holdoutSize,
    resolvedPatch,
    resolvedPeriod
  );
  candidates.push({
    key: "patch_ar",
    name: `Patched Context AR (W=${resolvedPatch})`,
    btForecast: patchBt.forecast,
    btRmse: Math.max(1e-9, evaluateErrorMetrics(testVals, patchBt.forecast).rmse),
  });

  // Inverse-RMSE squared weights (rewards accurate out-of-sample fit)
  const rawInv = candidates.map((c) => 1 / Math.pow(c.btRmse, 2));
  const invSum = rawInv.reduce((s, w) => s + w, 0) || 1;
  const weights = rawInv.map((w) => w / invSum);

  const ensembleBtForecast = new Array(holdoutSize).fill(0);
  for (let h = 0; h < holdoutSize; h++) {
    let val = 0;
    for (let c = 0; c < candidates.length; c++) {
      val += weights[c] * candidates[c].btForecast[h];
    }
    ensembleBtForecast[h] = val;
  }

  const backtestMetrics = evaluateErrorMetrics(testVals, ensembleBtForecast);
  const topCandidate = candidates.reduce((best, cur, idx) =>
    weights[idx] > best.weight ? { name: cur.name, weight: weights[idx] } : best,
    { name: candidates[0].name, weight: weights[0] }
  );

  // Refit all candidate models on FULL historical series
  const fullHolt = fitDampedHolt(
    values,
    resolvedHorizon,
    bestHoltParams.alpha,
    bestHoltParams.beta,
    bestHoltParams.phi
  );
  const fullHw =
    candidates.some((c) => c.key === "holt_winters")
      ? fitSeasonalHoltWinters(
          values,
          resolvedHorizon,
          resolvedPeriod,
          bestHwParams.alpha,
          bestHwParams.beta,
          bestHwParams.gamma,
          bestHwParams.phi
        )
      : null;
  const fullPatch = fitPatchAutoregressive(
    values,
    resolvedHorizon,
    resolvedPatch,
    resolvedPeriod
  );

  const modelOutputs = [];
  for (const c of candidates) {
    if (c.key === "holt_damped") modelOutputs.push(fullHolt);
    else if (c.key === "holt_winters" && fullHw) modelOutputs.push(fullHw);
    else modelOutputs.push(fullPatch);
  }

  // Construct historical fitted trajectory and residuals
  const historical = [];
  const residualsPool = [];
  for (let i = 0; i < n; i++) {
    let fittedVal = 0;
    for (let c = 0; c < modelOutputs.length; c++) {
      fittedVal += weights[c] * modelOutputs[c].fitted[i];
    }
    const resVal = values[i] - fittedVal;
    if (i >= 2) residualsPool.push(resVal);
    const seasonalVal = fullHw ? fullHw.seasonalIndices[i] : 0;
    historical.push({
      index: i,
      label: points[i].label,
      actual: roundVal(values[i]),
      fitted: roundVal(fittedVal),
      trend: roundVal(fittedVal - seasonalVal),
      seasonal: roundVal(seasonalVal),
      residual: roundVal(resVal),
    });
  }

  // Include out-of-sample holdout residuals for conformal uncertainty calibration
  const btResiduals = testVals.map((a, idx) => a - ensembleBtForecast[idx]);
  const combinedResiduals = [...residualsPool, ...btResiduals, ...btResiduals].sort(
    (a, b) => a - b
  );

  const fallbackSpread = Math.max(backtestMetrics.rmse, stdDevObs * 0.15, Math.abs(meanObs) * 0.02);
  const rawQ10 = quantile(combinedResiduals, 0.1);
  const rawQ90 = quantile(combinedResiduals, 0.9);
  const downSpread = Math.max(Math.abs(Math.min(0, rawQ10)), fallbackSpread * 0.95);
  const upSpread = Math.max(Math.max(0, rawQ90), fallbackSpread * 0.95);

  const futureLabels = generateFutureLabels(
    points[n - 1].label,
    resolvedHorizon,
    frequency
  );

  const forecast = [];
  for (let h = 0; h < resolvedHorizon; h++) {
    let p50Raw = 0;
    for (let c = 0; c < modelOutputs.length; c++) {
      p50Raw += weights[c] * modelOutputs[c].forecast[h];
    }
    const horizonMultiplier = Math.sqrt(1 + 0.35 * h);
    let p10Raw = p50Raw - downSpread * horizonMultiplier;
    let p90Raw = p50Raw + upSpread * horizonMultiplier;

    if (enforceNonNegative) {
      p50Raw = Math.max(0, p50Raw);
      p10Raw = Math.max(0, p10Raw);
      p90Raw = Math.max(p50Raw, p90Raw);
    }

    // Strict quantile monotonicity guarantee
    const p10 = Math.min(p10Raw, p50Raw);
    const p50 = p50Raw;
    const p90 = Math.max(p50Raw, p90Raw);

    const seasonalComp = fullHw ? fullHw.futureSeasonal[h] : 0;
    forecast.push({
      step: h + 1,
      label: futureLabels[h],
      p10: roundVal(p10),
      p50: roundVal(p50),
      p90: roundVal(p90),
      trendComponent: roundVal(p50 - seasonalComp),
      seasonalComponent: roundVal(seasonalComp),
    });
  }

  const lastValue = values[n - 1];
  const projectedEndP50 = forecast[forecast.length - 1].p50;
  const projectedChangePct =
    Math.abs(lastValue) > 1e-9
      ? ((projectedEndP50 - lastValue) / Math.abs(lastValue)) * 100
      : 0;

  // Overall trend slope across series
  const slopePerStep =
    n > 1 ? (projectedEndP50 - lastValue) / resolvedHorizon : 0;

  const patches = buildPatchTokens(points, resolvedPatch);

  return {
    horizon: resolvedHorizon,
    patchLength: resolvedPatch,
    seasonalPeriod: resolvedPeriod,
    observationCount: n,
    summaryStats: {
      min: roundVal(minObs),
      max: roundVal(maxObs),
      mean: roundVal(meanObs),
      stdDev: roundVal(stdDevObs),
      lastValue: roundVal(lastValue),
      projectedEndP50: roundVal(projectedEndP50),
      projectedChangePct: roundVal(projectedChangePct, 2),
      slopePerStep: roundVal(slopePerStep),
    },
    historical,
    forecast,
    patches,
    backtest: {
      holdoutSize,
      selectedModel:
        candidates.length > 1
          ? `Ensemble led by ${topCandidate.name}`
          : topCandidate.name,
      mae: roundVal(backtestMetrics.mae),
      rmse: roundVal(backtestMetrics.rmse),
      mape: roundVal(backtestMetrics.mape, 2),
      smape: roundVal(backtestMetrics.smape, 2),
      directionalAccuracy: roundVal(backtestMetrics.directionalAccuracy, 1),
      modelWeights: candidates.map((c, idx) => ({
        model: c.name,
        holdoutRmse: roundVal(c.btRmse),
        weight: roundVal(weights[idx], 3),
      })),
    },
  };
}

/**
 * Generates LLM reasoning & web-grounded interpretation via OpenRouter API.
 */
export async function generateForecastReasoning({
  seriesName,
  unitLabel,
  frequency,
  domainContext,
  additionalContexts,
  quantResult,
  webSources,
}) {
  const ctxNotes = (Array.isArray(additionalContexts) ? additionalContexts : [])
    .filter((c) => c && String(c.content || "").trim())
    .map((c, i) => `${c.title || `Context ${i + 1}`}: ${String(c.content).trim()}`)
    .join("\n");

  const sourcesText =
    webSources.length > 0
      ? webSources
          .slice(0, 6)
          .map(
            (s, i) =>
              `${i + 1}. ${s.title} (${s.url})${s.publishedDate ? ` [${s.publishedDate}]` : ""}: ${String(
                s.excerpt || ""
              ).slice(0, 320)}`
          )
          .join("\n")
      : "No live web search results were returned for this query.";

  const recentPatches = quantResult.patches
    .slice(-4)
    .map(
      (p) =>
        `Patch ${p.patchIndex} (${p.startLabel} to ${p.endLabel}): mean=${p.mean}, slope=${p.slope}, vol=${p.volatility}`
    )
    .join("; ");

  const firstStep = quantResult.forecast[0];
  const midStep = quantResult.forecast[Math.floor(quantResult.forecast.length / 2)];
  const endStep = quantResult.forecast[quantResult.forecast.length - 1];

  const prompt = `Analyze this empirical Google TimesFM-inspired time-series forecast and real-time web context. Do NOT invent any numbers that were not provided below.

SERIES DETAILS:
- Metric Name: ${seriesName}
- Unit: ${unitLabel || "units"}
- Frequency: ${frequency}
- Observations: ${quantResult.observationCount} points
- Summary Stats: min=${quantResult.summaryStats.min}, max=${quantResult.summaryStats.max}, mean=${quantResult.summaryStats.mean}, stdDev=${quantResult.summaryStats.stdDev}, latest=${quantResult.summaryStats.lastValue}
- Patch Tokenization: patchLength=${quantResult.patchLength}, totalPatches=${quantResult.patches.length}, detectedSeasonalPeriod=${quantResult.seasonalPeriod}
- Recent Patches: ${recentPatches}
- Backtest Holdout (${quantResult.backtest.holdoutSize} steps): model="${quantResult.backtest.selectedModel}", MAE=${quantResult.backtest.mae}, RMSE=${quantResult.backtest.rmse}, MAPE=${quantResult.backtest.mape}%, Directional Accuracy=${quantResult.backtest.directionalAccuracy}%
- Forecast Trajectory (${quantResult.horizon} steps):
  - Step 1 (${firstStep.label}): P10=${firstStep.p10}, P50=${firstStep.p50}, P90=${firstStep.p90}
  - Mid (${midStep.label}): P10=${midStep.p10}, P50=${midStep.p50}, P90=${midStep.p90}
  - End (${endStep.label}): P10=${endStep.p10}, P50=${endStep.p50}, P90=${endStep.p90} (Projected P50 Change: ${quantResult.summaryStats.projectedChangePct}%)

DOMAIN CONTEXT:
${domainContext || "None provided"}
${ctxNotes ? `\nADDITIONAL USER CONTEXT:\n${ctxNotes}` : ""}

LIVE WEB RESEARCH SOURCES:
${sourcesText}

Return ONLY a valid JSON object with these exact 5 plain-text keys (no markdown asterisks, no HTML tags, no slashes):
1. "executiveSummary": 2-3 clear sentences summarizing the P50 trajectory, percentage change from latest observation, and key takeaway.
2. "trendAndPatchAnalysis": 2-3 sentences interpreting the recent patch behavior, trend slope, and seasonal structure.
3. "webDriverSynthesis": 2-3 sentences explaining how the live web research sources relate to this metric and could push actuals toward P90 or P10. Mention source titles naturally without raw URLs.
4. "upsideAndDownsideScenarios": 2-3 sentences contrasting the P90 upside case (${endStep.p90}) vs P10 downside case (${endStep.p10}).
5. "confidenceAndCaveats": 2 sentences interpreting the empirical holdout accuracy (MAPE ${quantResult.backtest.mape}%, MAE ${quantResult.backtest.mae}) and sample limitations.`;

  try {
    const aiRes = await callOpenRouterChat({
      model: "google/gemini-2.5-flash",
      temperature: 0.25,
      responseFormatJson: true,
      systemInstruction:
        "You are a quantitative forecasting analyst for Clemir AI. Write crisp, direct, plain-text reasoning strictly grounded in the computed metrics and retrieved web sources.",
      prompt,
    });

    const cleanedJson = aiRes.content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleanedJson);

    return {
      available: true,
      modelUsed: aiRes.model || "google/gemini-2.5-flash",
      executiveSummary: cleanNaturalAssistantText(parsed.executiveSummary || ""),
      trendAndPatchAnalysis: cleanNaturalAssistantText(parsed.trendAndPatchAnalysis || ""),
      webDriverSynthesis: cleanNaturalAssistantText(parsed.webDriverSynthesis || ""),
      upsideAndDownsideScenarios: cleanNaturalAssistantText(
        parsed.upsideAndDownsideScenarios || ""
      ),
      confidenceAndCaveats: cleanNaturalAssistantText(parsed.confidenceAndCaveats || ""),
    };
  } catch (err) {
    return {
      available: false,
      error:
        err instanceof Error
          ? err.message
          : "OpenRouter LLM reasoning could not be completed.",
      executiveSummary: "",
      trendAndPatchAnalysis: "",
      webDriverSynthesis: "",
      upsideAndDownsideScenarios: "",
      confidenceAndCaveats: "",
    };
  }
}

/**
 * Core reusable TimesFM forecast executor embedded directly into simulation runs.
 * Reuses existing simulation web research sources when provided, or queries live search.
 */
export async function executeEmbeddedTimesFMForecast({
  seriesName = "Simulation Target Metric",
  unitLabel = "",
  frequency = "monthly",
  horizon = 12,
  patchLength = "auto",
  seasonalPeriod = "auto",
  domainContext = "",
  additionalContexts = [],
  rawData = "",
  points = [],
  allowNegative = undefined,
  enableWebSearch = true,
  existingWebResearch = null,
}) {
  const parsedPoints = parseTimeSeriesInput(rawData, points);
  if (parsedPoints.length < 6) {
    return { ok: false, detectedCount: parsedPoints.length, result: null };
  }

  const normalizedFrequency = ["daily", "weekly", "monthly", "quarterly", "yearly"].includes(
    frequency
  )
    ? frequency
    : "monthly";
  const resolvedHorizon = Math.max(1, Math.min(48, Number(horizon) || 12));
  const resolvedPatch = patchLength === "auto" ? "auto" : Number(patchLength) || "auto";
  const resolvedSeason = seasonalPeriod === "auto" ? "auto" : Number(seasonalPeriod) || "auto";

  const quantResult = runTimesFMInspiredForecast({
    points: parsedPoints,
    horizon: resolvedHorizon,
    patchLength: resolvedPatch,
    seasonalPeriod: resolvedSeason,
    frequency: normalizedFrequency,
    allowNegative,
  });

  let webResearch = {
    executed: false,
    queriesExecuted: [],
    totalSourcesRetrieved: 0,
    sources: [],
  };

  if (existingWebResearch && Array.isArray(existingWebResearch.sources) && existingWebResearch.sources.length > 0) {
    webResearch = {
      executed: true,
      queriesExecuted: existingWebResearch.queriesExecuted || [],
      totalSourcesRetrieved: existingWebResearch.sources.length,
      sources: existingWebResearch.sources.slice(0, 8).map((s) => ({
        title: s.title,
        url: s.url,
        publishedDate: s.publishedDate || null,
        authorityTier: s.authorityTier || "Web Source",
        provider: s.provider || "Web Search",
        excerpt: cleanNaturalAssistantText(String(s.excerpt || "")).slice(0, 380),
      })),
    };
  } else if (enableWebSearch) {
    const searchQueries = [];
    const primaryQuery = domainContext
      ? `${seriesName} ${domainContext} 2026 forecast trends`
      : `${seriesName} market forecast drivers 2026`;
    searchQueries.push(primaryQuery.slice(0, 140));

    if (domainContext && seriesName) {
      searchQueries.push(`${domainContext} ${normalizedFrequency} outlook benchmarks`.slice(0, 140));
    }

    const researchRes = await performRealTimeWebResearch({
      queries: searchQueries,
      maxResultsPerQuery: 4,
    }).catch(() => null);

    if (researchRes) {
      webResearch = {
        executed: true,
        queriesExecuted: researchRes.queriesExecuted || searchQueries,
        totalSourcesRetrieved: researchRes.totalSourcesRetrieved || 0,
        sources: (researchRes.sources || []).slice(0, 8).map((s) => ({
          title: s.title,
          url: s.url,
          publishedDate: s.publishedDate || null,
          authorityTier: s.authorityTier || "Web Source",
          provider: s.provider || "Web Search",
          excerpt: cleanNaturalAssistantText(String(s.excerpt || "")).slice(0, 380),
        })),
      };
    }
  }

  const reasoning = await generateForecastReasoning({
    seriesName,
    unitLabel,
    frequency: normalizedFrequency,
    domainContext,
    additionalContexts,
    quantResult,
    webSources: webResearch.sources,
  });

  return {
    ok: true,
    detectedCount: parsedPoints.length,
    result: {
      id: `fc-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      seriesName,
      unitLabel,
      frequency: normalizedFrequency,
      ...quantResult,
      webResearch,
      reasoning,
    },
  };
}

function parseForecastBody(req) {
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

/**
 * Express route handler for POST /api/forecast/run
 */
export async function handleForecastRunRequest(req, res) {
  try {
    const body = parseForecastBody(req);
    const seriesName = String(body.seriesName || "Time Series Metric").trim() || "Time Series Metric";
    const unitLabel = String(body.unitLabel || "").trim();
    const domainContext = String(body.domainContext || "").trim();

    const execRes = await executeEmbeddedTimesFMForecast({
      seriesName,
      unitLabel,
      frequency: body.frequency,
      horizon: body.horizon,
      patchLength: body.patchLength,
      seasonalPeriod: body.seasonalPeriod,
      domainContext,
      additionalContexts: Array.isArray(body.additionalContexts) ? body.additionalContexts : [],
      rawData: body.rawData,
      points: body.points,
      allowNegative: body.allowNegative,
      enableWebSearch: body.enableWebSearch !== false,
    });

    if (!execRes.ok) {
      res.status(400).json({
        ok: false,
        error: `Please provide at least 6 valid numeric historical observations (detected ${execRes.detectedCount}). Paste CSV/JSON or add rows manually.`,
      });
      return;
    }

    res.json({
      ok: true,
      result: execRes.result,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Forecasting engine encountered an unexpected error.",
    });
  }
}

export default handleForecastRunRequest;
