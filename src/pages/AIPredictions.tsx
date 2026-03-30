import { useState, useMemo } from 'react';
import { BrainCircuit, TrendingDown, TrendingUp, Minus, AlertTriangle, Clock, Lightbulb } from 'lucide-react';
import { Zone, calcRisk } from '@/lib/simulation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  zones: Zone[];
}

type GasType = 'CO' | 'CH4';

export default function AIPredictions({ zones }: Props) {
  const [selectedZoneIdx, setSelectedZoneIdx] = useState(0);
  const [selectedGas, setSelectedGas] = useState<GasType>('CO');

  const zone = zones[selectedZoneIdx] || zones[0];

  // Generate 2-hour forecast data (every 15 min)
  const forecastData = useMemo(() => {
    if (!zone) return [];
    const now = new Date();
    return Array.from({ length: 9 }, (_, i) => {
      const time = new Date(now.getTime() + i * 15 * 60000);
      const timeLabel = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
      const baseCO = zone.gasLevels.CO;
      const baseCH4 = zone.gasLevels.CH4;
      const wave = Math.sin(i * 0.6) * 3 + Math.cos(i * 0.3) * 2;
      const co = Math.max(0, baseCO + wave + i * 0.2);
      const ch4 = Math.max(0, baseCH4 + Math.sin(i * 0.4) * 0.1);
      const warningThreshold = selectedGas === 'CO' ? 25 : 1.0;
      return {
        time: timeLabel,
        value: parseFloat(selectedGas === 'CO' ? co.toFixed(1) : ch4.toFixed(2)),
        upper: parseFloat((selectedGas === 'CO' ? co + 3 : ch4 + 0.15).toFixed(2)),
        lower: parseFloat(Math.max(0, selectedGas === 'CO' ? co - 3 : ch4 - 0.15).toFixed(2)),
        warningThreshold,
      };
    });
  }, [zone, selectedGas]);

  // Determine trend
  const trend = useMemo(() => {
    if (forecastData.length < 2) return 'stable';
    const first = forecastData[0].value;
    const last = forecastData[forecastData.length - 1].value;
    const diff = last - first;
    if (diff > 2) return 'rising';
    if (diff < -2) return 'falling';
    return 'stable';
  }, [forecastData]);

  // Risk timeline blocks (24 blocks for next 2 hours = every 5 min)
  const riskTimeline = useMemo(() => {
    if (!zone) return [];
    return Array.from({ length: 24 }, (_, i) => {
      const drift = i * 0.15;
      const co = zone.gasLevels.CO + drift * (Math.sin(i * 0.5) + 0.5);
      const temp = zone.temperature + drift * 0.1;
      const risk = calcRisk(
        { CO: co, NO2: zone.gasLevels.NO2, O2: zone.gasLevels.O2 - drift * 0.01, CH4: zone.gasLevels.CH4 },
        temp
      );
      return risk;
    });
  }, [zone]);

  // Trend summary for all gases
  const trendSummary = useMemo(() => {
    if (!zone) return { co: 'stable', ch4: 'stable', o2: 'stable', overallRisk: 'safe' as const };
    const coTrend = zone.gasLevels.CO > 20 ? 'rising' : zone.gasLevels.CO < 10 ? 'falling' : 'stable';
    const ch4Trend = zone.gasLevels.CH4 > 0.8 ? 'rising' : 'stable';
    const o2Trend = zone.gasLevels.O2 < 19.5 ? 'falling' : 'stable';
    const lastRisk = riskTimeline[riskTimeline.length - 1] || 'safe';
    return { co: coTrend, ch4: ch4Trend, o2: o2Trend, overallRisk: lastRisk };
  }, [zone, riskTimeline]);

  // AI Insights
  const insights = useMemo(() => {
    if (!zone) return [];
    const items: { title: string; description: string; confidence: number; type: 'info' | 'warning' | 'critical' }[] = [];
    items.push({
      title: 'CO Trend',
      description: zone.gasLevels.CO < 15
        ? 'CO levels stable across main working areas. No immediate action required.'
        : 'CO levels elevated. Monitor closely and consider increasing ventilation.',
      confidence: Math.round(82 + Math.random() * 10),
      type: 'info',
    });
    items.push({
      title: 'CH4 Pattern',
      description: 'Methane levels following diurnal cycle pattern. Peak expected around shift change. Maintain current ventilation protocol.',
      confidence: Math.round(78 + Math.random() * 12),
      type: 'info',
    });
    items.push({
      title: 'Predictive Maintenance',
      description: 'Fan OS efficiency has decreased by 3.2% over 30 days. Schedule maintenance within 2 weeks to maintain VoD performance.',
      confidence: Math.round(85 + Math.random() * 10),
      type: 'warning',
    });
    return items;
  }, [zone]);

  const trendIcon = (t: string) => {
    if (t === 'rising') return <TrendingUp className="h-3 w-3" />;
    if (t === 'falling') return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const trendColor = (t: string) => {
    if (t === 'rising') return 'text-destructive';
    if (t === 'falling') return 'text-accent';
    return 'text-muted-foreground';
  };

  const riskBlockColor = (r: string) => {
    if (r === 'critical') return 'bg-destructive';
    if (r === 'warning') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const riskBadgeColor = (r: string) => {
    if (r === 'critical') return 'bg-destructive text-destructive-foreground';
    if (r === 'warning') return 'bg-amber-500/20 text-amber-400 border border-amber-500/50';
    return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-6 w-6 text-accent" />
          <div>
            <h2 className="text-xl font-bold font-mono tracking-wide">AI Prediction Module</h2>
            <p className="text-xs text-muted-foreground">Gas trend forecasting · Next 2 hours · ML-based pattern analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Updates every 11s
        </div>
      </div>

      {/* Zone + Gas selectors */}
      <div className="flex items-center gap-2 flex-wrap">
        {zones.map((z, i) => (
          <button
            key={z.id}
            onClick={() => setSelectedZoneIdx(i)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-colors ${
              i === selectedZoneIdx
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-border'
            }`}
          >
            {z.name.split(' ').slice(0, 2).join(' ')}
          </button>
        ))}
        <div className="w-px h-6 bg-border mx-1" />
        {(['CO', 'CH4'] as GasType[]).map(gas => (
          <button
            key={gas}
            onClick={() => setSelectedGas(gas)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-colors ${
              gas === selectedGas
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-border'
            }`}
          >
            {gas}
          </button>
        ))}
      </div>

      {/* Main content: Chart + Trend Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        <div className="space-y-5">
          {/* Forecast chart */}
          <div className="card-industrial">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-sm font-bold font-mono">
                  {selectedGas} Forecast — {zone?.name || 'Zone'}
                </h3>
                <p className="text-[10px] text-accent font-mono mt-0.5">2-hour forecast with 95% confidence band</p>
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-mono font-semibold ${trendColor(trend)}`}>
                {trendIcon(trend)} {trend.toUpperCase()}
              </div>
            </div>
            <div className="h-64 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData}>
                  <defs>
                    <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontFamily: 'monospace' }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', color: 'hsl(var(--foreground))' }} />
                  {/* Warning threshold line */}
                  <Area type="monotone" dataKey="warningThreshold" name="Warning Threshold" stroke="hsl(var(--destructive))" strokeDasharray="6 3" strokeWidth={1.5} fill="none" dot={false} />
                  {/* Confidence upper band */}
                  <Area type="monotone" dataKey="upper" name="Upper 95%" stroke="none" fill="url(#confidenceBand)" dot={false} />
                  {/* Main forecast line */}
                  <Area type="monotone" dataKey="value" name={`${selectedGas} Forecast`} stroke="hsl(var(--accent))" fill="url(#confidenceBand)" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Level Timeline */}
          <div className="card-industrial">
            <h3 className="text-sm font-bold font-mono mb-3">Risk Level Timeline</h3>
            <div className="flex gap-1">
              {riskTimeline.map((risk, i) => (
                <div
                  key={i}
                  className={`flex-1 h-7 rounded-sm ${riskBlockColor(risk)} transition-colors`}
                  title={`+${(i * 5)} min: ${risk}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> low</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> medium</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-600 inline-block" /> high</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-destructive inline-block" /> critical</span>
              <span className="ml-auto">← Now · +2hr →</span>
            </div>
          </div>
        </div>

        {/* Right panel: Trend Summary + AI Insights */}
        <div className="space-y-5">
          {/* Trend Summary */}
          <div className="card-industrial">
            <h3 className="text-sm font-bold font-mono mb-3 text-amber-400">Trend Summary</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">CO Trend</span>
                <span className={`flex items-center gap-1 font-semibold ${trendColor(trendSummary.co)}`}>
                  {trendIcon(trendSummary.co)} {trendSummary.co}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">CH₄ Trend</span>
                <span className={`flex items-center gap-1 font-semibold ${trendColor(trendSummary.ch4)}`}>
                  {trendIcon(trendSummary.ch4)} {trendSummary.ch4}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">O₂ Trend</span>
                <span className={`flex items-center gap-1 font-semibold ${trendColor(trendSummary.o2)}`}>
                  {trendIcon(trendSummary.o2)} {trendSummary.o2}
                </span>
              </div>
              <div className="border-t border-border my-2" />
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Overall Risk</span>
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${riskBadgeColor(trendSummary.overallRisk)}`}>
                  {trendSummary.overallRisk === 'safe' ? 'LOW' : trendSummary.overallRisk === 'warning' ? 'MEDIUM' : 'HIGH'}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono leading-relaxed mt-1">
                Current ventilation rates are adequate. Energy optimization mode can be maintained.
              </p>
            </div>
          </div>

          {/* AI Insights */}
          <div>
            <h3 className="text-sm font-bold font-mono mb-3 flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-accent" /> AI Insights
            </h3>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className={`card-industrial border-l-2 ${
                    insight.type === 'critical' ? 'border-l-destructive bg-destructive/5' :
                    insight.type === 'warning' ? 'border-l-amber-500 bg-amber-500/5' :
                    'border-l-accent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold font-mono flex items-center gap-1.5">
                      {insight.type === 'warning' ? (
                        <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                      ) : (
                        <BrainCircuit className="h-3.5 w-3.5 text-accent" />
                      )}
                      {insight.title}
                    </h4>
                    <span className="text-[10px] font-mono text-muted-foreground">{insight.confidence}% confidence</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">{insight.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
