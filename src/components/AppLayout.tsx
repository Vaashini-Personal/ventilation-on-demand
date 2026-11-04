import { ReactNode, useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Clock, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
  running?: boolean;
  onToggleSimulation?: () => void;
  alertCount?: number;
  onLogout?: () => void;
}

export function AppLayout({ children, running, onToggleSimulation, alertCount = 0, onLogout }: Props) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar alertCount={alertCount} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-5 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                <Clock className="h-3.5 w-3.5" />
                <span>Updated {time.toLocaleTimeString()}</span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-xs font-mono px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              )}
              {onToggleSimulation && (
                <button
                  onClick={onToggleSimulation}
                  className={`text-xs font-mono px-4 py-1.5 rounded-md border transition-all ${
                    running
                      ? 'border-success/50 text-success bg-success/10 shadow-[0_0_12px_hsl(var(--success)/0.2)]'
                      : 'border-muted-foreground/50 text-muted-foreground bg-muted'
                  }`}
                >
                  {running ? '● LIVE' : '○ PAUSED'}
                </button>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto p-5">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
