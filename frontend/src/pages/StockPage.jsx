import { useState } from 'react';
import { Package, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Search } from 'lucide-react';
import { useApi, api } from '../hooks/useApi';

export default function StockPage() {
  const { data: levels, refetch } = useApi('/stock/levels');
  const { data: alerts } = useApi('/stock/alerts');
  const [search, setSearch] = useState('');
  const [adjusting, setAdjusting] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('in');
  const [adjustReason, setAdjustReason] = useState('');
  const [tab, setTab] = useState('all');

  const filtered = levels?.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (tab === 'low') return p.stock_status === 'low_stock';
    if (tab === 'out') return p.stock_status === 'out_of_stock';
    return true;
  });

  const handleAdjust = async () => {
    if (!adjustQty || parseInt(adjustQty) <= 0) return;
    try {
      await api.post('/stock/adjust', {
        product_id: adjusting.id,
        type: adjustType,
        quantity: parseInt(adjustQty),
        reason: adjustReason || undefined,
      });
      setAdjusting(null);
      setAdjustQty('');
      setAdjustReason('');
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const lowCount = alerts?.length || 0;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-2 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-xl font-bold flex-1">Stock Management</h1>
          {lowCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-sm font-medium">
              <AlertTriangle size={14} /> {lowCount} low
            </span>
          )}
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 py-2.5"
          />
        </div>

        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'low', label: 'Low Stock' },
            { key: 'out', label: 'Out of Stock' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                ${tab === t.key ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-2">
        <div className="max-w-2xl mx-auto space-y-2">
          {filtered?.map(item => (
            <div key={item.id} className="card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                ${item.stock_status === 'out_of_stock' ? 'bg-red-50' :
                  item.stock_status === 'low_stock' ? 'bg-amber-50' : 'bg-green-50'}`}>
                <Package size={18} className={
                  item.stock_status === 'out_of_stock' ? 'text-red-500' :
                  item.stock_status === 'low_stock' ? 'text-amber-500' : 'text-green-600'
                } />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                <p className="text-xs text-gray-400">{item.category_name}</p>
              </div>
              <div className="text-right mr-2">
                <p className={`font-bold text-lg ${
                  item.stock_status === 'out_of_stock' ? 'text-red-500' :
                  item.stock_status === 'low_stock' ? 'text-amber-500' : 'text-gray-900'
                }`}>
                  {item.stock_quantity}
                </p>
                <p className="text-[10px] text-gray-400">{item.unit}</p>
              </div>
              <button
                onClick={() => { setAdjusting(item); setAdjustType('in'); }}
                className="btn-secondary py-2 px-3 text-xs"
              >
                Adjust
              </button>
            </div>
          ))}
        </div>
      </div>

      {adjusting && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50" onClick={() => setAdjusting(null)}>
          <div className="card w-full max-w-md p-6 m-4 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Adjust Stock: {adjusting.name}</h3>
            <p className="text-sm text-gray-500">Current stock: <span className="font-bold text-gray-900">{adjusting.stock_quantity} {adjusting.unit}</span></p>

            <div className="flex gap-2">
              <button
                onClick={() => setAdjustType('in')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all
                  ${adjustType === 'in' ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-gray-100 text-gray-500'}`}
              >
                <ArrowDownCircle size={18} /> Stock In
              </button>
              <button
                onClick={() => setAdjustType('out')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all
                  ${adjustType === 'out' ? 'bg-red-100 text-red-700 ring-2 ring-red-500' : 'bg-gray-100 text-gray-500'}`}
              >
                <ArrowUpCircle size={18} /> Stock Out
              </button>
            </div>

            <input
              type="number"
              placeholder="Quantity"
              value={adjustQty}
              onChange={e => setAdjustQty(e.target.value)}
              className="input-field"
              min="1"
              autoFocus
            />
            <input
              type="text"
              placeholder="Reason (optional)"
              value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
              className="input-field"
            />

            <div className="flex gap-2">
              <button onClick={() => setAdjusting(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleAdjust} className="btn-primary flex-1">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
