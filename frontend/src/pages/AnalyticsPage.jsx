import { useState, useMemo } from 'react';
import { TrendingUp, ShoppingBag, DollarSign, Package, Printer, Clock } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { PageLoader } from '../components/Loading';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 font-medium">{label}</p>
          <p className="text-xl font-bold truncate">{value}</p>
          {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, maxVal, color = 'bg-brand-500' }) {
  if (!data?.length) return <p className="text-center text-gray-400 text-sm py-8">No data</p>;
  return (
    <div className="flex items-end gap-1 h-36">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div className={`w-full ${color} rounded-t-md transition-all hover:opacity-80`}
            style={{ height: `${maxVal ? (d.value / maxVal) * 100 : 0}%`, minHeight: d.value > 0 ? '4px' : '0' }} />
          <span className="text-[9px] text-gray-400 leading-tight">{d.label}</span>
          {d.value > 0 && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              ${d.value.toFixed(0)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function printDailySummary(data) {
  const win = window.open('', '_blank', 'width=360,height=700');
  const topProducts = data.top_products.map((p, i) =>
    `<div class="row"><span>${i + 1}. ${p.product_name}</span><span>${p.qty} sold - $${p.revenue.toFixed(2)}</span></div>`
  ).join('');

  win.document.write(`<!DOCTYPE html><html><head><title>Daily Summary</title>
    <style>body{font-family:-apple-system,sans-serif;padding:20px;max-width:320px;margin:0 auto;font-size:13px}
    .center{text-align:center}.bold{font-weight:700}.line{border-top:1px dashed #ccc;margin:10px 0}
    .row{display:flex;justify-content:space-between;padding:3px 0}.big{font-size:24px}
    h3{margin:12px 0 6px;font-size:14px}
    @media print{body{padding:0}}</style></head><body>
    <div class="center bold" style="font-size:18px">Flow Cafe</div>
    <div class="center" style="color:#888;margin-bottom:4px">Daily Summary - ${data.date}</div>
    <div class="line"></div>
    <div class="center big bold" style="color:#16a34a">$${data.total_revenue.toFixed(2)}</div>
    <div class="center" style="color:#888;font-size:11px">Total Revenue</div>
    <div class="line"></div>
    <div class="row"><span>Total Orders</span><span class="bold">${data.total_orders}</span></div>
    <div class="row"><span>Items Sold</span><span class="bold">${data.total_items_sold}</span></div>
    <div class="row"><span>Average Order</span><span class="bold">$${data.average_order.toFixed(2)}</span></div>
    <div class="line"></div>
    <h3>Top Products</h3>
    ${topProducts || '<div style="color:#888">No sales</div>'}
    <div class="line"></div>
    <div class="center" style="margin-top:16px;font-size:11px;color:#aaa">Generated ${new Date().toLocaleString()}</div>
    </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

export default function AnalyticsPage() {
  const [mode, setMode] = useState('today');
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const { data: todayData, loading: loadingToday } = useApi('/analytics/today');
  const { data: weekData, loading: loadingWeek } = useApi(`/analytics/range?start=${weekAgo}&end=${today}`);
  const { data: monthData, loading: loadingMonth } = useApi(`/analytics/range?start=${monthAgo}&end=${today}`);

  const rangeData = mode === 'week' ? weekData : mode === 'month' ? monthData : null;
  const isLoading = mode === 'today' ? loadingToday : mode === 'week' ? loadingWeek : loadingMonth;

  const hourlyChart = useMemo(() => {
    if (!todayData?.hourly_sales) return [];
    const hours = Array.from({ length: 24 }, (_, i) => ({ label: `${i}`, value: 0 }));
    for (const h of todayData.hourly_sales) {
      hours[parseInt(h.hour)].value = h.revenue;
    }
    return hours.filter((_, i) => i >= 6 && i <= 22);
  }, [todayData]);

  const dailyChart = useMemo(() => {
    if (!rangeData?.daily) return [];
    return rangeData.daily.map(d => ({
      label: new Date(d.date + 'T00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }),
      value: d.revenue,
    }));
  }, [rangeData]);

  const maxHourly = Math.max(...hourlyChart.map(h => h.value), 1);
  const maxDaily = Math.max(...dailyChart.map(d => d.value), 1);

  if (isLoading) return <PageLoader />;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold flex-1">Analytics</h1>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {['today', 'week', 'month'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                  ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Hourly Sales</h3>
                <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} /> 6AM - 10PM</span>
              </div>
              <BarChart data={hourlyChart} maxVal={maxHourly} />
            </div>

            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-3">Top Products</h3>
              {todayData.top_products.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No sales yet today</p>
              ) : (
                <div className="space-y-2">
                  {todayData.top_products.map((p, i) => {
                    const maxQty = todayData.top_products[0]?.qty || 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate">{p.product_name}</span>
                            <span className="text-sm font-bold ml-2">${p.revenue.toFixed(2)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-400 rounded-full transition-all" style={{ width: `${(p.qty / maxQty) * 100}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400">{p.qty} sold</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* End of Day Summary Print */}
            <button onClick={() => printDailySummary(todayData)}
              className="btn-secondary w-full flex items-center justify-center gap-2">
              <Printer size={16} /> Print Daily Summary
            </button>
          </>
        )}

        {mode !== 'today' && rangeData && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={DollarSign} label="Total Revenue" value={`$${rangeData.summary.total_revenue.toFixed(2)}`} color="bg-green-500" />
              <StatCard icon={ShoppingBag} label="Total Orders" value={rangeData.summary.total_orders} color="bg-brand-500" />
              <StatCard icon={TrendingUp} label="Avg. Order" value={`$${rangeData.summary.avg_order?.toFixed(2) || '0.00'}`} color="bg-amber-500" />
              <StatCard icon={Package} label="Days" value={rangeData.daily?.length || 0} sub={`${mode === 'week' ? 'Last 7 days' : 'Last 30 days'}`} color="bg-purple-500" />
            </div>

            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-3">Daily Revenue</h3>
              <BarChart data={dailyChart} maxVal={maxDaily} color={mode === 'week' ? 'bg-brand-500' : 'bg-green-500'} />
            </div>

            <div className="card p-4">
              <h3 className="font-semibold text-sm mb-3">Top Products</h3>
              {!rangeData.top_products?.length ? (
                <p className="text-sm text-gray-400 text-center py-4">No sales in this period</p>
              ) : (
                <div className="space-y-2">
                  {rangeData.top_products.map((p, i) => {
                    const maxQty = rangeData.top_products[0]?.qty || 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate">{p.product_name}</span>
                            <span className="text-sm font-bold ml-2">${p.revenue.toFixed(2)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-400 rounded-full transition-all" style={{ width: `${(p.qty / maxQty) * 100}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400">{p.qty} sold</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {rangeData.by_payment_method?.length > 0 && (
              <div className="card p-4">
                <h3 className="font-semibold text-sm mb-3">Payment Methods</h3>
                <div className="space-y-3">
                  {rangeData.by_payment_method.map((pm, i) => {
                    const pct = rangeData.summary.total_revenue > 0
                      ? Math.round((pm.total / rangeData.summary.total_revenue) * 100) : 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize">{pm.payment_method}</span>
                          <div className="text-right">
                            <span className="text-sm font-bold">${pm.total.toFixed(2)}</span>
                            <span className="text-xs text-gray-400 ml-1">({pm.count})</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
