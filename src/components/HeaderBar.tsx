import React from 'react';
import { CameraPreset } from '../types/telemetry';

interface HeaderBarProps {
  cameraPreset: CameraPreset;
  onSelectPreset: (preset: CameraPreset) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  simSpeed: number;
  onCycleSpeed: () => void;
  showAnnotations: boolean;
  onToggleAnnotations: () => void;
  onResetBaseline: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  cameraPreset,
  onSelectPreset,
  isPlaying,
  onTogglePlay,
  simSpeed,
  onCycleSpeed,
  showAnnotations,
  onToggleAnnotations,
  onResetBaseline,
}) => {
  return (
    <header className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between px-5 py-3 bg-[#0a1224]/85 border border-cyan-400/50 rounded-xl backdrop-blur-md shadow-[0_0_25px_rgba(0,210,255,0.22)] select-none">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3">
        {/* Animated Gyroscope / Carbon Ring Icon */}
        <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_10px_rgba(0,210,255,0.4)]">
          <svg className="w-4 h-4 animate-[spin_10s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" strokeDasharray="14 4" />
            <circle cx="12" cy="12" r="4" />
          </svg>
        </div>

        <div>
          <h1 className="text-sm font-bold tracking-wider text-cyan-300 uppercase font-mono whitespace-nowrap">
            Coastal OAE Research Unit & Ocean-Biotechnology Hub
          </h1>
          <div className="text-[10px] font-mono text-slate-400">
            Digital Twin Simulation Core v2.4 · Realtime Biogeochemical Dynamics
          </div>
        </div>
      </div>

      {/* Zone 2: Camera View Navigation */}
      <nav className="hidden xl:flex items-center gap-1.5 p-1 bg-slate-950/70 border border-slate-800/80 rounded-lg font-mono text-xs">
        <button
          onClick={() => onSelectPreset('isometric')}
          className={`px-3 py-1 rounded-md transition-all whitespace-nowrap ${
            cameraPreset === 'isometric'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Isometric View
        </button>
        <button
          onClick={() => onSelectPreset('plume')}
          className={`px-3 py-1 rounded-md transition-all whitespace-nowrap ${
            cameraPreset === 'plume'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Plume Flow
        </button>
        <button
          onClick={() => onSelectPreset('biotest')}
          className={`px-3 py-1 rounded-md transition-all whitespace-nowrap ${
            cameraPreset === 'biotest'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Biotest Pod
        </button>
        <button
          onClick={() => onSelectPreset('renewables')}
          className={`px-3 py-1 rounded-md transition-all whitespace-nowrap ${
            cameraPreset === 'renewables'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Renewable Array
        </button>
        <button
          onClick={() => onSelectPreset('sluice')}
          className={`px-3 py-1 rounded-md transition-all whitespace-nowrap ${
            cameraPreset === 'sluice'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Dutch Sluice
        </button>
      </nav>

      {/* Zone 3: Simulation Controls & Status Pill */}
      <div className="flex items-center gap-2.5 font-mono text-xs">
        {/* Annotation Label Toggle */}
        <button
          onClick={onToggleAnnotations}
          className={`px-2.5 py-1 rounded border text-[11px] transition-colors whitespace-nowrap ${
            showAnnotations
              ? 'bg-cyan-950/80 border-cyan-400/80 text-cyan-300'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle 3D Floating Labels"
        >
          Labels: {showAnnotations ? 'ON' : 'OFF'}
        </button>

        {/* Play / Pause Toggle */}
        <button
          onClick={onTogglePlay}
          className={`px-3 py-1 rounded border text-[11px] font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            isPlaying
              ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
              : 'bg-amber-950/80 border-amber-500 text-amber-300'
          }`}
          title={isPlaying ? 'Pause Simulation Engine' : 'Resume Simulation Engine'}
        >
          <span>{isPlaying ? '⏸ Pause' : '▶ Play'}</span>
        </button>

        {/* Speed Multiplier */}
        <button
          onClick={onCycleSpeed}
          className="px-2 py-1 rounded border border-slate-700 bg-slate-900 hover:border-cyan-500/60 text-cyan-300 text-[11px] font-semibold tabular-nums whitespace-nowrap"
          title="Cycle Simulation Speed"
        >
          {simSpeed}x
        </button>

        {/* Reset Baseline */}
        <button
          onClick={onResetBaseline}
          className="px-2.5 py-1 rounded border border-slate-700 bg-slate-900 hover:text-white text-slate-400 text-[11px] whitespace-nowrap"
          title="Reset to Baseline Ocean State"
        >
          Reset
        </button>

        {/* Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/50 shadow-[0_0_10px_rgba(0,255,170,0.2)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-emerald-300 tracking-wider">
            SYS_STATUS: ACTIVE
          </span>
        </div>
      </div>
    </header>
  );
};
