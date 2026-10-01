import { NavLink } from 'react-router-dom';
import { Battery, Zap, Users, DollarSign, Sun, ClipboardCheck, Sparkles, Server } from 'lucide-react';

const links = [
  { to: '/batteries', label: 'Batteries', icon: Battery },
  { to: '/solar-panels', label: 'Solar Panels', icon: Sun },
  { to: '/energy-plans', label: 'Energy Plans', icon: Zap },
  { to: '/installers', label: 'Installers', icon: Users },
  { to: '/inspectors', label: 'Inspectors', icon: ClipboardCheck },
  { to: '/installer-pricing', label: 'Installer Pricing', icon: DollarSign },
  { to: '/ai-assistant', label: 'AI Link Extractor', icon: Sparkles },
  { to: '/api-info', label: 'API & Integrations', icon: Server },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 shrink-0 flex flex-col text-white"
        style={{
          background: 'linear-gradient(180deg, hsl(272 55% 14%) 0%, hsl(280 50% 18%) 40%, hsl(330 50% 22%) 100%)',
        }}>

        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg shadow-black/30 ring-1 ring-white/15"
              style={{ background: 'linear-gradient(135deg, hsl(280 70% 50%), hsl(330 90% 55%))' }}>
              <Battery className="h-5 w-5 text-white drop-shadow" />
            </div>
            <div>
              <span className="drop-shadow-sm">Battery DB</span>
              <p className="text-[10px] font-normal mt-0.5 text-white/50 tracking-wider uppercase">Solar & Battery Database</p>
            </div>
          </h1>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-white shadow-lg shadow-black/20 ring-1 ring-white/15'
                    : 'text-white/50 hover:text-white hover:bg-white/8'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: 'linear-gradient(135deg, hsl(280 65% 42% / 0.7), hsl(330 80% 48% / 0.6))' }
                  : undefined
              }
            >
              <l.icon className="h-[18px] w-[18px] shrink-0" />
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10">
          <span className="text-[10px] text-white/30 tracking-wider uppercase">v1.0 · Internal Tool</span>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-background">{children}</main>
    </div>
  );
}
