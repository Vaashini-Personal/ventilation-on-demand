import { useMemo } from 'react';
import { Vehicle, Zone } from '@/lib/simulation';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Truck, Gauge, MapPin, Clock, Battery, Fuel, Activity, AlertTriangle,
  Navigation, Thermometer
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface Props {
  vehicles: Vehicle[];
  zones: Zone[];
}

export default function FleetManagement({ vehicles, zones }: Props) {
  const active = vehicles.filter(v => v.status === 'active').length;
  const idle = vehicles.filter(v => v.status === 'idle').length;
  const avgSpeed = vehicles.length ? (vehicles.reduce((s, v) => s + v.speed, 0) / vehicles.length) : 0;
  const zoneName = (id: string) => zones.find(z => z.id === id)?.name || id;

  // Zone distribution data
  const zoneDistribution = useMemo(() => {
    return zones.map(z => ({
      zone: z.name.length > 12 ? z.name.slice(0, 12) + '…' : z.name,
      vehicles: vehicles.filter(v => v.zone === z.id).length,
    })).filter(z => z.vehicles > 0);
  }, [zones, vehicles]);

  // Speed trend data
  const speedTrend = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      time: `${String(i * 2).padStart(2, '0')}:00`,
      avgSpeed: 8 + Math.random() * 12,
      maxSpeed: 15 + Math.random() * 10,
    }));
  }, []);

  // Vehicle detail data
  const vehicleDetails = useMemo(() => {
    return vehicles.map(v => ({
      ...v,
      fuel: Math.floor(40 + Math.random() * 55),
      engineTemp: Math.floor(70 + Math.random() * 30),
      odometer: Math.floor(1000 + Math.random() * 9000),
      hoursOperated: Math.floor(100 + Math.random() * 400),
      lastMaintenance: new Date(Date.now() - Math.random() * 30 * 86400000),
      nextMaintenance: new Date(Date.now() + Math.random() * 15 * 86400000),
    }));
  }, [vehicles]);

  const typeColor = (type: Vehicle['type']) => {
    switch (type) {
      case 'truck': return 'bg-primary/20 text-primary';
      case 'loader': return 'bg-warning/20 text-warning';
      case 'drill': return 'bg-success/20 text-success';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-mono flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Fleet Management
          </h2>
          <p className="text-xs text-muted-foreground">Real-time vehicle tracking, diagnostics, and zone allocation</p>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/20 text-success text-xs font-mono font-bold">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          LIVE
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="TOTAL FLEET" value={vehicles.length} icon={<Truck className="h-4 w-4" />} />
        <MetricCard title="ACTIVE" value={active} variant="success" icon={<Activity className="h-4 w-4" />} />
        <MetricCard title="IDLE" value={idle} variant={idle > 0 ? 'warning' : 'default'} icon={<Clock className="h-4 w-4" />} />
        <MetricCard title="AVG SPEED" value={`${avgSpeed.toFixed(1)} km/h`} icon={<Gauge className="h-4 w-4" />} />
        <MetricCard title="TYPES" value={[...new Set(vehicles.map(v => v.type))].length} />
        <MetricCard title="UTILIZATION" value={`${vehicles.length ? ((active / vehicles.length) * 100).toFixed(0) : 0}%`} variant={active / vehicles.length > 0.7 ? 'success' : 'warning'} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Zone Distribution */}
        <div className="card-industrial">
          <h3 className="text-sm font-mono font-bold mb-3">Zone Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={zoneDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="zone" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="vehicles" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Speed Trend */}
        <div className="card-industrial">
          <h3 className="text-sm font-mono font-bold mb-3">Speed Trend — 24h</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={speedTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} unit=" km/h" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="avgSpeed" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Avg Speed" />
              <Line type="monotone" dataKey="maxSpeed" stroke="hsl(var(--warning))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Max Speed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vehicle cards */}
      <div className="card-industrial">
        <h3 className="text-sm font-mono font-bold mb-3">Vehicle Fleet Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[500px] overflow-auto">
          {vehicleDetails.map(v => (
            <div key={v.id} className={`p-4 rounded-lg border text-xs font-mono ${
              v.status === 'active' ? 'border-success/30 bg-success/5' : 'border-border bg-muted/20'
            }`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${typeColor(v.type)}`}>
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{v.name}</p>
                    <p className="text-muted-foreground capitalize">{v.type}</p>
                  </div>
                </div>
                <StatusBadge level={v.status === 'active' ? 'safe' : 'warning'} label={v.status.toUpperCase()} />
              </div>

              {/* Location & Speed */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span className="truncate">{zoneName(v.zone)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Gauge className="h-3 w-3 text-primary" />
                  <span>{v.speed.toFixed(1)} km/h</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Fuel className="h-3 w-3" />
                    <span className="text-[10px]">Fuel</span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`absolute inset-y-0 left-0 rounded-full ${v.fuel > 50 ? 'bg-success' : v.fuel > 20 ? 'bg-warning' : 'bg-destructive'}`}
                      style={{ width: `${v.fuel}%` }} />
                  </div>
                  <span className="text-[10px] mt-0.5 text-foreground">{v.fuel}%</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Thermometer className="h-3 w-3" />
                    <span className="text-[10px]">Engine</span>
                  </div>
                  <span className={`text-[10px] font-bold ${v.engineTemp > 90 ? 'text-destructive' : 'text-foreground'}`}>
                    {v.engineTemp}°C
                  </span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px]">Hours</span>
                  </div>
                  <span className="text-[10px] text-foreground">{v.hoursOperated}h</span>
                </div>
              </div>

              {/* Movement history */}
              <div className="mt-3 pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                  <Navigation className="h-3 w-3" /> Recent Movement
                </p>
                <div className="flex gap-1 flex-wrap">
                  {v.history.slice(-3).map((h, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-muted rounded text-[9px] text-muted-foreground">
                      {zoneName(h.zone)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ventilation Integration */}
      <div className="card-industrial">
        <h3 className="text-sm font-mono font-bold mb-3">Ventilation Integration — Fan Auto-Adjust</h3>
        <div className="overflow-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 px-2 font-medium">Zone</th>
                <th className="text-left py-2 px-2 font-medium">Active Vehicles</th>
                <th className="text-left py-2 px-2 font-medium">Fan Status</th>
                <th className="text-left py-2 px-2 font-medium">Fan Speed</th>
                <th className="text-left py-2 px-2 font-medium">Airflow</th>
                <th className="text-left py-2 px-2 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {zones.map(z => {
                const vCount = vehicles.filter(v => v.zone === z.id && v.status === 'active').length;
                return (
                  <tr key={z.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 px-2 font-bold">{z.name}</td>
                    <td className="py-2 px-2">{vCount}</td>
                    <td className="py-2 px-2">
                      <span className={`font-bold ${z.fanActive ? 'text-success' : 'text-muted-foreground'}`}>
                        {z.fanActive ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {z.fanActive && (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${z.fanSpeed}%` }} />
                          </div>
                          <span>{z.fanSpeed}%</span>
                        </div>
                      )}
                      {!z.fanActive && <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2 px-2">{z.airflow.toFixed(1)} m/s</td>
                    <td className="py-2 px-2">
                      <StatusBadge level={z.riskLevel} label={z.riskLevel.toUpperCase()} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 border-t border-border pt-2">
          Fan speed auto-adjusts based on active vehicle count and emission levels in each zone
        </p>
      </div>
    </div>
  );
}
