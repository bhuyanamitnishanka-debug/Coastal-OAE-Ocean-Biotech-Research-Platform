import React from 'react';
import { BiogeochemicalState } from '../types/telemetry';

interface MicroAquariumModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: BiogeochemicalState;
}

export const MicroAquariumModal: React.FC<MicroAquariumModalProps> = ({
  isOpen,
  onClose,
  state,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#081220] border border-emerald-400/60 rounded-2xl shadow-[0_0_40px_rgba(0,255,170,0.3)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-emerald-500/20 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-mono text-xs font-bold shadow-[0_0_12px_rgba(0,255,170,0.4)]">
              BIOTEST
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono tracking-wide">
                Automated Marine Micro-Aquarium Testing Pod
              </h2>
              <p className="text-xs text-slate-400">
                In-Situ Biomonitoring of Alkalinized Seawater on Calcifying Organisms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-mono text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Pod Content */}
        <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs text-slate-300">
          {/* Main Vitality KPI */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Biomass Vitality Index</div>
              <div className="text-xl font-bold text-emerald-400 tabular-nums">
                {state.biomassVitality.toFixed(1)}%
              </div>
              <div className="text-[9.5px] text-emerald-500/90 mt-0.5">Optimal Physiological Range</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Coral Calcification Rate</div>
              <div className="text-xl font-bold text-cyan-300 tabular-nums">
                {state.calcificationRate.toFixed(2)}
              </div>
              <div className="text-[9.5px] text-slate-400 mt-0.5">mg CaCO3 / cm² / day (+18%)</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Photosynthetic Yield</div>
              <div className="text-xl font-bold text-amber-300 tabular-nums">
                0.68 Fv/Fm
              </div>
              <div className="text-[9.5px] text-slate-400 mt-0.5">Nominal Chlorophyll-a</div>
            </div>
          </div>

          {/* Test Pod Assay Chambers */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-200">Continuous In-Situ Incubation Chambers</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Chamber 1 */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-emerald-300 font-semibold">
                  <span>Chamber A: Scleractinian Corals</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    PASS
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 leading-relaxed">
                  <em>Acropora muricata</em> micro-fragments exposed to plume water. Aragonite saturation (Ωarag: {state.omegaAragonite.toFixed(2)}) promotes accelerated skeletal growth without tissue necrosis.
                </p>
              </div>

              {/* Chamber 2 */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-cyan-300 font-semibold">
                  <span>Chamber B: Coccolithophores</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    PASS
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 leading-relaxed">
                  <em>Emiliania huxleyi</em> single-cell calcifying phytoplankton. Zero shell malformation detected. Dissolved CO2 drawdown stimulates autotrophic biomass growth.
                </p>
              </div>

              {/* Chamber 3 */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-emerald-300 font-semibold">
                  <span>Chamber C: Kelp & Macroalgae</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    PASS
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 leading-relaxed">
                  <em>Saccharina latissima</em> seedlings. Buffer chemistry stabilizes diurnal pH swings, mitigating coastal acidification shock events during peak tides.
                </p>
              </div>

              {/* Chamber 4 */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-amber-300 font-semibold">
                  <span>Chamber D: Benthic Bivalves</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                    TRACE ALERT
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 leading-relaxed">
                  <em>Mytilus edulis</em> filtration rate stable. Trace heavy metal bioaccumulation check (Ni: {state.traceNickelPpb.toFixed(2)} ppb) is well below the 5.0 ppb safety threshold.
                </p>
              </div>
            </div>
          </div>

          {/* Microscopic Optical Feed Simulator */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <div className="text-[11px] font-semibold text-slate-200">
                  Micro-Fluorescence Optical Sensor Node (488nm)
                </div>
                <div className="text-[10px] text-slate-500">
                  Active optical imaging stream from Pod Depth -2.8m · Frequency: 1Hz
                </div>
              </div>
            </div>
            <div className="text-emerald-400 font-bold text-xs">CALIBRATED</div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-emerald-500/20 bg-slate-900/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono tracking-wide transition-all shadow-[0_0_12px_rgba(0,255,170,0.3)]"
          >
            Close Biotest Inspection
          </button>
        </div>
      </div>
    </div>
  );
};
