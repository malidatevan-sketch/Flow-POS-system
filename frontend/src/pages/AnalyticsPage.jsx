import { useState, useMemo } from 'react';
import { TrendingUp, ShoppingBag, DollarSign, Package, Calendar } from 'lucide-react';
import { useApi } from '../hooks/useApi';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, maxVal }) {
  if (!data?.length) return <p className="text-center text-gray-400 text-sm py-8">No data</p>;
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-brand-500 rounded-t-md transition-all" style={{ height: `${maxVal ? (d.value / maxVal) * 100 : 0}%`, minHeight: d.value > 0 ? '4px' : '0' }} />
          <span className="text-[9px] text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [mode, setMode] = useState('today');
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const { data: todayData } = useApi('/analytics/today');
  const { data: weekData } = useApi(`/analytics/range?start=${weekAgo}&end=${today}`);
  const { data: monthData } = useApi(`/analytics/range?start=${monthAgo}&end=${today}`);

  const rangeData = mode === 'week' ? weekData : mode === 'month' ? monthData : null;

  const hourlyChart = useMemo(() => {
    if (!todayData?.hourly_sales) return [];
    const hours = Array.from({ length: 24 }, (_, i) => ({
      label: `${i}`,
      value: 0,
    }));
    for (const h of todayData.hourly_sales) {
      hours[parseInt(h.hour)].value = h.revenue;
    }
    return hours.filter((_, i) => i >= 6 && i <= 22);
  }, [todayData]);

  const dailyChart = useMemo(() => {
    if (!rangeData?.daily) return [];
    return rangeData.daily.map(d => ({
      label: d.date.slice(5),
      value: d.revenue,
    }));
  }, [rangeData]);

  const maxHourly = Math.max(...hourlyChart.map(h => h.value), 1);
  const maxDaily = Math.max(...dailyChart.map(d => d.value), 1);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold flex-1">Analytics</h1>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {['today', 'week', 'month'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                  ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {mode === 'today' && todayData && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={DollarSign} label="Revenue" value={`$${todayData.total_revenue.toFixed(2)}`} color="bg-green-500" />
              <StatCard icon={ShoppingBag} label="Orders" value={todayData.total_orders} color="bg-brand-500" />
              <StatCard icon={Package} label="Items Sold" value={todayData.total_items_sold} color="bg-purple-500" />
              <StatCard icon={TrendingUp} label="Avg. Order" value={`$${todayData.average_order.toFixed(2)}`} color="bg-amber-500" />
            </div>

            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-3">Hourly Sales</h3>
              <BarChart data={hourlyChart} maxVal={maxHourly} />
            </div>

            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-3">Top Products</h3>
              {todayData.top_products.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No sales yet today</p>
              ) : (
                <div className="space-y-2">
                  {todayData.top_products.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <span className="flex-1 text-sm font-medium">{p.product_name}</span>
                      <span className="text-xs text-gray-400">{p.qty} sold</span>
                      <span className="text-sm font-bold">${p.revenue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {mode !== 'today' && rangeData && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={DollarSign} label="Total Revenue" value={`$${rangeData.summary.total_revenue.toFixed(2)}`} color="bg-green-500" />
              <StatCard icon={ShoppingBag} label="Total Orders" value={rangeData.summary.total_orders} color="bg-brand-500" />
            </div>

            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-3">Daily Revenue</h3>
              <BarChart data={dailyChart} maxVal={maxDaily} />
            </div>

            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-3">Top Products</h3>
              <div className="space-y-2">
                {rangeData.top_products.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium">{p.product_name}</span>
                    <span className="text-xs text-gray-400">{p.qty} sold</span>
                    <span className="text-sm font-bold">${p.revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {rangeData.by_payment_method?.length > 0 && (
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3">Payment Methods</h3>
                <div className="space-y-2">
                  {rangeData.by_payment_method.map((pm, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{pm.payment_method}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold">${pm.total.toFixed(2)}</span>
                        <span className="text-xs text-gray-400 ml-2">({pm.count} orders)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
