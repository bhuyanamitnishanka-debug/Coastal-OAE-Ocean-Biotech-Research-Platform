import React, { useState } from 'react';
import { TelemetryLogEntry } from '../types/telemetry';
import { exportTelemetryCsv } from '../utils/oceanChemistry';

interface CsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: TelemetryLogEntry[];
  onClearLogs: () => void;
}

export const CsvExportModal: React.FC<CsvExportModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const [exportScope, setExportScope] = useState<'all' | 'recent50' | 'dosingOnly'>('all');
  const [includeAuditMeta, setIncludeAuditMeta] = useState(true);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    if (exportScope === 'dosingOnly') {
      return log.event.includes('DOSE') || log.event.includes('INJECTION');
    }
    return true;
  });

  const finalLogs = exportScope === 'recent50' ? filteredLogs.slice(-50) : filteredLogs;

  const handleDownload = () => {
    exportTelemetryCsv(finalLogs, 'Coastal_OAE_Research_Telemetry');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#091122] border border-cyan-400/60 rounded-2xl shadow-[0_0_40px_rgba(0,210,255,0.3)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-cyan-500/20 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-500/20 border border-pink-500/50 text-pink-400 font-mono text-xs font-bold shadow-[0_0_12px_rgba(236,72,153,0.4)]">
              .CSV
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono tracking-wide">
                Sensor Telemetry & Carbon Audit Export
              </h2>
              <p className="text-xs text-slate-400">
                Marine Biogeochemistry, Dosing Kinetics & Ecosystem Guardrail Record
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

        {/* Content & Options */}
        <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs text-slate-300">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Total Logged Samples</div>
              <div className="text-lg font-bold text-cyan-300 tabular-nums">{logs.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Export Selection</div>
              <div className="text-lg font-bold text-emerald-400 tabular-nums">{finalLogs.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Standard Format</div>
              <div className="text-lg font-bold text-pink-300">RFC 4180 CSV</div>
            </div>
          </div>

          {/* Export Filter Controls */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold block">Export Scope & Filtering</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setExportScope('all')}
                className={`p-2 rounded-lg border text-center transition-all ${
                  exportScope === 'all'
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,210,255,0.2)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All Stream Records ({logs.length})
              </button>
              <button
                onClick={() => setExportScope('recent50')}
                className={`p-2 rounded-lg border text-center transition-all ${
                  exportScope === 'recent50'
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,210,255,0.2)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Latest 50 Samples
              </button>
              <button
                onClick={() => setExportScope('dosingOnly')}
                className={`p-2 rounded-lg border text-center transition-all ${
                  exportScope === 'dosingOnly'
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,210,255,0.2)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Alkaline Dosing Events
              </button>
            </div>
          </div>

          {/* Data Table Preview */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Preview (Latest 5 Records)</span>
              <span>18 Data Columns Included</span>
            </div>
            <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950/80">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase">
                  <tr>
                    <th className="p-2">Timestamp</th>
                    <th className="p-2">Node</th>
                    <th className="p-2">pH</th>
                    <th className="p-2">TA (µmol)</th>
                    <th className="p-2">Ωarag</th>
                    <th className="p-2">CO2 Rate (T/h)</th>
                    <th className="p-2">Precip Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {finalLogs.slice(-5).reverse().map((entry, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="p-2 text-slate-400 whitespace-nowrap">
                        {entry.timestamp.split('T')[1]?.slice(0, 8)}
                      </td>
                      <td className="p-2 text-cyan-300">{entry.nodeId}</td>
                      <td className="p-2 text-emerald-400">{entry.pH.toFixed(2)}</td>
                      <td className="p-2 text-cyan-300">{Math.round(entry.totalAlkalinity_uMol)}</td>
                      <td className="p-2 text-emerald-300">{entry.omegaAragonite.toFixed(2)}</td>
                      <td className="p-2 text-cyan-200">{entry.co2Drawdown_tonnes_h.toFixed(1)}</td>
                      <td className="p-2 text-slate-300">{entry.precipitationRisk_pct.toFixed(0)}%</td>
                    </tr>
                  ))}
                  {finalLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500">
                        No telemetry logs match current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-cyan-500/20 bg-slate-900/60 flex items-center justify-between">
          <button
            onClick={onClearLogs}
            className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors font-mono"
          >
            Clear In-Memory Buffer
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-400 hover:to-cyan-400 text-slate-950 font-bold text-xs font-mono tracking-wider shadow-[0_0_15px_rgba(236,72,153,0.5)] transition-all active:scale-95"
            >
              Download .CSV File Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
