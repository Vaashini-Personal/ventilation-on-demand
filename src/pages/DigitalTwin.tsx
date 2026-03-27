import { useState, useEffect, useMemo, useCallback } from 'react';
import { Zone, Device, Worker, Vehicle, GasLevels, calcRisk, RiskLevel } from '@/lib/simulation';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Wind, Flame, Droplets, Users, Truck, Power, AlertTriangle, Activity,
  Thermometer, Radio, ChevronRight, Zap, ShieldAlert, TrendingUp,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Settings, Eye, Cpu,
  Battery, Wifi, BarChart3, Target, Navigation, Gauge, Fan
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';

interface Props {
  zones: Zone[];
  devices: Device[];
  workers: Worker[];
  vehicles: Vehicle[];
  alerts: { id: string; type: string; severity: RiskLevel; message: string; zone: string; timestamp: Date; acknowledged: boolean }[];
  onToggleFan: (zoneId: string) => void;
}

type SimScenario = {
  addWorkers: number;
  addVehicles: number;
  gasBoost: number;
  fanOverride: boolean | null;
};

const AIRFLOW_ARROWS: Record<string, typeof ArrowUp> = {
  north: ArrowUp, south: ArrowDown, east: ArrowRight, west: ArrowLeft,
};

// Predict conditions based on current data + simulation parameters
function predictZone(zone: Zone, sim: SimScenario) {
  const vehicleGasImpact = sim.addVehicles * 3.5;
  const workerHeatImpact = sim.addWorkers * 0.3;
  const fanEffect = sim.fanOverride === true ? 0.6 : sim.fanOverride === false ? 1.4 : 1.0;

  const predictedGas: GasLevels = {
    CO: Math.max(0, (zone.gasLevels.CO + sim.gasBoost * 5 + vehicleGasImpact) * fanEffect),
    NO2: Math.max(0, (zone.gasLevels.NO2 + vehicleGasImpact * 0.08) * fanEffect),
    O2: Math.min(21, zone.gasLevels.O2 - (sim.gasBoost * 0.15 + vehicleGasImpact * 0.05) * fanEffect),
    CH4: Math.max(0, (zone.gasLevels.CH4 + sim.gasBoost * 0.12) * fanEffect),
  };
  const predictedTemp = zone.temperature + workerHeatImpact + vehicleGasImpact * 0.15;
  const predictedAirflow = sim.fanOverride === true
    ? Math.min(10, zone.airflow * 1.5)
    : sim.fanOverride === false ? zone.airflow * 0.3 : zone.airflow;

  const risk = calcRisk(predictedGas, predictedTemp);
  const suggestedFanSpeed = risk === 'critical' ? 100 : risk === 'warning' ? 85 : zone.fanSpeed;

  const actions: string[] = [];
  if (risk === 'critical') {
    actions.push('⚠️ EVACUATE zone immediately');
    actions.push('🔄 Activate emergency ventilation');
    actions.push('📡 Alert safety team');
  } else if (risk === 'warning') {
    actions.push(`🌀 Increase fan speed to ${suggestedFanSpeed}%`);
    actions.push('🔄 Reroute airflow from adjacent zones');
    if (sim.addVehicles > 0) actions.push('🚛 Limit vehicle operations');
  } else {
    actions.push('✅ Conditions nominal');
    actions.push('📊 Continue standard monitoring');
  }

  return { predictedGas, predictedTemp, predictedAirflow, risk, suggestedFanSpeed, actions };
}

// Gas heatmap color
function gasHeatColor(co: number): string {
  if (co > 35) return 'hsl(var(--destructive))';
  if (co > 20) return 'hsl(var(--warning))';
  if (co > 10) return 'hsl(var(--warning) / 0.5)';
  return 'hsl(var(--success))';
}

function riskBorderClass(risk: RiskLevel) {
  if (risk === 'critical') return 'border-destructive shadow-[0_0_12px_hsl(var(--destructive)/0.4)]';
  if (risk === 'warning') return 'border-warning shadow-[0_0_12px_hsl(var(--warning)/0.3)]';
  return 'border-success/40';
}

function riskBgClass(risk: RiskLevel) {
  if (risk === 'critical') return 'bg-destructive/15';
  if (risk === 'warning') return 'bg-warning/10';
  return 'bg-success/5';
}

export default function DigitalTwin({ zones, devices, workers, vehicles, alerts, onToggleFan }: Props) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showAirflow, setShowAirflow] = useState(true);
  const [showWorkers, setShowWorkers] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showDevices, setShowDevices] = useState(true);
  const [sim, setSim] = useState<SimScenario>({ addWorkers: 0, addVehicles: 0, gasBoost: 0, fanOverride: null });

  const selectedZone = useMemo(() => zones.find(z => z.id === selectedZoneId) || null, [zones, selectedZoneId]);
  const selectedDevice = useMemo(() => devices.find(d => d.id === selectedDeviceId) || null, [devices, selectedDeviceId]);

  const prediction = useMemo(() => {
    if (!selectedZone) return null;
    return predictZone(selectedZone, sim);
  }, [selectedZone, sim]);

  const zoneWorkers = useCallback((zoneId: string) => workers.filter(w => w.zone === zoneId), [workers]);
  const zoneVehicles = useCallback((zoneId: string) => vehicles.filter(v => v.zone === zoneId), [vehicles]);
  const zoneDevices = useCallback((zoneId: string) => devices.filter(d => d.zone === zoneId), [devices]);
  const zoneAlerts = useMemo(() => alerts.filter(a => !a.acknowledged && selectedZoneId && a.zone === selectedZoneId), [alerts, selectedZoneId]);

  // Global alerts for right panel
  const activeAlerts = useMemo(() => alerts.filter(a => !a.acknowledged).sort((a, b) => {
    const sev = { critical: 0, warning: 1, safe: 2 };
    return sev[a.severity] - sev[b.severity];
  }), [alerts]);

  // Global predictions (30-60 min)
  const globalPredictions = useMemo(() => {
    const preds: { zone: string; risk: RiskLevel; co30: number; co60: number; o2_30: number }[] = [];
    zones.forEach(z => {
      const trend = z.gasLevels.CO > 15 ? 2.5 : z.gasLevels.CO > 8 ? 1.0 : 0.3;
      const co30 = z.gasLevels.CO + trend * 10;
      const co60 = z.gasLevels.CO + trend * 20;
      const o2_30 = z.gasLevels.O2 - trend * 0.3;
      const risk30 = calcRisk({ ...z.gasLevels, CO: co30 }, z.temperature);
      preds.push({ zone: z.name, risk: risk30, co30, co60, o2_30 });
    });
    return preds.filter(p => p.risk !== 'safe');
  }, [zones]);

  // Zone grid positions for SVG mine layout
  const zoneLayout = useMemo(() => {
    const cols = 3;
    const cellW = 200, cellH = 140, padX = 30, padY = 30;
    return zones.map((z, i) => ({
      zone: z,
      x: (i % cols) * (cellW + padX) + padX,
      y: Math.floor(i / cols) * (cellH + padY) + padY,
      w: cellW,
      h: cellH,
    }));
  }, [zones]);

  const svgW = 720, svgH = 520;

  const resetSim = () => setSim({ addWorkers: 0, addVehicles: 0, gasBoost: 0, fanOverride: null });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-mono tracking-wider">DIGITAL TWIN — MINE VENTILATION & OPERATIONS</h2>
          <p className="text-xs text-muted-foreground">Real-time interactive mine replica · IoT · Fleet · Ventilation Intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <input type="checkbox" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} className="accent-warning rounded" />
            Heatmap
          </label>
          <label className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <input type="checkbox" checked={showAirflow} onChange={e => setShowAirflow(e.target.checked)} className="accent-accent rounded" />
            Airflow
          </label>
          <label className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <input type="checkbox" checked={showWorkers} onChange={e => setShowWorkers(e.target.checked)} className="accent-primary rounded" />
            Workers
          </label>
          <label className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <input type="checkbox" checked={showVehicles} onChange={e => setShowVehicles(e.target.checked)} className="accent-warning rounded" />
            Vehicles
          </label>
          <label className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <input type="checkbox" checked={showDevices} onChange={e => setShowDevices(e.target.checked)} className="accent-accent rounded" />
            Devices
          </label>
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_300px] gap-4">

        {/* LEFT: Simulation Controls */}
        <div className="space-y-3">
          <div className="card-industrial">
            <h3 className="text-xs font-mono font-bold text-accent flex items-center gap-1.5 mb-3">
              <Settings className="h-3.5 w-3.5" /> SIMULATION CONTROLS
            </h3>
            <p className="text-[10px] text-muted-foreground mb-3">What-if analysis — select a zone to simulate</p>

            {selectedZone ? (
              <div className="space-y-4">
                <div className="p-2 rounded bg-muted/50 border border-border">
                  <div className="text-xs font-mono font-bold">{selectedZone.name}</div>
                  <StatusBadge level={selectedZone.riskLevel} />
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                      <span>Add Workers</span><span>+{sim.addWorkers}</span>
                    </div>
                    <Slider value={[sim.addWorkers]} onValueChange={v => setSim(s => ({ ...s, addWorkers: v[0] }))} min={0} max={10} step={1} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                      <span>Add Vehicles</span><span>+{sim.addVehicles}</span>
                    </div>
                    <Slider value={[sim.addVehicles]} onValueChange={v => setSim(s => ({ ...s, addVehicles: v[0] }))} min={0} max={5} step={1} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                      <span>Gas Level Boost</span><span>+{sim.gasBoost * 5} ppm CO</span>
                    </div>
                    <Slider value={[sim.gasBoost]} onValueChange={v => setSim(s => ({ ...s, gasBoost: v[0] }))} min={0} max={10} step={1} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground">Fan Override</span>
                    <div className="flex gap-1">
                      {(['on', 'off', 'auto'] as const).map(opt => (
                        <button
                          key={opt}
                          onClick={() => setSim(s => ({ ...s, fanOverride: opt === 'on' ? true : opt === 'off' ? false : null }))}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                            (opt === 'on' && sim.fanOverride === true) || (opt === 'off' && sim.fanOverride === false) || (opt === 'auto' && sim.fanOverride === null)
                              ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {opt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button onClick={resetSim} className="w-full text-[10px] font-mono text-muted-foreground hover:text-foreground py-1 border border-border rounded transition-colors">
                  RESET SIMULATION
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Select a zone on the map to begin simulation</p>
              </div>
            )}
          </div>

          {/* Simulation Output */}
          {prediction && selectedZone && (sim.addWorkers > 0 || sim.addVehicles > 0 || sim.gasBoost > 0 || sim.fanOverride !== null) && (
            <div className="card-industrial">
              <h3 className="text-xs font-mono font-bold text-warning flex items-center gap-1.5 mb-3">
                <TrendingUp className="h-3.5 w-3.5" /> SIMULATION OUTPUT
              </h3>
              <div className="space-y-2 text-[11px] font-mono">
                <div className="flex justify-between"><span className="text-muted-foreground">Predicted CO</span><span className={prediction.risk === 'critical' ? 'text-destructive' : prediction.risk === 'warning' ? 'text-warning' : 'text-foreground'}>{prediction.predictedGas.CO.toFixed(1)} ppm</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Predicted NO₂</span><span>{prediction.predictedGas.NO2.toFixed(2)} ppm</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Predicted O₂</span><span className={prediction.predictedGas.O2 < 19.5 ? 'text-destructive' : ''}>{prediction.predictedGas.O2.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Predicted CH₄</span><span>{prediction.predictedGas.CH4.toFixed(2)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Temperature</span><span>{prediction.predictedTemp.toFixed(1)}°C</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Airflow</span><span>{prediction.predictedAirflow.toFixed(1)} m/s</span></div>
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Risk Level</span><StatusBadge level={prediction.risk} /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fan Speed</span><span>{prediction.suggestedFanSpeed}%</span></div>
              </div>
            </div>
          )}

          {/* Ventilation Intelligence */}
          {selectedZone && (
            <div className="card-industrial">
              <h3 className="text-xs font-mono font-bold text-primary flex items-center gap-1.5 mb-3">
                <Fan className="h-3.5 w-3.5" /> VENTILATION INTELLIGENCE
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">Fan Status</span>
                  <Switch checked={selectedZone.fanActive} onCheckedChange={() => onToggleFan(selectedZone.id)} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">Current Speed</span>
                  <span>{selectedZone.fanSpeed}%</span>
                </div>
                <Progress value={selectedZone.fanSpeed} className="h-1.5" />
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">Airflow</span>
                  <span>{selectedZone.airflow.toFixed(2)} m/s</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">Direction</span>
                  <span className="flex items-center gap-1 capitalize">
                    {(() => { const Icon = AIRFLOW_ARROWS[selectedZone.airflowDirection]; return <Icon className="h-3 w-3" />; })()}
                    {selectedZone.airflowDirection}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CENTER: Mine Twin Visualization */}
        <div className="card-industrial grid-overlay min-h-[520px] relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-mono text-muted-foreground">MINE ZONE NETWORK — DIGITAL TWIN</h3>
            <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" />Safe</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" />Warning</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" />Critical</span>
            </div>
          </div>

          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full" style={{ minHeight: 460 }}>
            <defs>
              <marker id="airArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--accent) / 0.6)" />
              </marker>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Connection lines */}
            {zones.map(z => z.connected.map(cId => {
              const a = zoneLayout.find(zl => zl.zone.id === z.id);
              const b = zoneLayout.find(zl => zl.zone.id === cId);
              if (!a || !b) return null;
              const key = [z.id, cId].sort().join('-');
              return (
                <line
                  key={key}
                  x1={a.x + a.w / 2} y1={a.y + a.h / 2}
                  x2={b.x + b.w / 2} y2={b.y + b.h / 2}
                  stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="4 3"
                  opacity={0.5}
                />
              );
            }))}

            {/* Airflow animated lines */}
            {showAirflow && zones.map(z => {
              const a = zoneLayout.find(zl => zl.zone.id === z.id);
              if (!a) return null;
              const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
              const dirs: Record<string, [number, number]> = { north: [0, -50], south: [0, 50], east: [50, 0], west: [-50, 0] };
              const [dx, dy] = dirs[z.airflowDirection] || [0, -50];
              return (
                <g key={`air-${z.id}`}>
                  <line
                    x1={cx} y1={cy} x2={cx + dx} y2={cy + dy}
                    stroke="hsl(var(--accent) / 0.5)" strokeWidth="2"
                    markerEnd="url(#airArrow)" strokeDasharray="6 4"
                  >
                    <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
                  </line>
                </g>
              );
            })}

            {/* Zone rectangles */}
            {zoneLayout.map(({ zone, x, y, w, h }) => {
              const isSelected = selectedZoneId === zone.id;
              const fillColor = showHeatmap ? gasHeatColor(zone.gasLevels.CO) : 'hsl(var(--card))';
              const zw = zoneWorkers(zone.id);
              const zv = zoneVehicles(zone.id);
              const zd = zoneDevices(zone.id);

              return (
                <g key={zone.id} onClick={() => { setSelectedZoneId(zone.id); setSelectedDeviceId(null); resetSim(); }} className="cursor-pointer">
                  {/* Heatmap glow */}
                  {showHeatmap && zone.gasLevels.CO > 15 && (
                    <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={10} fill={fillColor} opacity={0.12} filter="url(#glow)" />
                  )}
                  {/* Zone body */}
                  <rect
                    x={x} y={y} width={w} height={h} rx={6}
                    fill={showHeatmap ? `${fillColor}` : 'hsl(var(--card))'}
                    fillOpacity={showHeatmap ? 0.15 : 0.8}
                    stroke={isSelected ? 'hsl(var(--accent))' : zone.riskLevel === 'critical' ? 'hsl(var(--destructive))' : zone.riskLevel === 'warning' ? 'hsl(var(--warning))' : 'hsl(var(--success) / 0.4)'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  {/* Zone name */}
                  <text x={x + 8} y={y + 16} fill="hsl(var(--foreground))" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
                    {zone.name}
                  </text>
                  {/* Status badge */}
                  <rect x={x + w - 52} y={y + 5} width={44} height={16} rx={3}
                    fill={zone.riskLevel === 'critical' ? 'hsl(var(--destructive) / 0.2)' : zone.riskLevel === 'warning' ? 'hsl(var(--warning) / 0.2)' : 'hsl(var(--success) / 0.2)'}
                  />
                  <circle cx={x + w - 44} cy={y + 13} r={3}
                    fill={zone.riskLevel === 'critical' ? 'hsl(var(--destructive))' : zone.riskLevel === 'warning' ? 'hsl(var(--warning))' : 'hsl(var(--success))'}
                  />
                  <text x={x + w - 38} y={y + 17} fill={zone.riskLevel === 'critical' ? 'hsl(var(--destructive))' : zone.riskLevel === 'warning' ? 'hsl(var(--warning))' : 'hsl(var(--success))'} fontSize="8" fontFamily="JetBrains Mono">
                    {zone.riskLevel.toUpperCase()}
                  </text>

                  {/* Gas readings */}
                  <text x={x + 8} y={y + 34} fill="hsl(var(--muted-foreground))" fontSize="8" fontFamily="JetBrains Mono">
                    CO: {zone.gasLevels.CO.toFixed(1)} · O₂: {zone.gasLevels.O2.toFixed(1)} · {zone.temperature.toFixed(0)}°C
                  </text>

                  {/* Fan indicator */}
                  <text x={x + 8} y={y + 48} fill={zone.fanActive ? 'hsl(var(--accent))' : 'hsl(var(--muted-foreground))'} fontSize="8" fontFamily="JetBrains Mono">
                    FAN: {zone.fanActive ? `ON ${zone.fanSpeed}%` : 'OFF'} · {zone.airflow.toFixed(1)} m/s
                  </text>

                  {/* Entity icons row */}
                  {showWorkers && zw.map((worker, wi) => (
                    <circle key={worker.id} cx={x + 12 + wi * 10} cy={y + h - 18} r={4} fill="hsl(var(--primary))" opacity={0.8}>
                      <title>{worker.name} ({worker.role})</title>
                    </circle>
                  ))}
                  {showVehicles && zv.map((veh, vi) => (
                    <rect key={veh.id} x={x + 12 + (zw.length + vi) * 10} y={y + h - 22} width={8} height={8} rx={1} fill="hsl(var(--warning))" opacity={0.8}>
                      <title>{veh.name} ({veh.type})</title>
                    </rect>
                  ))}
                  {showDevices && (
                    <text x={x + w - 48} y={y + h - 12} fill="hsl(var(--accent))" fontSize="8" fontFamily="JetBrains Mono">
                      📡 {zd.length}
                    </text>
                  )}

                  {/* Worker/Vehicle counts */}
                  <text x={x + 8} y={y + h - 6} fill="hsl(var(--muted-foreground))" fontSize="8" fontFamily="JetBrains Mono">
                    👷 {zw.length} · 🚛 {zv.length}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* RIGHT: Alerts, Actions, Predictions */}
        <div className="space-y-3">
          {/* Zone Details */}
          {selectedZone && (
            <div className={`card-industrial border ${riskBorderClass(selectedZone.riskLevel)}`}>
              <h3 className="text-xs font-mono font-bold flex items-center gap-1.5 mb-2">
                <Eye className="h-3.5 w-3.5 text-accent" /> ZONE DETAILS
              </h3>
              <div className="text-xs font-mono font-bold mb-1">{selectedZone.name}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
                <div className="flex justify-between"><span className="text-muted-foreground">CO</span><span>{selectedZone.gasLevels.CO.toFixed(1)} ppm</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">O₂</span><span>{selectedZone.gasLevels.O2.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CH₄</span><span>{selectedZone.gasLevels.CH4.toFixed(2)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">NO₂</span><span>{selectedZone.gasLevels.NO2.toFixed(2)} ppm</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Temp</span><span>{selectedZone.temperature.toFixed(1)}°C</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Airflow</span><span>{selectedZone.airflow.toFixed(2)} m/s</span></div>
              </div>

              {/* Device list for this zone */}
              <div className="mt-3 border-t border-border pt-2">
                <div className="text-[10px] font-mono text-muted-foreground mb-1">DEVICES IN ZONE ({zoneDevices(selectedZone.id).length})</div>
                <div className="space-y-1 max-h-[100px] overflow-auto">
                  {zoneDevices(selectedZone.id).map(d => (
                    <button
                      key={d.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedDeviceId(d.id); }}
                      className={`w-full flex items-center justify-between text-[10px] font-mono p-1 rounded transition-colors hover:bg-muted/50 ${selectedDeviceId === d.id ? 'bg-muted' : ''}`}
                    >
                      <span className="flex items-center gap-1">
                        <Cpu className="h-3 w-3 text-accent" />
                        {d.name}
                      </span>
                      <span className={d.status === 'active' ? 'text-success' : d.status === 'fault' ? 'text-destructive' : 'text-muted-foreground'}>
                        {d.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Device Detail */}
          {selectedDevice && (
            <div className="card-industrial">
              <h3 className="text-xs font-mono font-bold flex items-center gap-1.5 mb-2">
                <Cpu className="h-3.5 w-3.5 text-accent" /> DEVICE DETAIL
              </h3>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="font-bold">{selectedDevice.name}</div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{selectedDevice.type.replace('_', ' ')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={selectedDevice.status === 'active' ? 'text-success' : selectedDevice.status === 'fault' ? 'text-destructive' : 'text-warning'}>{selectedDevice.status}</span></div>
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Battery</span><span className="flex items-center gap-1"><Battery className="h-3 w-3" />{selectedDevice.battery}%</span></div>
                <Progress value={selectedDevice.battery} className="h-1" />
                <div className="flex justify-between"><span className="text-muted-foreground">Health</span><span className={selectedDevice.health === 'normal' ? 'text-success' : 'text-warning'}>{selectedDevice.health}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Uptime</span><span>{selectedDevice.uptime.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Last Comm</span><span>{selectedDevice.lastComm.toLocaleTimeString()}</span></div>
              </div>
            </div>
          )}

          {/* Active Alerts */}
          <div className="card-industrial">
            <h3 className="text-xs font-mono font-bold flex items-center gap-1.5 mb-2">
              <ShieldAlert className="h-3.5 w-3.5 text-destructive" /> ALERTS & RISK ({activeAlerts.length})
            </h3>
            <div className="space-y-1.5 max-h-[180px] overflow-auto">
              {activeAlerts.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">No active alerts</p>
              ) : activeAlerts.slice(0, 8).map(a => (
                <div key={a.id} className={`p-1.5 rounded text-[10px] font-mono border ${
                  a.severity === 'critical' ? 'border-destructive/30 bg-destructive/5' : 'border-warning/30 bg-warning/5'
                }`}>
                  <div className="flex items-start gap-1">
                    <AlertTriangle className={`h-3 w-3 mt-0.5 shrink-0 ${a.severity === 'critical' ? 'text-destructive' : 'text-warning'}`} />
                    <span className="text-muted-foreground leading-tight">{a.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Actions */}
          {prediction && selectedZone && (
            <div className="card-industrial">
              <h3 className="text-xs font-mono font-bold flex items-center gap-1.5 mb-2">
                <Zap className="h-3.5 w-3.5 text-warning" /> RECOMMENDED ACTIONS
              </h3>
              <div className="space-y-1.5">
                {prediction.actions.map((action, i) => (
                  <div key={i} className="text-[10px] font-mono text-muted-foreground p-1.5 rounded bg-muted/30 border border-border">
                    {action}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predictions 30-60 min */}
          {globalPredictions.length > 0 && (
            <div className="card-industrial">
              <h3 className="text-xs font-mono font-bold flex items-center gap-1.5 mb-2">
                <BarChart3 className="h-3.5 w-3.5 text-warning" /> PREDICTIONS (30-60 MIN)
              </h3>
              <div className="space-y-1.5 max-h-[150px] overflow-auto">
                {globalPredictions.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] font-mono p-1 rounded bg-muted/20">
                    <span className="truncate max-w-[120px]">{p.zone}</span>
                    <div className="flex items-center gap-2">
                      <span className={p.risk === 'critical' ? 'text-destructive' : 'text-warning'}>CO:{p.co30.toFixed(0)}</span>
                      <StatusBadge level={p.risk} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
