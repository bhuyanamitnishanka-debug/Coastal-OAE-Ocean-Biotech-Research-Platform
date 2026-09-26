import React, { useEffect, useRef } from 'react';
import { BiogeochemicalState } from '../types/telemetry';

interface BiochemicalTelemetryPanelProps {
  state: BiogeochemicalState;
  history: {
    pH: number[];
    alkalinity: number[];
    omega: number[];
    drawdown: number[];
  };
}

/**
 * Dynamic SVG arrow icon component:
 * - Up / Green (#00ffaa) if the value has increased since the previous tick in the history buffer
 * - Down / Red (#ff3333) if the value has decreased since the previous tick in the history buffer
 * - Dash / Slate (#64748b) if unchanged or in equilibrium
 */
export const SvgTrendArrow: React.FC<{
  direction: 'up' | 'down' | 'steady';
  size?: number;
  className?: string;
}> = ({ direction, size = 18, className = '' }) => {
  if (direction === 'up') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={`inline-block shrink-0 drop-shadow-[0_0_8px_rgba(0,255,170,0.95)] animate-pulse ${className}`}
        aria-label="Value increased compared to previous tick in history buffer"
      >
        <path
          d="M12 3L4 11h5v9h6v-9h5L12 3z"
          fill="#00ffaa"
          stroke="#00ffaa"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (direction === 'down') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={`inline-block shrink-0 drop-shadow-[0_0_8px_rgba(255,51,51,0.95)] animate-pulse ${className}`}
        aria-label="Value decreased compared to previous tick in history buffer"
      >
        <path
          d="M12 21l8-8h-5V4H9v9H4l8 8z"
          fill="#ff3333"
          stroke="#ff3333"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#64748b"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={`inline-block shrink-0 opacity-60 ${className}`}
      aria-label="Value unchanged compared to previous tick in history buffer"
    >
      <line x1="6" y1="12" x2="18" y2="12" />
    </svg>
  );
};

export const BiochemicalTelemetryPanel: React.FC<BiochemicalTelemetryPanelProps> = ({
  state,
  history,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const growthPointsRef = useRef<number[]>(new Array(30).fill(35));

  /**
   * Compares the current simulation state value to the previous tick's recorded value
   * in the history buffers.
   */
  const getTrendFromHistory = (
    currentVal: number,
    buffer: number[],
    threshold: number,
    precision: number = 2
  ) => {
    if (!buffer || buffer.length === 0) {
      return { direction: 'steady' as const, deltaFormatted: '0.00', rawDelta: 0 };
    }

    // Identify the recorded value from the previous simulation tick in the history buffer:
    let prevTickVal: number;
    if (buffer.length >= 2) {
      const lastVal = buffer[buffer.length - 1];
      // If the latest entry in buffer is already currentVal, take the prior tick buffer[length - 2]
      if (Math.abs(lastVal - currentVal) < 0.0001 && buffer.length >= 2) {
        prevTickVal = buffer[buffer.length - 2];
      } else {
        prevTickVal = lastVal;
      }
    } else {
      prevTickVal = buffer[0];
    }

    const delta = currentVal - prevTickVal;

    if (Math.abs(delta) < threshold) {
      return { direction: 'steady' as const, deltaFormatted: '0.0', rawDelta: 0 };
    }

    const isUp = delta > 0;
    return {
      direction: isUp ? ('up' as const) : ('down' as const),
      deltaFormatted: `${isUp ? '+' : ''}${delta.toFixed(precision)}`,
      rawDelta: delta,
    };
  };

  // Dynamic SVG arrow icon trends computed directly from previous tick in history buffers
  const phTrend = getTrendFromHistory(state.pH, history.pH, 0.002, 2);
  const alkTrend = getTrendFromHistory(state.totalAlkalinity, history.alkalinity, 0.5, 0);
  const omegaTrend = getTrendFromHistory(state.omegaAragonite, history.omega, 0.008, 2);
  const drawdownTrend = getTrendFromHistory(state.co2DrawdownRate, history.drawdown, 0.02, 1);

  // Compute 10-tick historical moving average and test whether deviation exceeds 5%
  const checkDeviationFromMA = (currentVal: number, buffer: number[], thresholdPct: number = 5.0) => {
    if (!buffer || buffer.length === 0) {
      return { isDeviating: false, deviationPct: 0, movingAverage: currentVal };
    }
    const last10 = buffer.slice(-10);
    const sum = last10.reduce((acc, val) => acc + val, 0);
    const movingAverage = sum / last10.length;
    if (movingAverage === 0) {
      return { isDeviating: false, deviationPct: 0, movingAverage: 0 };
    }
    const deviationPct = Math.abs((currentVal - movingAverage) / movingAverage) * 100;
    return {
      isDeviating: deviationPct > thresholdPct,
      deviationPct,
      movingAverage,
      isSurge: currentVal > movingAverage,
    };
  };

  const phDeviation = checkDeviationFromMA(state.pH, history.pH, 5.0);
  const alkDeviation = checkDeviationFromMA(state.totalAlkalinity, history.alkalinity, 5.0);
  const omegaDeviation = checkDeviationFromMA(state.omegaAragonite, history.omega, 5.0);
  const drawdownDeviation = checkDeviationFromMA(state.co2DrawdownRate, history.drawdown, 5.0);

  const isPhAlarm = state.pH < 7.90 || state.pH > 8.35;
  const calculatedSluiceFlowM3s = Math.round(120 + (state.sluiceGateOpenPct / 100) * 320);

  // Sparkline renderer
  const renderSparkline = (data: number[], color: string, minVal?: number, maxVal?: number) => {
    if (!data || data.length < 2) return null;
    const min = minVal ?? Math.min(...data);
    const max = maxVal ?? Math.max(...data);
    const range = max - min || 1;
    const width = 80;
    const height = 20;

    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  // Live Mesocosm Growth canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newY = Math.max(8, Math.min(52, 54 - (state.algaeBiomassGL * 6.5) + (Math.random() - 0.5) * 3));
    growthPointsRef.current.push(newY);
    growthPointsRef.current.shift();

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle grid line
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Growth wave curve
    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const pts = growthPointsRef.current;
    const step = w / (pts.length - 1);

    for (let i = 0; i < pts.length; i++) {
      const x = i * step;
      const y = pts[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Pulse head dot
    const lastX = (pts.length - 1) * step;
    const lastY = pts[pts.length - 1];
    ctx.fillStyle = '#00ffaa';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [state.algaeBiomassGL]);

  return (
    <div className="telemetry-panel w-[335px] bg-[#030712]/95 border border-cyan-400/50 rounded-xl p-4 shadow-[0_0_30px_rgba(0,210,255,0.35)] backdrop-blur-md select-none transition-all">
      {/* Top Header Ribbon */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-cyan-500/20">
        <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono">
          Biogeochemical Guardrails
        </h2>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
      </div>

      <div className="space-y-2.5">
        {/* Metric 1: pH with dynamic SVG arrow icon (Up/Green or Down/Red) */}
        <div
          className={`data-row p-2 rounded-lg transition-all duration-500 border ${
            phDeviation.isDeviating
              ? 'animate-row-deviation border-amber-500/70'
              : 'border-transparent bg-slate-900/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              {/* Label line */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-mono uppercase text-slate-400">Ocean pH Value:</span>
                {phDeviation.isDeviating && (
                  <span className="text-[8.5px] font-mono font-bold text-amber-300 bg-amber-950/80 px-1 py-0.2 rounded border border-amber-500/60 animate-pulse">
                    Δ {phDeviation.deviationPct.toFixed(1)}% &gt; 5% MA
                  </span>
                )}
              </div>

              {/* Value line with dynamic SVG arrow icon and delta badge */}
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-2xl font-bold font-mono tracking-tight tabular-nums transition-colors ${
                    isPhAlarm
                      ? 'text-red-500 animate-pulse'
                      : phTrend.direction === 'up'
                      ? 'text-emerald-300'
                      : phTrend.direction === 'down'
                      ? 'text-rose-400'
                      : 'text-white'
                  }`}
                >
                  {state.pH.toFixed(2)}
                </span>

                {/* Dynamic SVG arrow icon next to value: Up/Green for increase, Down/Red for decrease */}
                <div className="flex items-center gap-1.5">
                  <SvgTrendArrow direction={phTrend.direction} size={18} />
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors ${
                      phTrend.direction === 'up'
                        ? 'text-[#00ffaa] bg-emerald-950/70 border-emerald-500/50 shadow-[0_0_8px_rgba(0,255,170,0.35)]'
                        : phTrend.direction === 'down'
                        ? 'text-[#ff3333] bg-rose-950/70 border-rose-500/50 shadow-[0_0_8px_rgba(255,51,51,0.35)]'
                        : 'text-slate-400 bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    {phTrend.deltaFormatted}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="h-5 flex items-center">
                {renderSparkline(history.pH, phTrend.direction === 'down' ? '#ff3333' : '#00ffaa')}
              </div>
              <span
                className={`text-[10px] font-mono font-medium mt-0.5 ${
                  isPhAlarm ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400'
                }`}
              >
                {isPhAlarm ? 'ALARM: THRESHOLD' : state.pH >= 7.85 && state.pH <= 8.25 ? 'stable' : 'elevated'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Alkalinity with dynamic SVG arrow icon (Up/Green or Down/Red) */}
        <div
          className={`data-row p-2 rounded-lg transition-all duration-500 border ${
            alkDeviation.isDeviating
              ? 'animate-row-deviation border-amber-500/70'
              : 'border-transparent bg-slate-900/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              {/* Label line */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-mono uppercase text-slate-400">Total Alkalinity (TA):</span>
                {alkDeviation.isDeviating && (
                  <span className="text-[8.5px] font-mono font-bold text-amber-300 bg-amber-950/80 px-1 py-0.2 rounded border border-amber-500/60 animate-pulse">
                    Δ {alkDeviation.deviationPct.toFixed(1)}% &gt; 5% MA
                  </span>
                )}
              </div>

              {/* Value line with dynamic SVG arrow icon and delta badge */}
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-2xl font-bold font-mono tracking-tight tabular-nums transition-colors ${
                    alkTrend.direction === 'up'
                      ? 'text-emerald-300'
                      : alkTrend.direction === 'down'
                      ? 'text-rose-400'
                      : 'text-white'
                  }`}
                >
                  {Math.round(state.totalAlkalinity)}
                </span>
                <span className="text-[11px] font-mono text-cyan-300">µmol</span>

                {/* Dynamic SVG arrow icon next to value: Up/Green for increase, Down/Red for decrease */}
                <div className="flex items-center gap-1.5">
                  <SvgTrendArrow direction={alkTrend.direction} size={18} />
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors ${
                      alkTrend.direction === 'up'
                        ? 'text-[#00ffaa] bg-emerald-950/70 border-emerald-500/50 shadow-[0_0_8px_rgba(0,255,170,0.35)]'
                        : alkTrend.direction === 'down'
                        ? 'text-[#ff3333] bg-rose-950/70 border-rose-500/50 shadow-[0_0_8px_rgba(255,51,51,0.35)]'
                        : 'text-slate-400 bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    {alkTrend.deltaFormatted}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="h-5 flex items-center">
                {renderSparkline(history.alkalinity, alkTrend.direction === 'down' ? '#ff3333' : '#00d2ff')}
              </div>
              <span className="text-[10px] font-mono text-cyan-300 mt-0.5">
                µmol/kg
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Aragonite Saturation (Ωarag) with dynamic SVG arrow icon */}
        <div
          className={`data-row p-2 rounded-lg transition-all duration-500 border ${
            omegaDeviation.isDeviating
              ? 'animate-row-deviation border-amber-500/70'
              : 'border-transparent bg-slate-900/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-mono uppercase text-slate-400">Ω Aragonite Safety:</span>
                {omegaDeviation.isDeviating && (
                  <span className="text-[8.5px] font-mono font-bold text-amber-300 bg-amber-950/80 px-1 py-0.2 rounded border border-amber-500/60 animate-pulse">
                    Δ {omegaDeviation.deviationPct.toFixed(1)}% &gt; 5% MA
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-bold font-mono tracking-tight text-white tabular-nums">
                  {state.omegaAragonite.toFixed(2)}
                </span>
                <div className="flex items-center gap-1">
                  <SvgTrendArrow direction={omegaTrend.direction} size={15} />
                  <span
                    className={`text-[9.5px] font-mono font-semibold px-1 py-0.2 rounded border ${
                      omegaTrend.direction === 'up'
                        ? 'text-[#00ffaa] bg-emerald-950/70 border-emerald-500/50'
                        : omegaTrend.direction === 'down'
                        ? 'text-[#ff3333] bg-rose-950/70 border-rose-500/50'
                        : 'text-slate-400 bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    {omegaTrend.deltaFormatted}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="h-5 flex items-center">
                {renderSparkline(history.omega, '#00ffaa')}
              </div>
              <span className="text-[10px] font-mono font-medium text-emerald-400 mt-0.5">
                {state.omegaAragonite >= 2.0 && state.omegaAragonite <= 3.6 ? 'safe' : 'caution'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: CO2 Drawdown with dynamic SVG arrow icon */}
        <div
          className={`data-row p-2 rounded-lg transition-all duration-500 border ${
            drawdownDeviation.isDeviating
              ? 'animate-row-deviation border-amber-500/70'
              : 'border-transparent bg-slate-900/30'
          }`}
        >
          <div className="flex items-baseline justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10.5px] font-mono uppercase text-slate-400">Atmospheric Drawdown:</span>
              {drawdownDeviation.isDeviating && (
                <span className="text-[8.5px] font-mono font-bold text-amber-300 bg-amber-950/80 px-1 py-0.2 rounded border border-amber-500/60 animate-pulse">
                  Δ {drawdownDeviation.deviationPct.toFixed(1)}% &gt; 5% MA
                </span>
              )}
            </div>
            <div className="text-[10.5px] font-mono text-slate-400">Tonnes/Hr</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono tracking-tight text-cyan-300 tabular-nums">
                {state.co2DrawdownRate.toFixed(1)}
              </span>
              <div className="flex items-center gap-1">
                <SvgTrendArrow direction={drawdownTrend.direction} size={15} />
                <span
                  className={`text-[9.5px] font-mono font-semibold px-1 py-0.2 rounded border ${
                    drawdownTrend.direction === 'up'
                      ? 'text-[#00ffaa] bg-emerald-950/70 border-emerald-500/50'
                      : drawdownTrend.direction === 'down'
                      ? 'text-[#ff3333] bg-rose-950/70 border-rose-500/50'
                      : 'text-slate-400 bg-slate-900/60 border-slate-800'
                  }`}
                >
                  {drawdownTrend.deltaFormatted}
                </span>
              </div>
            </div>
            <div className="text-[11px] font-mono text-emerald-400/90 tabular-nums">
              Cumul: {state.totalCo2Captured.toFixed(1)} T
            </div>
          </div>

          {/* Calibrated Drawdown Flow Bar */}
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-2 border border-slate-700/60">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, (state.co2DrawdownRate / 4.0) * 100)}%` }}
            />
          </div>
        </div>

        {/* Metric 5: Delta Sluice Gate Flow */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono px-1">
          <span className="text-[10.5px] uppercase text-slate-400">Delta Gate Discharge:</span>
          <span className="text-cyan-300 font-bold tabular-nums">
            {calculatedSluiceFlowM3s} m³/s
          </span>
        </div>

        {/* Section 6: Bio-Refinery Algae Chamber */}
        <div className="pt-2.5 border-t border-slate-800 space-y-1.5 px-1">
          <div className="flex justify-between items-center">
            <span className="text-[10.5px] font-mono uppercase text-pink-400 font-semibold tracking-wider">
              Bio-Refinery Algae Chamber
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800">
              NOMINAL
            </span>
          </div>

          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400 text-[10.5px]">Biomass Density Output:</span>
            <span className="text-white font-bold tabular-nums">
              {state.algaeBiomassGL.toFixed(2)} g/L
            </span>
          </div>

          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400 text-[10.5px]">Quantum Capture Yield:</span>
            <span className="text-emerald-400 font-bold tabular-nums">
              84.5%
            </span>
          </div>

          <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-[#020409]">
            <canvas ref={canvasRef} width={295} height={50} className="w-full h-[50px] block" />
            <div className="absolute bottom-1 right-2 text-[8.5px] font-mono text-slate-500">
              Micro-Aquarium Health: Active
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
