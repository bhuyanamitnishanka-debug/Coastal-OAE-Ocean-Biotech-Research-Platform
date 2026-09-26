import React from 'react';
import { SubsystemInspection } from '../types/telemetry';

interface SubsystemInspectorPanelProps {
  inspection: SubsystemInspection | null;
  onClose: () => void;
}

export const SubsystemInspectorPanel: React.FC<SubsystemInspectorPanelProps> = ({
  inspection,
  onClose,
}) => {
  if (!inspection) return null;

  return (
    <div className="w-[305px] bg-[#091122]/90 border border-pink-500/70 rounded-xl p-4 shadow-[0_0_25px_rgba(236,72,153,0.3)] backdrop-blur-md select-none animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-pink-500/30">
        <h3 className="text-xs font-bold tracking-wider text-pink-400 uppercase font-mono">
          Selected Subsystem
        </h3>
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-pink-950/60 text-pink-300 border border-pink-500/40">
          {inspection.status}
        </span>
      </div>

      <div className="space-y-2 font-mono text-xs">
        <div>
          <div className="text-[10px] text-slate-400 uppercase">Subsystem Identification</div>
          <div className="text-sm font-bold text-white tracking-wide">{inspection.title}</div>
        </div>

        <div className="flex justify-between items-center py-1 border-t border-slate-800">
          <span className="text-slate-400">Core Grid Address:</span>
          <span className="text-cyan-300 font-bold tabular-nums">{inspection.address}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-t border-slate-800">
          <span className="text-slate-400">Structural Integrity:</span>
          <span className="text-emerald-400 font-bold tabular-nums">{inspection.integrity}%</span>
        </div>

        <div className="flex justify-between items-center py-1 border-t border-slate-800">
          <span className="text-slate-400">Operational Load:</span>
          <span className="text-cyan-300 font-bold">{inspection.load}</span>
        </div>

        <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800/80 text-[10.5px] text-slate-300 leading-relaxed mt-1">
          {inspection.description}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-2 py-1.5 px-3 rounded-lg border border-pink-500/60 text-pink-300 hover:bg-pink-950/50 hover:text-white font-mono text-[11px] font-bold uppercase transition-all shadow-[0_0_10px_rgba(236,72,153,0.2)]"
        >
          Clear Selection
        </button>
      </div>
    </div>
  );
};
