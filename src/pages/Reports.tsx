import { useMemo } from 'react';
import { Zone, Device, Worker, Vehicle, Alert } from '@/lib/simulation';
import { MetricCard } from '@/components/MetricCard';
import {
  FileText, Download, TrendingUp, Shield, Clock, Users, Truck, Activity,
  AlertTriangle, CheckCircle, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

interface Props {
  zones: Zone[];
  devices: Device[];
  workers: Worker[];
  vehicles: Vehicle[];
  alerts: Alert[];
}

export default function Reports({ zones, devices, workers, vehicles, alerts }: Props) {
  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const acknowledged = alerts.filter(a => a.acknowledged).length;
  const onlineDevices = devices.filter(d => d.status === 'active').length;
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;

  // Safety compliance score
  const safetyScore = useMemo(() => {
    const safeZones = zones.filter(z => z.riskLevel === 'safe').length;
    return zones.length ? Math.round((safeZones / zones.length) * 100) : 0;
  }, [zones]);

  // Alert distribution by type
  const alertDistribution = useMemo(() => {
    const types: Record<string, number> = {};
    alerts.forEach(a => { types[a.type] = (types[a.type] || 0) + 1; });
    return Object.entries(types).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value,
    }));
  }, [alerts]);

  // Zone risk summary
  const zoneRiskSummary = useMemo(() => {
    return zones.map(z => ({
      zone: z.name.length > 15 ? z.name.slice(0, 15) + '…' : z.name,
      CO: Math.round(z.gasLevels.CO * 10) / 10,
      CH4: Math.round(z.gasLevels.CH4 * 100) / 100,
      temp: Math.round(z.temperature),
    }));
  }, [zones]);

  // Daily incident trend
  const incidentTrend = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(Date.now() - (6 - i) * 86400000);
      return {
        day: day.toLocaleDateString('en', { weekday: 'short' }),
        incidents: Math.floor(Math.random() * 8 + 1),
        resolved: Math.floor(Math.random() * 6 + 1),
      };
    });
  }, []);

  // Shift productivity
  const shiftData = useMemo(() => {
    return [
      { shift: 'Morning', workers: 5, vehicles: 3, uptime: 96.2, alerts: 2 },
      { shift: 'Afternoon', workers: 4, vehicles: 2, uptime: 94.8, alerts: 3 },
      { shift: 'Night', workers: 3, vehicles: 1, uptime: 91.5, alerts: 5 },
    ];
  }, []);

  const COLORS = [
    'hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--destructive))',
    'hsl(var(--success))', 'hsl(var(--muted-foreground))'
  ];

  const handleExport = (type: string) => {
    // placeholder
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-mono flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Operations Reports
          </h2>
          <p className="text-xs text-muted-foreground">Consolidated analytics, safety compliance, and shift reports</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary/20 text-primary text-xs font-mono font-bold hover:bg-primary/30 transition-colors">
            <Download className="h-3.5 w-3.5" /> Export PDF
          </button>
          <button onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-muted text-foreground text-xs font-mono font-bold hover:bg-muted/80 transition-colors">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="SAFETY SCORE" value={`${safetyScore}%`} icon={<Shield className="h-4 w-4" />} variant={safetyScore > 80 ? 'success' : 'warning'} />
        <MetricCard title="TOTAL ALERTS" value={totalAlerts} icon={<AlertTriangle className="h-4 w-4" />} variant={criticalAlerts > 0 ? 'critical' : 'default'} />
        <MetricCard title="ACKNOWLEDGED" value={acknowledged} icon={<CheckCircle className="h-4 w-4" />} variant="success" />
        <MetricCard title="DEVICES ONLINE" value={`${onlineDevices}/${devices.length}`} icon={<Activity className="h-4 w-4" />} />
        <MetricCard title="WORKERS" value={workers.length} icon={<Users className="h-4 w-4" />} />
        <MetricCard title="ACTIVE VEHICLES" value={activeVehicles} icon={<Truck className="h-4 w-4" />} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Incident Trend */}
        <div className="card-industrial lg:col-span-2">
          <h3 className="text-sm font-mono font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Weekly Incident Trend
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={incidentTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="incidents" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Incidents" />
              <Bar dataKey="resolved" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Resolved" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alert Distribution Pie */}
        <div className="card-industrial">
          <h3 className="text-sm font-mono font-bold mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Alert Distribution
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={alertDistribution}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {alertDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Zone Risk Overview */}
      <div className="card-industrial">
        <h3 className="text-sm font-mono font-bold mb-3">Zone Risk Overview — Gas & Temperature</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={zoneRiskSummary}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="zone" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="CO" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} name="CO (ppm)" />
            <Bar dataKey="CH4" fill="hsl(var(--warning))" radius={[2, 2, 0, 0]} name="CH₄ (%)" />
            <Bar dataKey="temp" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Temp (°C)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Shift Report Table */}
      <div className="card-industrial">
        <h3 className="text-sm font-mono font-bold mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Shift Performance Report
        </h3>
        <div className="overflow-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 px-3 font-medium">Shift</th>
                <th className="text-left py-2 px-3 font-medium">Workers Deployed</th>
                <th className="text-left py-2 px-3 font-medium">Active Vehicles</th>
                <th className="text-left py-2 px-3 font-medium">System Uptime</th>
                <th className="text-left py-2 px-3 font-medium">Alerts Raised</th>
                <th className="text-left py-2 px-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {shiftData.map(s => (
                <tr key={s.shift} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="py-2 px-3 font-bold">{s.shift}</td>
                  <td className="py-2 px-3">{s.workers}</td>
                  <td className="py-2 px-3">{s.vehicles}</td>
                  <td className="py-2 px-3">
                    <span className={s.uptime > 95 ? 'text-success' : 'text-warning'}>{s.uptime}%</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={s.alerts > 3 ? 'text-destructive font-bold' : ''}>{s.alerts}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.alerts <= 2 ? 'bg-success/20 text-success' : s.alerts <= 4 ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive'
                    }`}>
                      {s.alerts <= 2 ? 'NOMINAL' : s.alerts <= 4 ? 'CAUTION' : 'ELEVATED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
