import { useMemo } from 'react';
import { Device, Zone } from '@/lib/simulation';
import { MetricCard } from '@/components/MetricCard';
import {
  Battery, Wifi, WifiOff, AlertTriangle, CheckCircle, XCircle, Wrench,
  Activity, Signal, Clock, Radio
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  devices: Device[];
  zones: Zone[];
}

export default function DeviceHealth({ devices, zones }: Props) {
  const online = devices.filter(d => d.status === 'active').length;
  const offline = devices.filter(d => d.status === 'inactive').length;
  const faults = devices.filter(d => d.status === 'fault').length;
  const degraded = devices.filter(d => d.health === 'calibration_required').length;
  const lowBattery = devices.filter(d => d.battery < 20).length;
  const avgUptime = devices.length ? (devices.reduce((s, d) => s + d.uptime, 0) / devices.length) : 0;
  const overallHealth = devices.length ? ((online / devices.length) * 100).toFixed(0) : '0';

  const zoneName = (id: string) => zones.find(z => z.id === id)?.name || id;

  // Generate uptime chart data
  const uptimeData = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = `${String(i).padStart(2, '0')}:00`;
      const base = 75 + Math.sin(i * 0.5) * 10 + Math.random() * 8;
      return { time: hour, uptime: Math.min(100, Math.max(60, base)) };
    });
  }, []);

  // Devices requiring attention
  const attentionDevices = devices.filter(d => d.health !== 'normal' || d.status !== 'active');

  // Fault log entries
  const faultLog = useMemo(() => {
    const entries: { id: string; device: string; zone: string; type: string; description: string; severity: 'critical' | 'warning'; time: Date }[] = [];
    let idx = 0;
    devices.forEach(d => {
      if (d.health === 'fault') {
        entries.push({
          id: `FL-${String(++idx).padStart(3, '0')}`,
          device: d.name,
          zone: zoneName(d.zone),
          type: 'SENSOR_FAULT',
          description: `${d.type.replace('_', ' ')} sensor reading out of calibration range`,
          severity: 'critical',
          time: new Date(Date.now() - Math.random() * 7200000),
        });
      }
      if (d.health === 'calibration_required') {
        entries.push({
          id: `FL-${String(++idx).padStart(3, '0')}`,
          device: d.name,
          zone: zoneName(d.zone),
          type: 'CALIBRATION_REQUIRED',
          description: `Scheduled calibration overdue by ${Math.floor(Math.random() * 20 + 1)} days`,
          severity: 'warning',
          time: new Date(Date.now() - Math.random() * 72000000),
        });
      }
      if (d.status === 'inactive') {
        entries.push({
          id: `FL-${String(++idx).padStart(3, '0')}`,
          device: d.name,
          zone: zoneName(d.zone),
          type: 'CONNECTION_LOST',
          description: 'Intermittent connectivity — signal strength degraded',
          severity: 'warning',
          time: new Date(Date.now() - Math.random() * 18000000),
        });
      }
    });
    return entries;
  }, [devices, zones]);

  const typeIcon = (type: Device['type']) => {
    switch (type) {
      case 'gas_sensor': return <Activity className="h-4 w-4" />;
      case 'env_sensor': return <Activity className="h-4 w-4" />;
      case 'ble_tracker': return <Radio className="h-4 w-4" />;
      case 'rfid_reader': return <Signal className="h-4 w-4" />;
      case 'gateway': return <Wifi className="h-4 w-4" />;
    }
  };

  const statusColor = (d: Device) => {
    if (d.status === 'fault' || d.health === 'fault') return 'text-destructive';
    if (d.health === 'calibration_required' || d.status === 'inactive') return 'text-warning';
    return 'text-success';
  };

  const statusLabel = (d: Device) => {
    if (d.status === 'fault' || d.health === 'fault') return 'Degraded';
    if (d.health === 'calibration_required') return 'Degraded';
    if (d.status === 'inactive') return 'Offline';
    return 'Online';
  };

  const timeSince = (date: Date) => {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'Last less than a minute ago';
    if (mins < 60) return `Last ${mins} minutes ago`;
    const hrs = Math.floor(mins / 60);
    return `about ${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-mono flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Device Health Monitor
          </h2>
          <p className="text-xs text-muted-foreground">Connectivity, battery, and sensor diagnostics</p>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/20 text-success text-xs font-mono font-bold">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          LIVE
        </span>
      </div>

      {/* Summary metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="OVERALL HEALTH" value={`${overallHealth}%`} variant={Number(overallHealth) > 90 ? 'success' : 'warning'} />
        <MetricCard title="ONLINE" value={online} icon={<Wifi className="h-4 w-4" />} variant="success" />
        <MetricCard title="DEGRADED" value={degraded} icon={<AlertTriangle className="h-4 w-4" />} variant={degraded > 0 ? 'warning' : 'default'} />
        <MetricCard title="OFFLINE" value={offline} icon={<WifiOff className="h-4 w-4" />} variant={offline > 0 ? 'warning' : 'default'} />
        <MetricCard title="LOW BATTERY" value={lowBattery} icon={<Battery className="h-4 w-4" />} variant={lowBattery > 0 ? 'critical' : 'default'} />
        <MetricCard title="AVG UPTIME" value={`${avgUptime.toFixed(1)}%`} />
      </div>

      {/* Uptime chart + Attention devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Network Uptime Chart */}
        <div className="card-industrial">
          <h3 className="text-sm font-mono font-bold mb-3">Network Uptime — Last 24h</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={uptimeData}>
              <defs>
                <linearGradient id="uptimeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} interval={3} />
              <YAxis domain={[60, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area type="monotone" dataKey="uptime" stroke="hsl(var(--success))" fill="url(#uptimeGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Devices Requiring Attention */}
        <div className="card-industrial">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-mono font-bold">Devices Requiring Attention</h3>
            <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full font-mono">{attentionDevices.length} Issues</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[240px] overflow-auto">
            {attentionDevices.map(d => (
              <div key={d.id} className={`p-3 rounded-lg border text-xs font-mono ${
                d.health === 'fault' ? 'border-destructive/30 bg-destructive/5' : 'border-warning/30 bg-warning/5'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      d.health === 'fault' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'
                    }`}>
                      {typeIcon(d.type)}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{d.name}</p>
                      <p className="text-muted-foreground">{d.type.replace(/_/g, ' ').toUpperCase()} · {zoneName(d.zone)}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    d.health === 'fault' ? 'bg-destructive/20 text-destructive' : d.status === 'active' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                  }`}>
                    ● {statusLabel(d)}
                  </span>
                </div>

                {/* Issues */}
                <div className="space-y-0.5 mb-2">
                  {d.health === 'fault' && (
                    <p className="text-destructive flex items-center gap-1"><XCircle className="h-3 w-3" /> Sensor fault detected</p>
                  )}
                  {d.health === 'calibration_required' && (
                    <p className="text-warning flex items-center gap-1"><Wrench className="h-3 w-3" /> Calibration overdue</p>
                  )}
                  {d.status === 'inactive' && (
                    <p className="text-warning flex items-center gap-1"><WifiOff className="h-3 w-3" /> Intermittent connection loss</p>
                  )}
                  {d.battery < 20 && (
                    <p className="text-destructive flex items-center gap-1"><Battery className="h-3 w-3" /> Battery low ({d.battery}%)</p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-muted-foreground border-t border-border pt-2 mt-2">
                  <span>Uptime {d.uptime.toFixed(1)}%</span>
                  {d.battery < 100 && (
                    <span className="flex items-center gap-1">
                      <Battery className={`h-3 w-3 ${d.battery < 20 ? 'text-destructive' : ''}`} />
                      {d.battery}%
                    </span>
                  )}
                  <span>Signal {Math.floor(60 + Math.random() * 35)} dBm</span>
                  <span>{timeSince(d.lastComm)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fault Log Table */}
      <div className="card-industrial">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-mono font-bold">Fault Log</h3>
          <span className="text-[10px] text-muted-foreground font-mono">Recent events</span>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 px-2 font-medium">Event ID</th>
                <th className="text-left py-2 px-2 font-medium">Device</th>
                <th className="text-left py-2 px-2 font-medium">Zone</th>
                <th className="text-left py-2 px-2 font-medium">Event Type</th>
                <th className="text-left py-2 px-2 font-medium">Description</th>
                <th className="text-left py-2 px-2 font-medium">Severity</th>
                <th className="text-left py-2 px-2 font-medium">Time</th>
                <th className="text-left py-2 px-2 font-medium">Status</th>
                <th className="text-left py-2 px-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {faultLog.map(entry => (
                <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="py-2 px-2 text-muted-foreground">{entry.id}</td>
                  <td className="py-2 px-2 font-bold">{entry.device}</td>
                  <td className="py-2 px-2">{entry.zone}</td>
                  <td className="py-2 px-2">
                    <span className={`font-bold ${entry.type === 'SENSOR_FAULT' ? 'text-destructive' : 'text-warning'}`}>
                      {entry.type}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground max-w-[200px] truncate">{entry.description}</td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      entry.severity === 'critical' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'
                    }`}>
                      {entry.severity === 'critical' ? '● CRITICAL' : '● WARNING'}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeSince(entry.time)}
                  </td>
                  <td className="py-2 px-2 text-warning font-bold">Open</td>
                  <td className="py-2 px-2">
                    <button className="px-3 py-1 rounded bg-primary/20 text-primary text-[10px] font-bold hover:bg-primary/30 transition-colors">
                      Resolve
                    </button>
                  </td>
                </tr>
              ))}
              {faultLog.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-muted-foreground">No active faults</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
