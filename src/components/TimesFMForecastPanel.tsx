import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Download,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
} from 'lucide-react';
import {
  ForecastFrequency,
  Simulation,
  TimesFMForecastResult,
  TimeSeriesPointInput,
} from '../types/clamir.ts';

interface TimesFMForecastPanelProps {
  simulation: Simulation;
  authToken: string;
  onSimulationUpdated: (sim: Simulation) => void;
}

function formatNum(val: number): string {
  if (!Number.isFinite(val)) return '0';
  const abs = Math.abs(val);
  if (abs >= 10000) {
    return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  if (abs >= 100) {
    return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return val.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export const TimesFMForecastPanel: React.FC<TimesFMForecastPanelProps> = ({
  simulation,
  authToken,
  onSimulationUpdated,
}) => {
  const forecast = simulation.results?.timesfmForecast || null;
  const existingCfg = simulation.forecastConfig;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editingSeries, setEditingSeries] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [showFittedLine, setShowFittedLine] = useState<boolean>(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Inline series attachment / re-run form (strictly empty unless editing existing saved user config)
  const [seriesName, setSeriesName] = useState<string>(existingCfg?.seriesName || '');
  const [unitLabel, setUnitLabel] = useState<string>(existingCfg?.unitLabel || '');
  const [frequency, setFrequency] = useState<ForecastFrequency>(
    existingCfg?.frequency || 'monthly'
  );
  const [horizon, setHorizon] = useState<number>(existingCfg?.horizon || 12);
  const [patchLength, setPatchLength] = useState<string>(
    existingCfg?.patchLength !== undefined ? String(existingCfg.patchLength) : 'auto'
  );
  const [seasonalPeriod, setSeasonalPeriod] = useState<string>(
    existingCfg?.seasonalPeriod !== undefined ? String(existingCfg.seasonalPeriod) : 'auto'
  );
  const [inputMode, setInputMode] = useState<'text' | 'table'>('text');
  const [rawData, setRawData] = useState<string>(existingCfg?.rawData || '');
  const [manualPoints, setManualPoints] = useState<{ label: string; value: string }[]>(
    existingCfg?.points && existingCfg.points.length >= 6
      ? existingCfg.points.map((p) => ({
          label: p.label || '',
          value: String(p.value ?? ''),
        }))
      : [
          { label: '', value: '' },
          { label: '', value: '' },
          { label: '', value: '' },
          { label: '', value: '' },
          { label: '', value: '' },
          { label: '', value: '' },
        ]
  );

  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      setInputMode('text');
      setRawData(content);
      if (!seriesName.trim()) {
        setSeriesName(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '));
      }
      setErrorMsg('');
    } catch {
      setErrorMsg('Unable to read the selected file.');
    }
    e.target.value = '';
  };

  const handleRunEmbeddedForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    let pointsPayload: TimeSeriesPointInput[] | undefined;
    if (inputMode === 'table') {
      pointsPayload = manualPoints
        .map((row, idx) => ({
          label: row.label.trim() || `T${idx + 1}`,
          value: Number(row.value.replace(/[$€£¥,%\s]/g, '')),
        }))
        .filter((p) => Number.isFinite(p.value));

      if (pointsPayload.length < 6) {
        setErrorMsg('Enter at least 6 valid numeric points in the table before running.');
        return;
      }
    } else if (!rawData.trim()) {
      setErrorMsg('Paste historical observations (CSV, JSON, or numeric values) or upload a file.');
      return;
    }

    setRunning(true);
    try {
      const payload = {
        seriesName: seriesName.trim() || `${simulation.name} Core Metric`,
        unitLabel: unitLabel.trim(),
        frequency,
        horizon,
        patchLength,
        seasonalPeriod,
        domainContext: [simulation.researchContext, simulation.hypothesis, simulation.targetAudience]
          .filter(Boolean)
          .join(' | '),
        rawData: inputMode === 'text' ? rawData : undefined,
        points: inputMode === 'table' ? pointsPayload : undefined,
        enableWebSearch: true,
      };

      let updatedSim: Simulation | null = null;
      let errText = '';

      const res = await fetch(`/api/simulations/${encodeURIComponent(simulation.id)}/forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (res) {
        const text = await res.text().catch(() => '');
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }
        if (res.ok && data?.ok && data?.simulation) {
          updatedSim = data.simulation as Simulation;
        } else if (res.ok && data?.ok && data?.result) {
          updatedSim = {
            ...simulation,
            forecastConfig: {
              enabled: true,
              seriesName: payload.seriesName,
              unitLabel: payload.unitLabel,
              frequency: payload.frequency,
              horizon: payload.horizon,
              patchLength: payload.patchLength,
              seasonalPeriod: payload.seasonalPeriod,
              rawData: payload.rawData,
              points: payload.points,
            },
            results: simulation.results
              ? { ...simulation.results, timesfmForecast: data.result as TimesFMForecastResult }
              : undefined,
          };
        } else if (data?.error && res.status !== 404 && res.status !== 405) {
          errText = data.error;
        }
      }

      if (!updatedSim && !errText) {
        const fbRes = await fetch('/api/forecast/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => null);

        if (fbRes) {
          const fbText = await fbRes.text().catch(() => '');
          let fbData: any = null;
          try {
            fbData = fbText ? JSON.parse(fbText) : null;
          } catch {
            fbData = null;
          }
          if (fbRes.ok && fbData?.ok && fbData?.result) {
            updatedSim = {
              ...simulation,
              forecastConfig: {
                enabled: true,
                seriesName: payload.seriesName,
                unitLabel: payload.unitLabel,
                frequency: payload.frequency,
                horizon: payload.horizon,
                patchLength: payload.patchLength,
                seasonalPeriod: payload.seasonalPeriod,
                rawData: payload.rawData,
                points: payload.points,
              },
              results: simulation.results
                ? { ...simulation.results, timesfmForecast: fbData.result as TimesFMForecastResult }
                : undefined,
            };
          } else {
            errText = fbData?.error || 'Could not generate TimesFM forecast from the provided observations.';
          }
        }
      }

      if (!updatedSim) {
        setErrorMsg(errText || 'Could not generate TimesFM forecast from the provided observations.');
        return;
      }

      onSimulationUpdated(updatedSim);
      setEditingSeries(false);
      setHoverIndex(null);
    } catch {
      setErrorMsg('Unable to contact the TimesFM simulation engine. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const handleExportCsv = (fc: TimesFMForecastResult) => {
    const rows = [
      ['Phase', 'Label', 'Actual', 'Fitted', 'P10', 'P50', 'P90'].join(','),
      ...fc.historical.map((h) =>
        ['Historical', `"${h.label}"`, h.actual, h.fitted, '', '', ''].join(',')
      ),
      ...fc.forecast.map((f) =>
        ['Forecast', `"${f.label}"`, '', '', f.p10, f.p50, f.p90].join(',')
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fc.seriesName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-timesfm.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = (fc: TimesFMForecastResult) => {
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fc.seriesName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-timesfm.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartGeom = useMemo(() => {
    if (!forecast) return null;
    const hist = forecast.historical;
    const fut = forecast.forecast;
    const totalPts = hist.length + fut.length;
    if (totalPts === 0) return null;

    const allVals: number[] = [];
    for (const h of hist) {
      allVals.push(h.actual);
      if (showFittedLine) allVals.push(h.fitted);
    }
    for (const f of fut) {
      allVals.push(f.p10, f.p50, f.p90);
    }

    let minY = Math.min(...allVals);
    let maxY = Math.max(...allVals);
    if (Math.abs(maxY - minY) < 1e-6) {
      minY -= 1;
      maxY += 1;
    } else {
      const pad = (maxY - minY) * 0.1;
      minY -= pad;
      maxY += pad;
    }

    const W = 880;
    const H = 290;
    const padL = 68;
    const padR = 24;
    const padT = 22;
    const padB = 38;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const xAt = (idx: number) =>
      totalPts === 1 ? padL + plotW / 2 : padL + (idx / (totalPts - 1)) * plotW;
    const yAt = (val: number) => padT + ((maxY - val) / (maxY - minY)) * plotH;

    const histPath = hist
      .map((h, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(2)} ${yAt(h.actual).toFixed(2)}`)
      .join(' ');

    const fittedPath = hist
      .map((h, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(2)} ${yAt(h.fitted).toFixed(2)}`)
      .join(' ');

    const lastHistIdx = hist.length - 1;
    const lastHistVal = hist[lastHistIdx]?.actual ?? 0;

    const p50Path = [
      `M ${xAt(lastHistIdx).toFixed(2)} ${yAt(lastHistVal).toFixed(2)}`,
      ...fut.map(
        (f, i) => `L ${xAt(hist.length + i).toFixed(2)} ${yAt(f.p50).toFixed(2)}`
      ),
    ].join(' ');

    const upperPoints = [
      `${xAt(lastHistIdx).toFixed(2)},${yAt(lastHistVal).toFixed(2)}`,
      ...fut.map((f, i) => `${xAt(hist.length + i).toFixed(2)},${yAt(f.p90).toFixed(2)}`),
    ];
    const lowerPoints = [
      ...fut
        .slice()
        .reverse()
        .map((f, i) => {
          const idx = hist.length + (fut.length - 1 - i);
          return `${xAt(idx).toFixed(2)},${yAt(f.p10).toFixed(2)}`;
        }),
      `${xAt(lastHistIdx).toFixed(2)},${yAt(lastHistVal).toFixed(2)}`,
    ];
    const bandPolygon = [...upperPoints, ...lowerPoints].join(' ');

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const val = minY + t * (maxY - minY);
      return { val, y: yAt(val) };
    });

    const combinedLabels = [...hist.map((h) => h.label), ...fut.map((f) => f.label)];
    const splitX = xAt(lastHistIdx);

    return {
      W,
      H,
      padL,
      padR,
      padT,
      padB,
      plotW,
      plotH,
      totalPts,
      xAt,
      yAt,
      histPath,
      fittedPath,
      p50Path,
      bandPolygon,
      yTicks,
      combinedLabels,
      splitX,
    };
  }, [forecast, showFittedLine]);

  const renderInlineSeriesForm = () => (
    <form
      onSubmit={handleRunEmbeddedForecast}
      className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[#111827] mb-1">
            Target Metric Name
          </label>
          <input
            type="text"
            value={seriesName}
            onChange={(e) => setSeriesName(e.target.value)}
            placeholder="e.g., Monthly ARR or Conversion Rate"
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000] placeholder:text-[#9CA3AF]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#111827] mb-1">
            Unit Label
          </label>
          <input
            type="text"
            value={unitLabel}
            onChange={(e) => setUnitLabel(e.target.value)}
            placeholder="e.g., USD, orders, %"
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000] placeholder:text-[#9CA3AF]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#111827] mb-1">
            Frequency
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as ForecastFrequency)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#111827] mb-1">
            Horizon: <span className="font-mono tabular-nums">{horizon} steps</span>
          </label>
          <input
            type="range"
            min={2}
            max={36}
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="w-full accent-[#000000] cursor-pointer mt-1.5"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[#111827] mb-1">
            Input Patch Length
          </label>
          <select
            value={patchLength}
            onChange={(e) => setPatchLength(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
          >
            <option value="auto">Auto (Adaptive)</option>
            <option value="2">2 steps / patch</option>
            <option value="4">4 steps / patch</option>
            <option value="8">8 steps / patch</option>
            <option value="12">12 steps / patch</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#111827] mb-1">
            Seasonal Period
          </label>
          <select
            value={seasonalPeriod}
            onChange={(e) => setSeasonalPeriod(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
          >
            <option value="auto">Auto-Detect (ACF)</option>
            <option value="1">None (1)</option>
            <option value="4">Quarterly / Monthly (4)</option>
            <option value="7">Weekly Cycle (7)</option>
            <option value="12">Annual Cycle (12)</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-semibold text-[#111827]">
            Historical Observations (Minimum 6 numeric points)
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`px-2 py-1 text-[11px] font-medium rounded border cursor-pointer ${
                inputMode === 'text'
                  ? 'bg-[#000000] text-white border-[#000000]'
                  : 'bg-white text-[#6B7280] border-[#E5E7EB]'
              }`}
            >
              CSV / JSON
            </button>
            <button
              type="button"
              onClick={() => setInputMode('table')}
              className={`px-2 py-1 text-[11px] font-medium rounded border cursor-pointer ${
                inputMode === 'table'
                  ? 'bg-[#000000] text-white border-[#000000]'
                  : 'bg-white text-[#6B7280] border-[#E5E7EB]'
              }`}
            >
              Point Table
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.json,.tsv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded hover:border-[#000000] cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>Upload</span>
            </button>
          </div>
        </div>

        {inputMode === 'text' ? (
          <textarea
            rows={5}
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            placeholder={`Paste CSV date,value rows, comma numbers, or JSON array (min 6 points).\nExample format:\n2025-07, 41200\n2025-08, 42850\n2025-09, 44100\n2025-10, 46900\n2025-11, 48300\n2025-12, 51200`}
            className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000] placeholder:text-[#9CA3AF]"
          />
        ) : (
          <div className="border border-[#E5E7EB] rounded-md p-2.5 space-y-2 max-h-48 overflow-y-auto bg-white">
            {manualPoints.map((pt, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={pt.label}
                  onChange={(e) =>
                    setManualPoints((prev) =>
                      prev.map((row, i) => (i === idx ? { ...row, label: e.target.value } : row))
                    )
                  }
                  placeholder={`Period ${idx + 1}`}
                  className="w-32 px-2 py-1 text-xs font-mono bg-white border border-[#E5E7EB] rounded placeholder:text-[#9CA3AF]"
                />
                <input
                  type="text"
                  value={pt.value}
                  onChange={(e) =>
                    setManualPoints((prev) =>
                      prev.map((row, i) => (i === idx ? { ...row, value: e.target.value } : row))
                    )
                  }
                  placeholder="Numeric value"
                  className="flex-1 px-2 py-1 text-xs font-mono bg-white border border-[#E5E7EB] rounded placeholder:text-[#9CA3AF]"
                />
                {manualPoints.length > 6 && (
                  <button
                    type="button"
                    onClick={() =>
                      setManualPoints((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="p-1 text-[#6B7280] hover:text-red-600 cursor-pointer"
                    title="Remove row"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setManualPoints((prev) => [...prev, { label: '', value: '' }])}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#111827] hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Observation Row</span>
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {editingSeries && (
          <button
            type="button"
            onClick={() => setEditingSeries(false)}
            className="px-3.5 py-2 text-xs font-medium text-[#111827] bg-white border border-[#E5E7EB] rounded-md cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={running}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 disabled:opacity-60 cursor-pointer"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>
            {running
              ? 'Computing TimesFM Projection...'
              : forecast
              ? 'Update TimesFM Forecast'
              : 'Generate Embedded TimesFM Forecast'}
          </span>
        </button>
      </div>
    </form>
  );

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3.5">
        <div>
          <span className="text-xs font-mono text-[#6B7280]">
            TIMESFM QUANTILE ENGINE · INTEGRATED SIMULATION ARCHITECTURE
          </span>
          <h2 className="text-base font-bold text-[#111827] flex items-center gap-2 mt-0.5">
            <TrendingUp className="w-4 h-4" />
            <span>
              {forecast
                ? `Time-Series Forecast — ${forecast.seriesName}`
                : 'Embedded TimesFM Time-Series Forecast'}
            </span>
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {forecast && (
            <>
              <button
                type="button"
                onClick={() => handleExportCsv(forecast)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded hover:border-[#000000] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Forecast CSV</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportJson(forecast)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded hover:border-[#000000] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingSeries((prev) => !prev)}
                className="px-3 py-1.5 text-xs font-semibold text-[#111827] bg-white border border-[#E5E7EB] rounded hover:border-[#000000] cursor-pointer"
              >
                {editingSeries ? 'Close Editor' : 'Update Series Data'}
              </button>
            </>
          )}
        </div>
      </div>

      {!forecast ? (
        <div className="space-y-3">
          <p className="text-xs text-[#6B7280]">
            No historical time-series was attached during simulation setup. Attach at least 6 empirical observations below to run the embedded TimesFM patched quantile engine and incorporate P10/P50/P90 projections directly into this simulation.
          </p>
          {renderInlineSeriesForm()}
        </div>
      ) : (
        <div className="space-y-5">
          {editingSeries && renderInlineSeriesForm()}

          {/* 4 Metric Telemetry Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
              <span className="text-[11px] font-mono text-[#6B7280] uppercase block">
                End P50 ({forecast.forecast[forecast.forecast.length - 1]?.label})
              </span>
              <span className="mt-1 block text-lg font-bold font-mono text-[#111827] tabular-nums">
                {formatNum(forecast.summaryStats.projectedEndP50)}{' '}
                <span className="text-xs font-normal text-[#6B7280]">{forecast.unitLabel}</span>
              </span>
              <span
                className={`text-[11px] font-mono tabular-nums ${
                  forecast.summaryStats.projectedChangePct >= 0
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                }`}
              >
                {forecast.summaryStats.projectedChangePct >= 0 ? '+' : ''}
                {forecast.summaryStats.projectedChangePct}% vs latest
              </span>
            </div>

            <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
              <span className="text-[11px] font-mono text-[#6B7280] uppercase block">
                Holdout MAPE ({forecast.backtest.holdoutSize} pts)
              </span>
              <span className="mt-1 block text-lg font-bold font-mono text-[#111827] tabular-nums">
                {forecast.backtest.mape}%
              </span>
              <span className="text-[11px] font-mono text-[#6B7280] tabular-nums">
                MAE: {formatNum(forecast.backtest.mae)}
              </span>
            </div>

            <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
              <span className="text-[11px] font-mono text-[#6B7280] uppercase block">
                RMSE / Directional Acc
              </span>
              <span className="mt-1 block text-lg font-bold font-mono text-[#111827] tabular-nums">
                {formatNum(forecast.backtest.rmse)}
              </span>
              <span className="text-[11px] font-mono text-[#6B7280] tabular-nums">
                {forecast.backtest.directionalAccuracy}% directional match
              </span>
            </div>

            <div className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
              <span className="text-[11px] font-mono text-[#6B7280] uppercase block">
                Patch / Seasonality
              </span>
              <span className="mt-1 block text-lg font-bold font-mono text-[#111827] tabular-nums">
                P={forecast.patchLength} · S={forecast.seasonalPeriod}
              </span>
              <span className="text-[11px] font-mono text-[#6B7280] truncate block">
                {forecast.patches.length} context patches · {forecast.frequency}
              </span>
            </div>
          </div>

          {/* Interactive SVG Quantile Chart */}
          <div className="border border-[#E5E7EB] rounded-lg p-4 space-y-3 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] font-mono text-[#6B7280]">
                {forecast.backtest.selectedModel} · {forecast.observationCount} actuals → +
                {forecast.horizon} {forecast.frequency} steps
              </p>

              <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-[#111827]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#000000] inline-block" /> Actual
                </span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFittedLine}
                    onChange={(e) => setShowFittedLine(e.target.checked)}
                    className="accent-[#6B7280]"
                  />
                  <span className="w-3 h-0.5 border-t border-dashed border-[#6B7280] inline-block" />
                  <span>Fitted</span>
                </label>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#2563EB] inline-block" /> P50 Median
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-2.5 bg-[#2563EB]/20 border border-[#2563EB]/40 inline-block rounded-xs" />{' '}
                  P10–P90 Band
                </span>
              </div>
            </div>

            {/* Probe HUD */}
            <div className="min-h-[24px] px-3 py-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[11px] font-mono text-[#111827] flex flex-wrap items-center justify-between gap-2 tabular-nums">
              {hoverIndex !== null && chartGeom ? (
                hoverIndex < forecast.historical.length ? (
                  (() => {
                    const pt = forecast.historical[hoverIndex];
                    return (
                      <>
                        <span>
                          Historical · <strong>{pt.label}</strong>
                        </span>
                        <span>
                          Actual: <strong>{formatNum(pt.actual)}</strong> · Fitted:{' '}
                          {formatNum(pt.fitted)} · Residual: {pt.residual >= 0 ? '+' : ''}
                          {formatNum(pt.residual)}
                        </span>
                      </>
                    );
                  })()
                ) : (
                  (() => {
                    const fPt = forecast.forecast[hoverIndex - forecast.historical.length];
                    if (!fPt) return null;
                    return (
                      <>
                        <span>
                          Forecast +{fPt.step} · <strong>{fPt.label}</strong>
                        </span>
                        <span>
                          P10: {formatNum(fPt.p10)} · <strong>P50: {formatNum(fPt.p50)}</strong> · P90:{' '}
                          {formatNum(fPt.p90)}
                        </span>
                      </>
                    );
                  })()
                )
              ) : (
                <span className="text-[#6B7280]">
                  Hover across the curve to inspect empirical residuals and P10 / P50 / P90 confidence bounds.
                </span>
              )}
            </div>

            {chartGeom && (
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartGeom.W} ${chartGeom.H}`}
                  className="w-full min-w-[520px] h-auto select-none cursor-crosshair"
                  onMouseLeave={() => setHoverIndex(null)}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relX = ((e.clientX - rect.left) / rect.width) * chartGeom.W;
                    const clamped = Math.max(
                      chartGeom.padL,
                      Math.min(chartGeom.W - chartGeom.padR, relX)
                    );
                    const ratio = (clamped - chartGeom.padL) / Math.max(1, chartGeom.plotW);
                    const idx = Math.round(ratio * (chartGeom.totalPts - 1));
                    setHoverIndex(Math.max(0, Math.min(chartGeom.totalPts - 1, idx)));
                  }}
                >
                  {chartGeom.yTicks.map((tick, i) => (
                    <g key={i}>
                      <line
                        x1={chartGeom.padL}
                        x2={chartGeom.W - chartGeom.padR}
                        y1={tick.y}
                        y2={tick.y}
                        stroke="#E5E7EB"
                        strokeWidth="1"
                      />
                      <text
                        x={chartGeom.padL - 8}
                        y={tick.y + 3.5}
                        textAnchor="end"
                        fontSize="10"
                        fontFamily="monospace"
                        fill="#6B7280"
                      >
                        {formatNum(tick.val)}
                      </text>
                    </g>
                  ))}

                  <line
                    x1={chartGeom.splitX}
                    x2={chartGeom.splitX}
                    y1={chartGeom.padT}
                    y2={chartGeom.H - chartGeom.padB}
                    stroke="#9CA3AF"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />

                  <polygon points={chartGeom.bandPolygon} fill="#2563EB" fillOpacity="0.14" />

                  {showFittedLine && (
                    <path
                      d={chartGeom.fittedPath}
                      fill="none"
                      stroke="#6B7280"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}

                  <path d={chartGeom.histPath} fill="none" stroke="#000000" strokeWidth="2.2" />
                  <path d={chartGeom.p50Path} fill="none" stroke="#2563EB" strokeWidth="2.2" />

                  {forecast.historical.map((h, i) => (
                    <circle
                      key={`h-${i}`}
                      cx={chartGeom.xAt(i)}
                      cy={chartGeom.yAt(h.actual)}
                      r={hoverIndex === i ? 4.5 : 2.1}
                      fill="#000000"
                    />
                  ))}
                  {forecast.forecast.map((f, i) => {
                    const idx = forecast.historical.length + i;
                    return (
                      <circle
                        key={`f-${i}`}
                        cx={chartGeom.xAt(idx)}
                        cy={chartGeom.yAt(f.p50)}
                        r={hoverIndex === idx ? 4.5 : 2.3}
                        fill="#2563EB"
                      />
                    );
                  })}

                  {hoverIndex !== null && (
                    <line
                      x1={chartGeom.xAt(hoverIndex)}
                      x2={chartGeom.xAt(hoverIndex)}
                      y1={chartGeom.padT}
                      y2={chartGeom.H - chartGeom.padB}
                      stroke="#111827"
                      strokeWidth="1"
                      strokeOpacity="0.45"
                    />
                  )}

                  {(() => {
                    const maxLabels = 7;
                    const step = Math.max(
                      1,
                      Math.ceil((chartGeom.totalPts - 1) / (maxLabels - 1))
                    );
                    const indices = [];
                    for (let i = 0; i < chartGeom.totalPts; i += step) {
                      indices.push(i);
                    }
                    if (indices[indices.length - 1] !== chartGeom.totalPts - 1) {
                      indices.push(chartGeom.totalPts - 1);
                    }
                    return indices.map((idx) => (
                      <text
                        key={`lbl-${idx}`}
                        x={chartGeom.xAt(idx)}
                        y={chartGeom.H - 14}
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="monospace"
                        fill="#6B7280"
                      >
                        {chartGeom.combinedLabels[idx]}
                      </text>
                    ));
                  })()}
                </svg>
              </div>
            )}
          </div>

          {/* LLM Forecast Interpretation */}
          <div className="p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>TimesFM Forecast Reasoning</span>
              </h3>
              {forecast.reasoning.modelUsed && (
                <span className="text-[11px] font-mono text-[#6B7280]">
                  {forecast.reasoning.modelUsed}
                </span>
              )}
            </div>

            {!forecast.reasoning.available ? (
              <p className="text-xs text-[#6B7280]">
                Narrative forecast interpretation unavailable ({forecast.reasoning.error || 'LLM key inactive'}). Empirical patch quantiles and backtest accuracy remain verified above.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-[#111827]">
                <div className="p-3 bg-white border border-[#E5E7EB] rounded">
                  <span className="font-mono text-[10px] font-semibold text-[#6B7280] uppercase block mb-1">
                    Trajectory Summary
                  </span>
                  <p>{forecast.reasoning.executiveSummary}</p>
                </div>
                <div className="p-3 bg-white border border-[#E5E7EB] rounded">
                  <span className="font-mono text-[10px] font-semibold text-[#6B7280] uppercase block mb-1">
                    Patch &amp; Seasonality Dynamics
                  </span>
                  <p>{forecast.reasoning.trendAndPatchAnalysis}</p>
                </div>
                <div className="p-3 bg-white border border-[#E5E7EB] rounded">
                  <span className="font-mono text-[10px] font-semibold text-[#6B7280] uppercase block mb-1">
                    External Web Driver Alignment
                  </span>
                  <p>{forecast.reasoning.webDriverSynthesis}</p>
                </div>
                <div className="p-3 bg-white border border-[#E5E7EB] rounded">
                  <span className="font-mono text-[10px] font-semibold text-[#6B7280] uppercase block mb-1">
                    P90 Upside vs P10 Downside
                  </span>
                  <p>{forecast.reasoning.upsideAndDownsideScenarios}</p>
                </div>
              </div>
            )}
          </div>

          {/* Toggle for Patch Grid & Full Step Table */}
          <div>
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111827] hover:underline cursor-pointer"
            >
              {showDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              <span>
                {showDetails
                  ? 'Hide Patch Tokenization & Quantile Schedule'
                  : `Inspect Patch Tokenization (${forecast.patches.length} patches) & Quantile Schedule (${forecast.forecast.length} steps)`}
              </span>
            </button>

            {showDetails && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {forecast.patches.map((patch) => (
                    <div
                      key={patch.patchIndex}
                      className="p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs font-mono tabular-nums"
                    >
                      <div className="text-[10px] text-[#6B7280] flex justify-between">
                        <span>Patch #{patch.patchIndex}</span>
                        <span>n={patch.count}</span>
                      </div>
                      <div className="text-[11px] text-[#111827] truncate mt-0.5">
                        {patch.startLabel} → {patch.endLabel}
                      </div>
                      <div className="mt-1 text-xs font-bold text-[#111827]">
                        μ {formatNum(patch.mean)}
                      </div>
                      <div className="text-[10px] text-[#6B7280]">
                        slope {patch.slope >= 0 ? '+' : ''}
                        {formatNum(patch.slope)} · σ {formatNum(patch.volatility)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border border-[#E5E7EB] rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB] font-mono text-[11px] text-[#6B7280]">
                      <tr>
                        <th className="py-2 px-4">Step</th>
                        <th className="py-2 px-4">Period</th>
                        <th className="py-2 px-4 text-right">P10 (Low)</th>
                        <th className="py-2 px-4 text-right">P50 (Median)</th>
                        <th className="py-2 px-4 text-right">P90 (High)</th>
                        <th className="py-2 px-4 text-right">Seasonal Adj</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] font-mono tabular-nums">
                      {forecast.forecast.map((row) => (
                        <tr key={row.step} className="hover:bg-[#F9FAFB]">
                          <td className="py-2 px-4 text-[#6B7280]">+{row.step}</td>
                          <td className="py-2 px-4 font-semibold text-[#111827]">{row.label}</td>
                          <td className="py-2 px-4 text-right text-[#6B7280]">
                            {formatNum(row.p10)}
                          </td>
                          <td className="py-2 px-4 text-right font-bold text-[#2563EB]">
                            {formatNum(row.p50)}
                          </td>
                          <td className="py-2 px-4 text-right text-[#6B7280]">
                            {formatNum(row.p90)}
                          </td>
                          <td className="py-2 px-4 text-right text-[#6B7280]">
                            {row.seasonalComponent >= 0 ? '+' : ''}
                            {formatNum(row.seasonalComponent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
