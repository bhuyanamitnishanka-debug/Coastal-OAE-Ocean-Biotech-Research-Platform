import { BiogeochemicalState, FeedstockType, SensorNode, TelemetryLogEntry } from '../types/telemetry';

export const INITIAL_STATE: BiogeochemicalState = {
  pH: 7.95,
  totalAlkalinity: 2450,
  omegaAragonite: 2.4,
  co2DrawdownRate: 1.8,
  totalCo2Captured: 142.3,
  dic: 2110,
  seawaterTemp: 16.8,
  salinity: 35.0,
  pCo2Air: 422.5,
  pCo2Water: 310.2,
  biomassVitality: 98.4,
  algaeBiomassGL: 4.20,
  calcificationRate: 3.25,
  phytoplanktonIndex: 0.68,
  secondaryPrecipitationRisk: 12.5,
  traceNickelPpb: 0.42,
  traceChromiumPpb: 0.18,
  renewablePowerTotal: 42.8,
  windPower: 28.4,
  wavePower: 8.6,
  solarPower: 5.8,
  dosingRateKgHr: 450,
  activeFeedstock: 'Ca(OH)2',
  dispenserStatus: 'Active',
  sluiceGateOpenPct: 75,
};

export const SENSOR_NODES: SensorNode[] = [
  {
    id: 'node-a4',
    name: 'Plume Vector Core',
    code: 'SENSOR NODE_A4',
    depthMeters: 4.2,
    coordinates: [-8, 2, 4],
    zone: 'Near-Field Mixing',
    pH: 8.12,
    alkalinity: 2620,
    temperature: 16.9,
    salinity: 34.6,
    omegaAragonite: 2.75,
    co2Drawdown: 2.3,
    signalStrength: 99,
    status: 'ONLINE',
  },
  {
    id: 'node-b1',
    name: 'Benthic Array Deep',
    code: 'NODE_B1',
    depthMeters: 18.5,
    coordinates: [12, -4, 18],
    zone: 'Offshore Benthic Shelf',
    pH: 7.92,
    alkalinity: 2380,
    temperature: 14.8,
    salinity: 34.9,
    omegaAragonite: 2.28,
    co2Drawdown: 1.4,
    signalStrength: 94,
    status: 'ONLINE',
  },
  {
    id: 'node-c3',
    name: 'Micro-Aquarium Intake',
    code: 'NODE_C3',
    depthMeters: 2.8,
    coordinates: [-14, 1, -6],
    zone: 'Biotest Laboratory Influx',
    pH: 8.04,
    alkalinity: 2490,
    temperature: 17.1,
    salinity: 34.5,
    omegaAragonite: 2.52,
    co2Drawdown: 1.9,
    signalStrength: 98,
    status: 'ONLINE',
  },
  {
    id: 'node-d2',
    name: 'Dutch Sluice Estuary Gate',
    code: 'NODE_D2',
    depthMeters: 6.0,
    coordinates: [24, 0, -12],
    zone: 'Hydraulic Coastal Boundary',
    pH: 7.98,
    alkalinity: 2410,
    temperature: 16.5,
    salinity: 34.3,
    omegaAragonite: 2.39,
    co2Drawdown: 1.6,
    signalStrength: 96,
    status: 'ONLINE',
  },
];

/**
 * Computes carbonate system shifts when alkalinity dosing changes.
 */
export function calculateOceanChemistryStep(
  current: BiogeochemicalState,
  deltaTimeSec: number,
  feedstock: FeedstockType,
  dosingRateKgHr: number,
  sluiceOpenPct: number
): BiogeochemicalState {
  // Feedstock efficiency factor: moles of alkalinity per kg
  let alkYieldMultiplier = 1.0;
  let traceNiShift = 0.0;
  if (feedstock === 'Ca(OH)2') {
    alkYieldMultiplier = 1.35; // 2 eq per mole Ca(OH)2 (MW 74.09)
  } else if (feedstock === 'NaOH') {
    alkYieldMultiplier = 1.15; // 1 eq per mole NaOH (MW 40.0)
  } else if (feedstock === 'Olivine') {
    alkYieldMultiplier = 0.85; // slower dissolution kinetics, releases Ni
    traceNiShift = 0.08 * (dosingRateKgHr / 500);
  } else if (feedstock === 'BPMED') {
    alkYieldMultiplier = 1.45; // pure high-purity electrochemical stream
  }

  // Delta alkalinity input to the modeled coastal mixing box
  const coastalVolumeM3 = 500000; // effective coastal mixing volume
  const flowThroughRate = 120 + (sluiceOpenPct / 100) * 180; // m3/s exchange with open ocean
  
  // Dosing input in umol/kg/s
  const dosingUmolPerSec = (dosingRateKgHr * alkYieldMultiplier * 1000 * 1000) / (74 * 3600);
  const alkInputUmolKg = (dosingUmolPerSec / (coastalVolumeM3 * 1.025)) * deltaTimeSec;

  // Ocean dilution relaxation towards ambient baseline (2310 umol/kg)
  const ambientTA = 2310;
  const dilutionFrac = Math.min(0.2, (flowThroughRate * deltaTimeSec) / coastalVolumeM3);
  let newTA = current.totalAlkalinity + alkInputUmolKg - (current.totalAlkalinity - ambientTA) * dilutionFrac;
  newTA = Math.max(2200, Math.min(3200, newTA));

  // Dynamic pH response to TA/DIC ratio
  // Standard ocean empiricism: d(pH)/d(TA) approx 0.00075 pH units per umol/kg TA at constant DIC
  const baselineTA = 2300;
  const targetPH = 7.82 + (newTA - baselineTA) * 0.00085;
  const newPH = current.pH + (targetPH - current.pH) * Math.min(1, deltaTimeSec * 0.4);

  // Aragonite saturation state: Omega_arag approx proportional to [CO3^2-]
  // [CO3^2-] correlates strongly with (TA - DIC)
  const targetOmega = 1.8 + ((newTA - 2200) / 700) * 2.2;
  const newOmega = current.omegaAragonite + (targetOmega - current.omegaAragonite) * Math.min(1, deltaTimeSec * 0.35);

  // Atmospheric CO2 drawdown flux: driven by water pCO2 depression
  // As TA increases, water pCO2 drops from ~420 ppm to ~260 ppm
  const waterPCo2 = Math.max(180, 420 - (newTA - baselineTA) * 0.55);
  const airSeaDelta = current.pCo2Air - waterPCo2;
  // Tonnes / Hr across the coastal footprint
  const targetDrawdownRate = Math.max(0.2, (airSeaDelta / 100) * 1.6);
  const newDrawdownRate = current.co2DrawdownRate + (targetDrawdownRate - current.co2DrawdownRate) * Math.min(1, deltaTimeSec * 0.3);

  // Cumulative CO2 captured (tonnes)
  const capturedIncrement = (newDrawdownRate * deltaTimeSec) / 3600;
  const newTotalCaptured = current.totalCo2Captured + capturedIncrement;

  // Ecosystem guardrails: Secondary precipitation risk spikes if pH > 8.30 or Omega > 3.8
  let precipRisk = 4.0;
  if (newOmega > 3.2) {
    precipRisk += (newOmega - 3.2) * 45;
  }
  if (newPH > 8.25) {
    precipRisk += (newPH - 8.25) * 120;
  }
  precipRisk = Math.min(100, Math.max(2, precipRisk));

  // Biotest Pod biomass vitality: optimum between pH 8.0 and 8.25, decreases if precipRisk > 40
  let vitality = 98.6;
  if (newPH < 7.9) vitality -= (7.9 - newPH) * 12;
  if (newPH > 8.3) vitality -= (newPH - 8.3) * 25;
  if (precipRisk > 35) vitality -= (precipRisk - 35) * 0.4;
  vitality = Math.max(70, Math.min(100, vitality));

  // Renewable power generation micro-fluctuations
  const windVariability = 28.4 + Math.sin(Date.now() / 6000) * 1.8;
  const waveVariability = 8.6 + Math.cos(Date.now() / 4000) * 0.9;
  const solarVariability = 5.8 + Math.sin(Date.now() / 15000) * 0.5;

  return {
    ...current,
    totalAlkalinity: newTA,
    pH: newPH,
    omegaAragonite: newOmega,
    co2DrawdownRate: newDrawdownRate,
    totalCo2Captured: newTotalCaptured,
    pCo2Water: waterPCo2,
    secondaryPrecipitationRisk: precipRisk,
    biomassVitality: vitality,
    algaeBiomassGL: Math.max(1.0, Math.min(8.0, 4.20 + (newTA - 2450) * 0.002 + (current.salinity - 35) * 0.04)),
    calcificationRate: 2.1 + (newOmega - 1.8) * 0.75,
    traceNickelPpb: Math.max(0.25, current.traceNickelPpb + traceNiShift * deltaTimeSec * 0.05),
    windPower: Math.max(10, windVariability),
    wavePower: Math.max(3, waveVariability),
    solarPower: Math.max(1, solarVariability),
    renewablePowerTotal: windVariability + waveVariability + solarVariability,
    dosingRateKgHr,
    activeFeedstock: feedstock,
    sluiceGateOpenPct: sluiceOpenPct,
  };
}

/**
 * Builds CSV string and triggers browser file download
 */
export function exportTelemetryCsv(logs: TelemetryLogEntry[], filenamePrefix = 'OAE_Coastal_Telemetry_Log'): void {
  if (!logs || logs.length === 0) return;

  const headers = [
    'Timestamp_ISO',
    'Epoch_Ms',
    'Sensor_Node_ID',
    'Event_Type',
    'Active_Feedstock',
    'Dosing_Rate_kg_h',
    'Ocean_pH',
    'Total_Alkalinity_umol_kg',
    'Aragonite_Saturation_Omega_arag',
    'CO2_Drawdown_Tonnes_h',
    'Cumulative_CO2_Captured_Tonnes',
    'Seawater_Temp_C',
    'Salinity_PSU',
    'MicroAquarium_Vitality_Pct',
    'Coral_Calcification_Rate_mg_cm2_d',
    'Secondary_Precipitation_Risk_Pct',
    'Renewable_Grid_Input_MW',
    'Dutch_Sluice_Gate_Open_Pct'
  ];

  const rows = logs.map(entry => [
    `"${entry.timestamp}"`,
    entry.epochMs,
    `"${entry.nodeId}"`,
    `"${entry.event}"`,
    `"${entry.feedstock}"`,
    entry.dosingRateKgHr.toFixed(1),
    entry.pH.toFixed(3),
    entry.totalAlkalinity_uMol.toFixed(1),
    entry.omegaAragonite.toFixed(2),
    entry.co2Drawdown_tonnes_h.toFixed(2),
    entry.cumulativeCo2Captured_tonnes.toFixed(3),
    entry.seawaterTemp_C.toFixed(2),
    entry.salinity_PSU.toFixed(2),
    entry.biomassVitality_pct.toFixed(1),
    entry.calcificationRate_mg.toFixed(2),
    entry.precipitationRisk_pct.toFixed(1),
    entry.gridInput_MW.toFixed(1),
    entry.sluiceGate_pct.toFixed(0)
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
