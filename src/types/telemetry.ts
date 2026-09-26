export type FeedstockType = 'Ca(OH)2' | 'NaOH' | 'Olivine' | 'BPMED';

export interface SensorNode {
  id: string;
  name: string;
  code: string;
  depthMeters: number;
  coordinates: [number, number, number]; // [x, y, z] in 3D world
  zone: string;
  pH: number;
  alkalinity: number; // umol/kg
  temperature: number; // Celsius
  salinity: number; // PSU
  omegaAragonite: number;
  co2Drawdown: number; // Tonnes/Hr
  signalStrength: number; // %
  status: 'ONLINE' | 'CALIBRATING' | 'WARNING';
}

export interface BiogeochemicalState {
  pH: number;
  totalAlkalinity: number; // umol/kg
  omegaAragonite: number; // Aragonite saturation state
  co2DrawdownRate: number; // Tonnes/Hr
  totalCo2Captured: number; // Tonnes cumulative
  dic: number; // Dissolved Inorganic Carbon (umol/kg)
  seawaterTemp: number; // deg C
  salinity: number; // PSU
  pCo2Air: number; // ppm
  pCo2Water: number; // ppm
  biomassVitality: number; // %
  algaeBiomassGL: number; // g/L mesocosm yield
  calcificationRate: number; // mg CaCO3 / cm2 / day
  phytoplanktonIndex: number; // Fv/Fm ratio
  secondaryPrecipitationRisk: number; // 0 - 100%
  traceNickelPpb: number; // ppb
  traceChromiumPpb: number; // ppb
  renewablePowerTotal: number; // MW
  windPower: number; // MW
  wavePower: number; // MW
  solarPower: number; // MW
  dosingRateKgHr: number; // kg of alkalinity feedstock per hour
  activeFeedstock: FeedstockType;
  dispenserStatus: 'Active' | 'Throttled' | 'Standby' | 'Dosing Burst';
  sluiceGateOpenPct: number; // 0 - 100%
}

export interface SubsystemInspection {
  id: string;
  title: string;
  address: string;
  integrity: number;
  load: string;
  status: string;
  description: string;
}

export interface TelemetryLogEntry {
  timestamp: string;
  epochMs: number;
  nodeId: string;
  event: string;
  feedstock: FeedstockType;
  dosingRateKgHr: number;
  pH: number;
  totalAlkalinity_uMol: number;
  omegaAragonite: number;
  co2Drawdown_tonnes_h: number;
  cumulativeCo2Captured_tonnes: number;
  seawaterTemp_C: number;
  salinity_PSU: number;
  biomassVitality_pct: number;
  calcificationRate_mg: number;
  precipitationRisk_pct: number;
  gridInput_MW: number;
  sluiceGate_pct: number;
}

export type CameraPreset = 'isometric' | 'plume' | 'biotest' | 'renewables' | 'sluice';
