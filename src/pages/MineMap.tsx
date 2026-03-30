import { useState, useMemo } from 'react';
import { Zone, Worker, Vehicle, Device } from '@/lib/simulation';
import { StatusBadge } from '@/components/StatusBadge';
import { Users, Cpu, Wind, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  zones: Zone[];
  workers: Worker[];
  vehicles: Vehicle[];
  devices: Device[];
}

// Expanded mine layout matching reference: shafts on sides, 3 level rows, wider tunnels
const LAYOUT = {
  // Shaft columns (vertical dashed lines)
  shafts: [
    { label: 'Shaft A', x: 100 },
    { label: 'Shaft B', x: 1100 },
  ],
  // Level labels
  levelLabels: [
    { label: 'Level 1 West', x: 420, y: 118 },
    { label: 'Level 1 East', x: 820, y: 118 },
    { label: 'Main Drive', x: 600, y: 288 },
    { label: 'Level 2 West', x: 420, y: 438 },
    { label: 'Level 2 East', x: 820, y: 438 },
  ],
  // Zone placements: wider, more spacious
  zonePlacements: [
    { idx: 0, x: 130, y: 130, w: 310, h: 80 },   // Zone A (Level 1 West left)
    { idx: 1, x: 450, y: 130, w: 300, h: 80 },   // Zone B (Level 1 West right)
    { idx: 2, x: 760, y: 130, w: 310, h: 80 },   // Zone C (Level 1 East)
    { idx: 3, x: 130, y: 310, w: 310, h: 80 },   // Zone D (Main Drive left)
    { idx: 5, x: 450, y: 310, w: 300, h: 80 },   // Zone E (Main Drive center)
    { idx: 4, x: 760, y: 310, w: 310, h: 80 },   // Zone F (Main Drive right)
    { idx: 6, x: 130, y: 480, w: 310, h: 80 },   // Zone G (Level 2 West left)
    { idx: 7, x: 450, y: 480, w: 300, h: 80 },   // Zone H (Level 2 West right)
    { idx: 8, x: 760, y: 480, w: 310, h: 80 },   // Zone I (Level 2 East)
  ],
  // Airflow paths through tunnels
  airflowPaths: [
    // Level 1 horizontal
    { from: [260, 170], to: [600, 170] },
    { from: [600, 170], to: [920, 170] },
    // Main Drive horizontal
    { from: [260, 350], to: [600, 350] },
    { from: [600, 350], to: [920, 350] },
    // Level 2 horizontal
    { from: [260, 520], to: [600, 520] },
    { from: [600, 520], to: [920, 520] },
    // Shaft A vertical
    { from: [100, 130], to: [100, 210] },
    { from: [100, 260], to: [100, 310] },
    { from: [100, 390], to: [100, 480] },
    // Shaft B vertical
    { from: [1100, 130], to: [1100, 210] },
    { from: [1100, 260], to: [1100, 310] },
    { from: [1100, 390], to: [1100, 480] },
  ],
};

const riskColor = (level: string) => {
  if (level === 'critical') return { bg: 'rgba(239,68,68,0.22)', border: '#ef4444', text: '#fca5a5' };
  if (level === 'warning') return { bg: 'rgba(234,179,8,0.18)', border: '#ca8a04', text: '#fde047' };
  return { bg: 'rgba(34,197,94,0.10)', border: '#22c55e', text: '#86efac' };
};

const deviceIcon = (type: Device['type']) => {
  switch (type) {
    case 'gas_sensor': return '◆';
    case 'env_sensor': return '■';
    case 'ble_tracker': return '▲';
    case 'rfid_reader': return '✦';
    case 'gateway': return '●';
  }
};

const deviceColor = (type: Device['type']) => {
  switch (type) {
    case 'gas_sensor': return '#f59e0b';
    case 'env_sensor': return '#3b82f6';
    case 'ble_tracker': return '#10b981';
    case 'rfid_reader': return '#a855f7';
    case 'gateway': return '#ec4899';
  }
};

export default function MineMap({ zones, workers, vehicles, devices }: Props) {
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showWorkers, setShowWorkers] = useState(true);
  const [showDevices, setShowDevices] = useState(true);
  const [showAirflow, setShowAirflow] = useState(true);

  const getZoneWorkers = (zoneId: string) => workers.filter(w => w.zone === zoneId);
  const getZoneVehicles = (zoneId: string) => vehicles.filter(v => v.zone === zoneId);

  // Seed-based pseudo-random positions for entities within zones
  const entityPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const seededRand = (seed: number) => {
      const x = Math.sin(seed * 9301 + 49297) % 1;
      return x - Math.floor(x);
    };
    workers.forEach((w, i) => {
      const placement = LAYOUT.zonePlacements.find(p => zones[p.idx]?.id === w.zone);
      if (placement) {
        positions[w.id] = {
          x: placement.x + 30 + seededRand(i * 7 + 1) * (placement.w - 60),
          y: placement.y + 18 + seededRand(i * 13 + 3) * (placement.h - 36),
        };
      }
    });
    vehicles.forEach((v, i) => {
      const placement = LAYOUT.zonePlacements.find(p => zones[p.idx]?.id === v.zone);
      if (placement) {
        positions[v.id] = {
          x: placement.x + 30 + seededRand(i * 11 + 5) * (placement.w - 60),
          y: placement.y + 18 + seededRand(i * 17 + 7) * (placement.h - 36),
        };
      }
    });
    devices.forEach((d, i) => {
      const placement = LAYOUT.zonePlacements.find(p => zones[p.idx]?.id === d.zone);
      if (placement) {
        positions[d.id] = {
          x: placement.x + 20 + seededRand(i * 23 + 11) * (placement.w - 40),
          y: placement.y + 15 + seededRand(i * 29 + 13) * (placement.h - 30),
        };
      }
    });
    return positions;
  }, [workers, vehicles, devices, zones]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-mono tracking-wide">Mine Map Visualization</h2>
          <p className="text-xs text-muted-foreground">2D tunnel layout · Sensors, workers &amp; airflow overlay</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={showWorkers ? 'default' : 'outline'} onClick={() => setShowWorkers(!showWorkers)} className="text-xs font-mono gap-1.5">
            <Users className="h-3.5 w-3.5" /> Workers
          </Button>
          <Button size="sm" variant={showDevices ? 'default' : 'outline'} onClick={() => setShowDevices(!showDevices)} className="text-xs font-mono gap-1.5">
            <Cpu className="h-3.5 w-3.5" /> Devices
          </Button>
          <Button size="sm" variant={showAirflow ? 'default' : 'outline'} onClick={() => setShowAirflow(!showAirflow)} className="text-xs font-mono gap-1.5">
            <Wind className="h-3.5 w-3.5" /> Airflow
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
        {/* SVG Mine Map */}
        <div className="card-industrial p-3 overflow-hidden">
          <svg viewBox="0 0 1200 620" className="w-full h-auto">
            <defs>
              <linearGradient id="shaftGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.25" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.05" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                <polygon points="0 0, 6 2, 0 4" fill="hsl(var(--accent))" opacity="0.7" />
              </marker>
            </defs>

            {/* Background */}
            <rect x="0" y="0" width="1200" height="620" rx="8" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" />

            {/* Level background rows */}
            <rect x="120" y="115" width="960" height="95" rx="4" fill="rgba(255,255,255,0.02)" stroke="hsl(var(--border))" strokeWidth="0.5" strokeOpacity="0.3" />
            <rect x="120" y="270" width="960" height="40" rx="4" fill="rgba(255,255,255,0.03)" stroke="hsl(var(--border))" strokeWidth="0.5" strokeOpacity="0.3" />
            <rect x="120" y="295" width="960" height="95" rx="4" fill="rgba(255,255,255,0.02)" stroke="hsl(var(--border))" strokeWidth="0.5" strokeOpacity="0.3" />
            <rect x="120" y="440" width="960" height="40" rx="4" fill="rgba(255,255,255,0.03)" stroke="hsl(var(--border))" strokeWidth="0.5" strokeOpacity="0.3" />
            <rect x="120" y="465" width="960" height="95" rx="4" fill="rgba(255,255,255,0.02)" stroke="hsl(var(--border))" strokeWidth="0.5" strokeOpacity="0.3" />

            {/* Shaft columns - vertical dashed lines */}
            {LAYOUT.shafts.map(shaft => (
              <g key={shaft.label}>
                <line x1={shaft.x} y1="80" x2={shaft.x} y2="575" stroke="hsl(var(--accent))" strokeWidth="1.5" strokeDasharray="8 6" strokeOpacity="0.4">
                  <animate attributeName="stroke-dashoffset" from="28" to="0" dur="3s" repeatCount="indefinite" />
                </line>
                <text x={shaft.x} y="70" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12" fontFamily="monospace" fontWeight="bold">{shaft.label}</text>
              </g>
            ))}

            {/* Level labels */}
            {LAYOUT.levelLabels.map(ll => (
              <text key={ll.label} x={ll.x} y={ll.y} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="monospace" opacity="0.6">{ll.label}</text>
            ))}

            {/* Airflow paths */}
            {showAirflow && LAYOUT.airflowPaths.map((path, i) => (
              <line
                key={`airflow-${i}`}
                x1={path.from[0]} y1={path.from[1]}
                x2={path.to[0]} y2={path.to[1]}
                stroke="hsl(var(--accent))"
                strokeWidth="1.5"
                strokeDasharray="10 5"
                strokeOpacity="0.45"
                markerEnd="url(#arrowhead)"
              >
                <animate attributeName="stroke-dashoffset" from="30" to="0" dur="2.5s" repeatCount="indefinite" />
              </line>
            ))}

            {/* Zone rectangles */}
            {LAYOUT.zonePlacements.map(({ idx, x, y, w, h }) => {
              const zone = zones[idx];
              if (!zone) return null;
              const colors = riskColor(zone.riskLevel);
              const isSelected = selectedZone?.id === zone.id;

              return (
                <g key={zone.id} onClick={() => { setSelectedZone(zone); setSelectedDevice(null); }} style={{ cursor: 'pointer' }}>
                  <rect
                    x={x} y={y} width={w} height={h} rx="4"
                    fill={colors.bg}
                    stroke={isSelected ? 'hsl(var(--accent))' : colors.border}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeOpacity={isSelected ? 1 : 0.6}
                    strokeDasharray={isSelected ? 'none' : '6 3'}
                  />
                  {/* CO label pill */}
                  <rect x={x + w / 2 - 55} y={y + h / 2 - 10} width="110" height="20" rx="10" fill="rgba(0,0,0,0.65)" />
                  <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fill={colors.text} fontSize="10" fontFamily="monospace" fontWeight="bold">
                    CO: {zone.gasLevels.CO.toFixed(1)} ppm
                  </text>
                </g>
              );
            })}

            {/* Workers as cyan circles with glow */}
            {showWorkers && workers.map(w => {
              const pos = entityPositions[w.id];
              if (!pos) return null;
              return (
                <g key={w.id} filter="url(#glow)">
                  <circle cx={pos.x} cy={pos.y} r="7" fill="#22d3ee" opacity="0.85">
                    <animate attributeName="r" values="7;8;7" dur="3s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={pos.x} cy={pos.y} r="3" fill="#fff" opacity="0.8" />
                </g>
              );
            })}

            {/* Vehicles as orange squares with pulse animation */}
            {showWorkers && vehicles.map(v => {
              const pos = entityPositions[v.id];
              if (!pos) return null;
              return (
                <g key={v.id} filter="url(#glow)">
                  <rect x={pos.x - 7} y={pos.y - 7} width="14" height="14" rx="2" fill="#f97316" opacity="0.9">
                    <animate attributeName="opacity" values="0.9;0.6;0.9" dur="2s" repeatCount="indefinite" />
                  </rect>
                  <rect x={pos.x - 3} y={pos.y - 3} width="6" height="6" rx="1" fill="#fff" opacity="0.7" />
                </g>
              );
            })}

            {/* Devices */}
            {showDevices && devices.map(d => {
              const pos = entityPositions[d.id];
              if (!pos) return null;
              return (
                <text
                  key={d.id}
                  x={pos.x} y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={deviceColor(d.type)}
                  fontSize="12"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); setSelectedDevice(d); setSelectedZone(null); }}
                >
                  {deviceIcon(d.type)}
                </text>
              );
            })}

            {/* Legend bar */}
            <g transform="translate(180, 595)">
              <circle cx="0" cy="0" r="5" fill="#22d3ee" />
              <text x="12" y="4" fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="monospace">Worker</text>
              <rect x="75" y="-5" width="10" height="10" rx="2" fill="#f97316" />
              <text x="90" y="4" fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="monospace">Vehicle</text>
              <text x="175" y="4" fill="#f59e0b" fontSize="11" fontFamily="monospace">◆</text>
              <text x="190" y="4" fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="monospace">Gas Sensor</text>
              <text x="285" y="4" fill="#3b82f6" fontSize="11" fontFamily="monospace">■</text>
              <text x="300" y="4" fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="monospace">Env Sensor</text>
              <text x="390" y="4" fill="#10b981" fontSize="11" fontFamily="monospace">▲</text>
              <text x="405" y="4" fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="monospace">BLE Tracker</text>
              <text x="505" y="4" fill="#a855f7" fontSize="11" fontFamily="monospace">✦</text>
              <text x="520" y="4" fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="monospace">RFID Reader</text>
            </g>

            <text x="600" y="612" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="monospace" opacity="0.5">
              ← North · Mine Level -350m · East →
            </text>
          </svg>
        </div>

        {/* Right Detail Panel */}
        <div className="space-y-4">
          <div className="card-industrial p-4 min-h-[300px]">
            {selectedZone ? (
              <div className="space-y-3">
                <h3 className="font-mono font-bold text-sm">{selectedZone.name}</h3>
                <StatusBadge level={selectedZone.riskLevel} />
                <div className="space-y-1.5 text-xs font-mono mt-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">CO</span><span className="text-accent">{selectedZone.gasLevels.CO.toFixed(1)} ppm</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">NO₂</span><span className="text-accent">{selectedZone.gasLevels.NO2.toFixed(2)} ppm</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">O₂</span><span className="text-accent">{selectedZone.gasLevels.O2.toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">CH₄</span><span className="text-accent">{selectedZone.gasLevels.CH4.toFixed(2)}%</span></div>
                  <div className="border-t border-border my-1.5" />
                  <div className="flex justify-between"><span className="text-muted-foreground">Temp</span><span>{selectedZone.temperature.toFixed(1)}°C</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Airflow</span><span>{selectedZone.airflow.toFixed(2)} m/s</span></div>
                </div>
                {/* Personnel */}
                <div className="mt-3">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                    Personnel ({getZoneWorkers(selectedZone.id).length + getZoneVehicles(selectedZone.id).length})
                  </p>
                  <div className="space-y-1 text-xs font-mono">
                    {getZoneWorkers(selectedZone.id).map(w => (
                      <div key={w.id} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                        <span>{w.name}</span>
                      </div>
                    ))}
                    {getZoneVehicles(selectedZone.id).map(v => (
                      <div key={v.id} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-sm bg-orange-500 shrink-0" />
                        <span>{v.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : selectedDevice ? (
              <div className="space-y-3">
                <h3 className="font-mono font-bold text-sm">{selectedDevice.name}</h3>
                <StatusBadge level={selectedDevice.status === 'active' ? 'safe' : selectedDevice.status === 'fault' ? 'critical' : 'warning'} label={selectedDevice.status} />
                <div className="text-xs font-mono space-y-1.5">
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{selectedDevice.type.replace('_', ' ')}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Zone</span><span>{zones.find(z => z.id === selectedDevice.zone)?.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Battery</span><span>{selectedDevice.battery}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Health</span><span>{selectedDevice.health}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Uptime</span><span>{selectedDevice.uptime.toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Last Comm</span><span>{selectedDevice.lastComm.toLocaleTimeString()}</span></div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-12">
                <TriangleAlert className="h-10 w-10 opacity-25" />
                <p className="text-xs font-mono text-center">Click a zone or device<br />to view details</p>
              </div>
            )}
          </div>

          {/* Zone Status Legend */}
          <div className="card-industrial p-4">
            <h4 className="text-[10px] font-mono font-bold mb-3 tracking-wider uppercase text-muted-foreground">Zone Status</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="w-3 h-3 rounded-sm border border-emerald-500 bg-emerald-500/20" /> Safe
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="w-3 h-3 rounded-sm border border-amber-500 bg-amber-500/20" /> Warning
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="w-3 h-3 rounded-sm border border-destructive bg-destructive/20" /> Critical
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
