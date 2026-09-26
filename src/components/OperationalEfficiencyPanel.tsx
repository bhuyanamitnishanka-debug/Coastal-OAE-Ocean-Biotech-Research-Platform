import React from 'react';
import { BiogeochemicalState, FeedstockType } from '../types/telemetry';

interface OperationalEfficiencyPanelProps {
  state: BiogeochemicalState;
  onDoseBurst: () => void;
  onChangeDosingRate: (rate: number) => void;
  onChangeFeedstock: (feedstock: FeedstockType) => void;
  onChangeSluice: (pct: number) => void;
  onChangeSalinity: (salinity: number) => void;
  onOpenMicroAquarium: () => void;
}

export const OperationalEfficiencyPanel: React.FC<OperationalEfficiencyPanelProps> = ({
  state,
  onDoseBurst,
  onChangeDosingRate,
  onChangeFeedstock,
  onChangeSluice,
  onChangeSalinity,
  onOpenMicroAquarium,
}) => {
  return (
    <div className="w-[285px] bg-[#0c1427]/85 border border-cyan-400/50 rounded-xl p-4 shadow-[0_0_20px_rgba(0,210,255,0.22)] backdrop-blur-md select-none">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-cyan-500/20">
        <h3 className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono">
          Operational Efficiency
        </h3>
        <span className="text-[10px] font-mono text-cyan-300">
          EFF: 99.2%
        </span>
      </div>

      <div className="space-y-3 font-mono text-xs">
        {/* Row 1: OAE Dispenser */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-300">OAE Dispenser:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {state.dispenserStatus}
            </span>
          </div>

          {/* Feedstock Selector */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/80 rounded-lg border border-slate-800 text-[10px]">
            {(['Ca(OH)2', 'NaOH', 'Olivine', 'BPMED'] as FeedstockType[]).map(fs => (
              <button
                key={fs}
                onClick={() => onChangeFeedstock(fs)}
                className={`py-1 px-1 rounded transition-colors text-center truncate ${
                  state.activeFeedstock === fs
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Active Feedstock: ${fs}`}
              >
                {fs}
              </button>
            ))}
          </div>

          {/* Dosing Slider & Burst Button */}
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Dosing Rate</span>
              <span className="text-cyan-300 font-bold tabular-nums">
                {state.dosingRateKgHr} kg/hr
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1200"
              step="25"
              value={state.dosingRateKgHr}
              onChange={e => onChangeDosingRate(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <button
              onClick={onDoseBurst}
              className="w-full mt-1.5 py-1 px-2 text-[10.5px] font-semibold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/50 rounded transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-[0_0_8px_rgba(0,255,170,0.2)]"
            >
              <span>+ Inject Alkalinity Pulse (150 kg)</span>
            </button>
          </div>
        </div>

        {/* Row 2: Micro-Aquarium */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-slate-300">Micro-Aquarium:</div>
            <div className="text-[10px] text-slate-400">Vitality: {state.biomassVitality.toFixed(1)}%</div>
          </div>
          <button
            onClick={onOpenMicroAquarium}
            className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/40 rounded text-emerald-400 text-[11px] font-bold transition-colors"
          >
            Nominal ↗
          </button>
        </div>

        {/* Row 3: Seawater Base Salinity & Dutch Sluice Gates */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10.5px]">
              <span className="text-slate-300">Base Seawater Salinity:</span>
              <span className="text-cyan-300 font-bold tabular-nums">
                {state.salinity.toFixed(1)} PSU
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="40"
              step="0.1"
              value={state.salinity}
              onChange={e => onChangeSalinity(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10.5px]">
              <span className="text-slate-300">Dutch Sluice Aperture:</span>
              <span className="text-cyan-300 font-bold tabular-nums">
                {state.sluiceGateOpenPct}% Open
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={state.sluiceGateOpenPct}
              onChange={e => onChangeSluice(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        {/* Row 4: Power Grid */}
        <div className="pt-2 border-t border-slate-800">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-slate-300">Power Grid:</span>
            <span className="text-emerald-400 font-bold">100% Renewables</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px] text-center text-slate-400">
            <div className="bg-slate-900/60 p-1 rounded border border-slate-800">
              <div className="text-amber-400 font-semibold">{state.windPower.toFixed(1)} MW</div>
              <div className="text-[9px]">Wind</div>
            </div>
            <div className="bg-slate-900/60 p-1 rounded border border-slate-800">
              <div className="text-cyan-400 font-semibold">{state.wavePower.toFixed(1)} MW</div>
              <div className="text-[9px]">Wave</div>
            </div>
            <div className="bg-slate-900/60 p-1 rounded border border-slate-800">
              <div className="text-amber-300 font-semibold">{state.solarPower.toFixed(1)} MW</div>
              <div className="text-[9px]">Solar</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
