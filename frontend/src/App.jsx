import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { ShoppingCart, Package, BarChart3, Settings, Coffee } from 'lucide-react';
import POSPage from './pages/POSPage';
import OrdersPage from './pages/OrdersPage';
import StockPage from './pages/StockPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ManagePage from './pages/ManagePage';

const navItems = [
  { to: '/', icon: ShoppingCart, label: 'POS' },
  { to: '/orders', icon: Coffee, label: 'Orders' },
  { to: '/stock', icon: Package, label: 'Stock' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/manage', icon: Settings, label: 'Manage' },
];

export default function App() {
  const location = useLocation();

  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden bg-gray-50">
      <nav className="hidden md:flex flex-col w-20 bg-white border-r border-gray-100 py-4 items-center gap-1 shrink-0">
        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center mb-6">
          <span className="text-white font-bold text-lg">F</span>
        </div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl transition-all text-xs font-medium w-16
              ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<POSPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/manage" element={<ManagePage />} />
        </Routes>
      </main>

      <nav className="md:hidden flex bg-white border-t border-gray-100 px-2 pb-[env(safe-area-inset-bottom)] shrink-0">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors
              ${isActive ? 'text-brand-600' : 'text-gray-400'}`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
