import React from 'react';
import { SensorNode } from '../types/telemetry';

interface DataStreamPanelProps {
  nodes: SensorNode[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
}

export const DataStreamPanel: React.FC<DataStreamPanelProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
}) => {
  return (
    <div className="w-[285px] bg-[#0c1427]/85 border border-cyan-400/50 rounded-xl p-3.5 shadow-[0_0_20px_rgba(0,210,255,0.22)] backdrop-blur-md select-none">
      <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-cyan-500/20">
        <h3 className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono">
          Data Stream
        </h3>
        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      <div className="space-y-1.5">
        {nodes.map(node => {
          const isSelected = node.id === selectedNodeId;
          return (
            <button
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-all duration-200 flex items-center justify-between font-mono ${
                isSelected
                  ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,210,255,0.25)]'
                  : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isSelected ? 'bg-cyan-400 shadow-[0_0_6px_#00d2ff]' : 'bg-slate-600'
                  }`}
                />
                <span className="text-xs font-semibold tracking-wide truncate">
                  {node.code}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 tabular-nums shrink-0 ml-2">
                -{node.depthMeters}m
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Node Summary Kicker */}
      {selectedNodeId && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Target Depth: {nodes.find(n => n.id === selectedNodeId)?.depthMeters}m</span>
          <span className="text-cyan-300">Ping: 12ms (99.8%)</span>
        </div>
      )}
    </div>
  );
};
