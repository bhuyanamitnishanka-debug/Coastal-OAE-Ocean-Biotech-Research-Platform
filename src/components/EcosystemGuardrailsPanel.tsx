import React from 'react';
import { BiogeochemicalState } from '../types/telemetry';

interface EcosystemGuardrailsPanelProps {
  state: BiogeochemicalState;
}

export const EcosystemGuardrailsPanel: React.FC<EcosystemGuardrailsPanelProps> = ({ state }) => {
  const targetPH = 8.1;
  const currentPH = state.pH;

  // Calculate percentage toward safe saturation target
  const phPct = Math.min(100, Math.max(0, ((currentPH - 7.6) / (8.3 - 7.6)) * 100));

  return (
    <div className="w-[285px] bg-[#0c1427]/85 border border-cyan-400/50 rounded-xl p-4 shadow-[0_0_20px_rgba(0,210,255,0.22)] backdrop-blur-md select-none">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-cyan-500/20">
        <h3 className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono">
          Ecosystem Guardrails
        </h3>
        <span className="text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
          PROTECTED
        </span>
      </div>

      {/* pH Saturation Block */}
      <div className="space-y-2 mb-3.5">
        <div className="text-[11px] font-mono uppercase text-slate-300 font-semibold">
          pH Saturation
        </div>
        <div className="flex justify-between items-baseline font-mono text-xs text-slate-300">
          <span>Target</span>
          <span className="text-slate-200 font-bold tabular-nums">{targetPH.toFixed(1)}</span>
        </div>
        <div className="flex justify-between items-baseline font-mono text-xs text-slate-300">
          <span>Current</span>
          <span className="text-emerald-400 font-bold tabular-nums text-sm">
            {currentPH.toFixed(2)}
          </span>
        </div>

        {/* Saturation Bar Indicator */}
        <div className="relative w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-700">
          {/* Safe Target Marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-300 z-10"
            style={{ left: `${((targetPH - 7.6) / (8.3 - 7.6)) * 100}%` }}
            title="Saturation Target (8.10)"
          />
          {/* Progress fill */}
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              currentPH > 8.25
                ? 'bg-rose-500'
                : currentPH >= 7.95
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                : 'bg-cyan-600'
            }`}
            style={{ width: `${phPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-slate-500">
          <span>7.60</span>
          <span className="text-amber-300">8.10 (Optimum)</span>
          <span>8.30 (Limit)</span>
        </div>
      </div>

      {/* Secondary Guardrail Monitors */}
      <div className="space-y-2 pt-2.5 border-t border-slate-800 text-[11px] font-mono">
        {/* Precipitation Risk */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Precipitation Risk:</span>
          <span
            className={`font-semibold tabular-nums ${
              state.secondaryPrecipitationRisk < 25
                ? 'text-emerald-400'
                : state.secondaryPrecipitationRisk < 60
                ? 'text-amber-400'
                : 'text-rose-400 animate-pulse'
            }`}
          >
            {state.secondaryPrecipitationRisk < 25 ? 'Low' : state.secondaryPrecipitationRisk < 60 ? 'Moderate' : 'CRITICAL'} ({state.secondaryPrecipitationRisk.toFixed(0)}%)
          </span>
        </div>

        {/* Trace Nickel / Chromium */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Trace Ni (Dissolved):</span>
          <span className="text-slate-200 tabular-nums">
            {state.traceNickelPpb.toFixed(2)} ppb <span className="text-[9px] text-emerald-400">(&lt;5.0)</span>
          </span>
        </div>

        {/* Seawater Temp & Salinity */}
        <div className="flex items-center justify-between text-slate-400">
          <span>Temp / Salinity:</span>
          <span className="text-slate-200 tabular-nums">
            {state.seawaterTemp.toFixed(1)}°C / {state.salinity.toFixed(1)} PSU
          </span>
        </div>
      </div>
    </div>
  );
};
