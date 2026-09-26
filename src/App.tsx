/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ThreeDiorama } from './components/ThreeDiorama';
import { HeaderBar } from './components/HeaderBar';
import { BiochemicalTelemetryPanel } from './components/BiochemicalTelemetryPanel';
import { DataStreamPanel } from './components/DataStreamPanel';
import { EcosystemGuardrailsPanel } from './components/EcosystemGuardrailsPanel';
import { OperationalEfficiencyPanel } from './components/OperationalEfficiencyPanel';
import { SubsystemInspectorPanel } from './components/SubsystemInspectorPanel';
import { CsvExportModal } from './components/CsvExportModal';
import { MicroAquariumModal } from './components/MicroAquariumModal';
import {
  BiogeochemicalState,
  CameraPreset,
  FeedstockType,
  SensorNode,
  SubsystemInspection,
  TelemetryLogEntry,
} from './types/telemetry';
import {
  INITIAL_STATE,
  SENSOR_NODES,
  calculateOceanChemistryStep,
  exportTelemetryCsv,
} from './utils/oceanChemistry';

export default function App() {
  const [state, setState] = useState<BiogeochemicalState>(INITIAL_STATE);
  const [sensorNodes, setSensorNodes] = useState<SensorNode[]>(SENSOR_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-a4');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);

  // Inspector & Modals
  const [selectedSubsystem, setSelectedSubsystem] = useState<SubsystemInspection | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [isBiotestModalOpen, setIsBiotestModalOpen] = useState<boolean>(false);

  // Notification toast
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);

  // Sparkline history buffers
  const [history, setHistory] = useState<{
    pH: number[];
    alkalinity: number[];
    omega: number[];
    drawdown: number[];
  }>({
    pH: [7.94, 7.94, 7.95, 7.95, 7.95, 7.96, 7.95, 7.95],
    alkalinity: [2420, 2430, 2440, 2445, 2450, 2450, 2448, 2450],
    omega: [2.35, 2.36, 2.38, 2.39, 2.4, 2.4, 2.41, 2.4],
    drawdown: [1.7, 1.75, 1.78, 1.8, 1.8, 1.82, 1.8, 1.8],
  });

  // Telemetry logs for CSV export
  const [logs, setLogs] = useState<TelemetryLogEntry[]>([]);
  const logsRef = useRef<TelemetryLogEntry[]>([]);
  logsRef.current = logs;

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warn' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev));
    }, 3500);
  }, []);

  // Periodic sensor recording
  const recordLogEntry = useCallback(
    (currentState: BiogeochemicalState, eventType: string = 'STREAM_SAMPLE') => {
      const newEntry: TelemetryLogEntry = {
        timestamp: new Date().toISOString(),
        epochMs: Date.now(),
        nodeId: selectedNodeId,
        event: eventType,
        feedstock: currentState.activeFeedstock,
        dosingRateKgHr: currentState.dosingRateKgHr,
        pH: currentState.pH,
        totalAlkalinity_uMol: currentState.totalAlkalinity,
        omegaAragonite: currentState.omegaAragonite,
        co2Drawdown_tonnes_h: currentState.co2DrawdownRate,
        cumulativeCo2Captured_tonnes: currentState.totalCo2Captured,
        seawaterTemp_C: currentState.seawaterTemp,
        salinity_PSU: currentState.salinity,
        biomassVitality_pct: currentState.biomassVitality,
        calcificationRate_mg: currentState.calcificationRate,
        precipitationRisk_pct: currentState.secondaryPrecipitationRisk,
        gridInput_MW: currentState.renewablePowerTotal,
        sluiceGate_pct: currentState.sluiceGateOpenPct,
      };

      setLogs(prev => {
        const next = [...prev, newEntry];
        return next.length > 500 ? next.slice(-500) : next;
      });
    },
    [selectedNodeId]
  );

  // Initialize first telemetry log
  useEffect(() => {
    recordLogEntry(INITIAL_STATE, 'SYS_INIT_BASELINE');
  }, [recordLogEntry]);

  // Main simulation tick loop
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 1000 / simSpeed;
    const timer = setInterval(() => {
      setState(current => {
        const next = calculateOceanChemistryStep(
          current,
          1.0,
          current.activeFeedstock,
          current.dosingRateKgHr,
          current.sluiceGateOpenPct
        );

        // Update history buffers
        setHistory(h => ({
          pH: [...h.pH.slice(-19), next.pH],
          alkalinity: [...h.alkalinity.slice(-19), next.totalAlkalinity],
          omega: [...h.omega.slice(-19), next.omegaAragonite],
          drawdown: [...h.drawdown.slice(-19), next.co2DrawdownRate],
        }));

        // Dynamically update individual sensor nodes based on proximity to plume
        setSensorNodes(nodes =>
          nodes.map(node => {
            const isNearPlume = node.id === 'node-a4';
            const isBenthic = node.id === 'node-b1';
            const isAquarium = node.id === 'node-c3';

            let nodePH = next.pH;
            let nodeAlk = next.totalAlkalinity;

            if (isNearPlume) {
              nodePH = next.pH + 0.14;
              nodeAlk = next.totalAlkalinity + 160;
            } else if (isBenthic) {
              nodePH = Math.max(7.85, next.pH - 0.08);
              nodeAlk = Math.max(2250, next.totalAlkalinity - 70);
            } else if (isAquarium) {
              nodePH = next.pH + 0.06;
              nodeAlk = next.totalAlkalinity + 45;
            }

            return {
              ...node,
              pH: nodePH,
              alkalinity: nodeAlk,
              omegaAragonite: 1.8 + ((nodeAlk - 2200) / 700) * 2.2,
              co2Drawdown: next.co2DrawdownRate * (isNearPlume ? 1.25 : 0.95),
            };
          })
        );

        // Periodic stream logging (every 4 seconds)
        if (Math.random() < 0.25) {
          recordLogEntry(next, 'PERIODIC_STREAM');
        }

        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, simSpeed, recordLogEntry]);

  // Handle sudden alkaline dosing injection pulse
  const handleDoseBurst = useCallback(() => {
    setState(current => {
      const burstTA = current.totalAlkalinity + 140;
      const burstPH = Math.min(8.35, current.pH + 0.16);
      const burstDrawdown = current.co2DrawdownRate + 1.2;
      const burstOmega = Math.min(3.8, current.omegaAragonite + 0.35);

      const burstState: BiogeochemicalState = {
        ...current,
        totalAlkalinity: burstTA,
        pH: burstPH,
        co2DrawdownRate: burstDrawdown,
        omegaAragonite: burstOmega,
        dispenserStatus: 'Dosing Burst',
      };

      // Reset dispenser status back to active after pulse settles
      setTimeout(() => {
        setState(s => ({ ...s, dispenserStatus: 'Active' }));
      }, 3000);

      recordLogEntry(burstState, 'ALK_INJECTION_PULSE');
      showToast('Injected 150 kg Alkalinity Pulse. Plume flux increased.', 'success');
      return burstState;
    });
  }, [recordLogEntry, showToast]);

  const handleChangeDosingRate = useCallback((rate: number) => {
    setState(s => ({ ...s, dosingRateKgHr: rate }));
  }, []);

  const handleChangeFeedstock = useCallback((fs: FeedstockType) => {
    setState(s => ({ ...s, activeFeedstock: fs }));
    showToast(`Active OAE Feedstock set to ${fs}`, 'info');
  }, [showToast]);

  const handleChangeSluice = useCallback((pct: number) => {
    setState(s => ({ ...s, sluiceGateOpenPct: pct }));
  }, []);

  const handleChangeSalinity = useCallback((salinity: number) => {
    setState(s => {
      const phShift = (salinity - 35) * 0.012;
      return {
        ...s,
        salinity,
        pH: Math.max(7.7, Math.min(8.4, s.pH + phShift * 0.1)),
        omegaAragonite: Math.max(1.8, Math.min(3.8, (s.totalAlkalinity / 1000) * (salinity / 35))),
      };
    });
  }, []);

  const handleResetBaseline = useCallback(() => {
    setState(INITIAL_STATE);
    setCameraPreset('isometric');
    setSelectedNodeId('node-a4');
    setSelectedSubsystem(null);
    recordLogEntry(INITIAL_STATE, 'RESET_BASELINE');
    showToast('Reset ocean geochemical state to baseline parameters.', 'info');
  }, [recordLogEntry, showToast]);

  const handleCycleSpeed = useCallback(() => {
    setSimSpeed(prev => (prev === 1 ? 2 : prev === 2 ? 5 : 1));
  }, []);

  const handleHotspotClick = useCallback((hotspotKey: string) => {
    if (hotspotKey === 'plume') {
      setCameraPreset('plume');
      setSelectedSubsystem({
        id: 'sub-plume',
        title: 'Ocean Alkaline Dispersal Plume Vector Core',
        address: '0xA4-OAE-MANIFOLD',
        integrity: 99.8,
        load: 'Active Injection (450 kg/h)',
        status: 'OPERATIONAL',
        description: 'Multi-point diffuser nozzles discharging dissolved alkalinity plume into coastal tidal streamline for accelerated air-sea CO2 invasion.',
      });
      showToast('Camera focused on Ocean Alkaline Dispersal Plume Vectors', 'info');
    } else if (hotspotKey === 'biotest') {
      setCameraPreset('biotest');
      setSelectedSubsystem({
        id: 'sub-biotest',
        title: 'Automated Marine Micro-Aquarium Pod',
        address: '0xC3-MESO-BIO',
        integrity: 98.4,
        load: 'Continuous Bio-Assay',
        status: 'NOMINAL',
        description: 'Atmosphere-coupled mesocosm tracking scleractinian coral calcification rates and coccolithophore shell growth under elevated carbonate saturation.',
      });
      setIsBiotestModalOpen(true);
    } else if (hotspotKey === 'renewables') {
      setCameraPreset('renewables');
      setSelectedSubsystem({
        id: 'sub-renewables',
        title: 'Heavy-Engineering Ocean Renewable Cluster',
        address: '0xB1-GRID-OFFSHORE',
        integrity: 100,
        load: '42.8 MW Net Generation',
        status: 'ONLINE',
        description: 'Floating aerodynamic offshore wind turbines and oscillating wave buoys directly powering electrochemical acid-base separation manifolds.',
      });
      showToast('Camera focused on Offshore Renewable Energy Cluster', 'info');
    } else if (hotspotKey === 'sluice') {
      setCameraPreset('sluice');
      setSelectedSubsystem({
        id: 'sub-sluice',
        title: 'Dutch Geo-Shielding Coastal Barrier & Sluice Gate',
        address: '0xD2-SLUICE-HYDRAULIC',
        integrity: 99.6,
        load: '75% Flow Aperture',
        status: 'ACTIVE',
        description: 'Automated sluice gates engineered with Dutch sea-barrier geometry to regulate lagoon seawater exchange and prevent stagnation.',
      });
      showToast('Camera focused on Dutch Geo-Shielding Sluice Gates', 'info');
    }
  }, [showToast]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060c18] text-slate-100 font-sans">
      {/* 1. 3D Digital Twin Canvas */}
      <div className="absolute inset-0 z-0">
        <ThreeDiorama
          state={state}
          sensorNodes={sensorNodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={id => {
            setSelectedNodeId(id);
            const node = sensorNodes.find(n => n.id === id);
            if (node) {
              showToast(`Switched active data stream to ${node.code} (${node.zone})`, 'info');
            }
          }}
          cameraPreset={cameraPreset}
          onSelectHotspot={handleHotspotClick}
          showAnnotations={showAnnotations}
        />
      </div>

      {/* 2. Top Header Ribbon */}
      <HeaderBar
        cameraPreset={cameraPreset}
        onSelectPreset={p => setCameraPreset(p)}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(p => !p)}
        simSpeed={simSpeed}
        onCycleSpeed={handleCycleSpeed}
        showAnnotations={showAnnotations}
        onToggleAnnotations={() => setShowAnnotations(a => !a)}
        onResetBaseline={handleResetBaseline}
      />

      {/* 3. Left HUD Overlays */}
      <div className="absolute top-20 left-4 z-10 space-y-4">
        {/* Critical Security Protocol Alarm HUD (shown when thresholds are exceeded) */}
        {(state.pH < 7.90 || state.pH > 8.35 || state.secondaryPrecipitationRisk > 55) && (
          <div className="w-[330px] p-3.5 rounded-xl border border-red-500/80 bg-red-950/85 backdrop-blur-md shadow-[0_0_25px_rgba(255,51,51,0.4)] animate-pulse font-mono select-none">
            <div className="flex justify-between items-center text-xs font-bold text-red-400 uppercase tracking-wide border-b border-red-500/30 pb-1.5 mb-2">
              <span>⚠️ Critical Security Protocol</span>
              <span className="text-[10px] bg-red-900/60 px-1.5 py-0.5 rounded text-red-200">ALARM ACTIVE</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Alert Vector Code:</span>
                <span className="text-red-400 font-bold">ERR_OAE_SATURATION</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Ecosystem Risk:</span>
                <span className="text-amber-300 font-semibold">Mineral Precipitation Spike</span>
              </div>
            </div>
            <p className="text-[10.5px] text-red-200 mt-2 leading-relaxed bg-red-900/40 p-2 rounded border border-red-800/40">
              System alkalinity saturation threshold exceeded ({state.pH.toFixed(2)} pH). Adjust mineral intake or seawater salinity to re-stabilize coastal equilibria.
            </p>
          </div>
        )}

        <BiochemicalTelemetryPanel state={state} history={history} />
        <DataStreamPanel
          nodes={sensorNodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={id => setSelectedNodeId(id)}
        />
      </div>

      {/* 4. Right HUD Overlays */}
      <div className="absolute top-20 right-4 z-10 space-y-4">
        <EcosystemGuardrailsPanel state={state} />
        <OperationalEfficiencyPanel
          state={state}
          onDoseBurst={handleDoseBurst}
          onChangeDosingRate={handleChangeDosingRate}
          onChangeFeedstock={handleChangeFeedstock}
          onChangeSluice={handleChangeSluice}
          onChangeSalinity={handleChangeSalinity}
          onOpenMicroAquarium={() => setIsBiotestModalOpen(true)}
        />
        {selectedSubsystem && (
          <SubsystemInspectorPanel
            inspection={selectedSubsystem}
            onClose={() => setSelectedSubsystem(null)}
          />
        )}
      </div>

      {/* 5. Center Bottom Glowing .CSV EXPORT READY Button (Exact match with reference image) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        <button
          onClick={() => setIsCsvModalOpen(true)}
          className="neon-export-btn relative px-8 py-3 rounded-full bg-slate-950/90 border-2 border-pink-500 hover:border-pink-400 text-white font-mono text-xs font-extrabold uppercase tracking-widest transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md flex items-center gap-3 shadow-[0_0_25px_rgba(236,72,153,0.7)]"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-ping" />
          <span className="bg-gradient-to-r from-pink-400 via-white to-cyan-300 bg-clip-text text-transparent">
            .CSV EXPORT READY
          </span>
          <span className="text-[10px] text-pink-400/90 font-normal border-l border-pink-500/40 pl-2 lowercase">
            ({logs.length} logs)
          </span>
        </button>

        {/* Quick helper caption */}
        <div className="mt-2 text-[10px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
          Left Drag: Rotate 3D · Right Drag: Pan · Scroll: Zoom · Click Pins to Inspect
        </div>
      </div>

      {/* 6. Toast Notification */}
      {notification && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/95 border border-cyan-400/80 rounded-xl shadow-[0_0_20px_rgba(0,210,255,0.4)] backdrop-blur-md text-xs font-mono text-cyan-200 flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* 7. Modals */}
      <CsvExportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        logs={logs}
        onClearLogs={() => {
          setLogs([]);
          showToast('Cleared in-memory telemetry buffer.', 'info');
        }}
      />

      <MicroAquariumModal
        isOpen={isBiotestModalOpen}
        onClose={() => setIsBiotestModalOpen(false)}
        state={state}
      />
    </div>
  );
}
