import { useState } from 'react';
import { Package, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Search, History, X } from 'lucide-react';
import { useApi, api } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { PageLoader } from '../components/Loading';
import Modal from '../components/Modal';

export default function StockPage() {
  const toast = useToast();
  const { data: levels, loading, refetch } = useApi('/stock/levels');
  const { data: alerts } = useApi('/stock/alerts');
  const [search, setSearch] = useState('');
  const [adjusting, setAdjusting] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('in');
  const [adjustReason, setAdjustReason] = useState('');
  const [tab, setTab] = useState('all');
  const [historyProduct, setHistoryProduct] = useState(null);
  const { data: transactions } = useApi(
    historyProduct ? `/stock/transactions?product_id=${historyProduct.id}&limit=50` : null,
    [historyProduct?.id]
  );

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
      toast(`Stock ${adjustType === 'in' ? 'added' : 'removed'}: ${adjustQty} ${adjusting.unit}`, 'success');
      setAdjusting(null);
      setAdjustQty('');
      setAdjustReason('');
      refetch();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const lowCount = alerts?.length || 0;
  const outCount = levels?.filter(p => p.stock_status === 'out_of_stock').length || 0;

  if (loading) return <PageLoader />;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-2 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-xl font-bold flex-1">Stock Management</h1>
          <div className="flex gap-2">
            {outCount > 0 && (
              <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2.5 py-1 rounded-full text-xs font-medium">
                <Package size={12} /> {outCount} out
              </span>
            )}
            {lowCount > 0 && (
              <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-xs font-medium">
                <AlertTriangle size={12} /> {lowCount} low
              </span>
            )}
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 py-2.5" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={16} /></button>}
        </div>

        <div className="flex gap-2">
          {[
            { key: 'all', label: `All (${levels?.length || 0})` },
            { key: 'low', label: `Low (${lowCount})` },
            { key: 'out', label: `Out (${outCount})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                ${tab === t.key ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-2">
        <div className="max-w-2xl mx-auto space-y-2">
          {filtered?.length === 0 && (
            <div className="text-center text-gray-400 py-16">
              <Package className="mx-auto mb-3 opacity-20" size={48} />
              <p>No products found</p>
            </div>
          )}
          {filtered?.map(item => {
            const statusColor = item.stock_status === 'out_of_stock' ? 'red' : item.stock_status === 'low_stock' ? 'amber' : 'green';
            return (
              <div key={item.id} className="card p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-${statusColor}-50`}>
                  <Package size={18} className={`text-${statusColor}-500`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.category_name}</p>
                </div>
                <div className="text-right mr-1">
                  <p className={`font-bold text-lg text-${statusColor}-${statusColor === 'green' ? '600' : '500'}`}>
                    {item.stock_quantity}
                  </p>
                  <p className="text-[10px] text-gray-400">{item.unit}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setHistoryProduct(item)}
                    className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 active:scale-90 transition-all">
                    <History size={15} />
                  </button>
                  <button onClick={() => { setAdjusting(item); setAdjustType('in'); setAdjustQty(''); setAdjustReason(''); }}
                    className="btn-secondary py-2 px-3 text-xs">
                    Adjust
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stock Adjust Modal */}
      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title={`Adjust: ${adjusting?.name}`}>
        <p className="text-sm text-gray-500 mb-4">
          Current stock: <span className="font-bold text-gray-900">{adjusting?.stock_quantity} {adjusting?.unit}</span>
        </p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setAdjustType('in')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all
                ${adjustType === 'in' ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-gray-100 text-gray-500'}`}>
              <ArrowDownCircle size={18} /> Stock In
            </button>
            <button onClick={() => setAdjustType('out')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all
                ${adjustType === 'out' ? 'bg-red-100 text-red-700 ring-2 ring-red-500' : 'bg-gray-100 text-gray-500'}`}>
              <ArrowUpCircle size={18} /> Stock Out
            </button>
          </div>
          <input type="number" placeholder="Quantity" value={adjustQty} onChange={e => setAdjustQty(e.target.value)}
            className="input-field" min="1" autoFocus />
          <select value={adjustReason} onChange={e => setAdjustReason(e.target.value)} className="input-field">
            <option value="">Select reason...</option>
            <option value="Restock delivery">Restock delivery</option>
            <option value="Manual count correction">Manual count correction</option>
            <option value="Damaged/expired">Damaged/expired</option>
            <option value="Staff use">Staff use</option>
            <option value="Returned">Returned</option>
            <option value="Waste">Waste</option>
          </select>
          <input type="text" placeholder="Custom reason (optional)" value={adjustReason && !['Restock delivery','Manual count correction','Damaged/expired','Staff use','Returned','Waste'].includes(adjustReason) ? adjustReason : ''}
            onChange={e => setAdjustReason(e.target.value)} className="input-field" />
          <div className="flex gap-2">
            <button onClick={() => setAdjusting(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleAdjust} disabled={!adjustQty || parseInt(adjustQty) <= 0}
              className={`flex-1 ${adjustType === 'in' ? 'btn-success' : 'btn-danger'}`}>
              {adjustType === 'in' ? 'Add' : 'Remove'} Stock
            </button>
          </div>
        </div>
      </Modal>

      {/* Transaction History Modal */}
      <Modal open={!!historyProduct} onClose={() => setHistoryProduct(null)} title={`History: ${historyProduct?.name}`} size="lg">
        <div className="max-h-80 overflow-y-auto space-y-2">
          {!transactions?.length ? (
            <p className="text-center text-gray-400 py-8 text-sm">No transactions found</p>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-gray-50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                  ${tx.type === 'in' ? 'bg-green-50' : 'bg-red-50'}`}>
                  {tx.type === 'in'
                    ? <ArrowDownCircle size={14} className="text-green-500" />
                    : <ArrowUpCircle size={14} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{tx.reason || 'Manual adjustment'}</p>
                  <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <span className={`font-bold text-sm ${tx.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.type === 'in' ? '+' : '-'}{tx.quantity}
                </span>
              </div>
            ))
          )}
        </div>
        <button onClick={() => setHistoryProduct(null)} className="btn-secondary w-full mt-4">Close</button>
      </Modal>
    </div>
  );
}
