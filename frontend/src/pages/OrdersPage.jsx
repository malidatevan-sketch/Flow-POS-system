import { useState } from 'react';
import { Clock, CheckCircle, XCircle, ChevronRight, ArrowLeft, Printer, Receipt } from 'lucide-react';
import { useApi, api } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { PageLoader } from '../components/Loading';

const statusConfig = {
  completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Completed' },
  voided: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Voided' },
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Pending' },
};

function printReceipt(order) {
  const win = window.open('', '_blank', 'width=320,height=600');
  const items = order.items?.map(i =>
    `<div class="row"><span>${i.quantity}x ${i.product_name}</span><span>$${i.total_price.toFixed(2)}</span></div>
     ${i.note ? `<div style="font-size:11px;color:#888;padding-left:12px">${i.note}</div>` : ''}`
  ).join('') || '';

  win.document.write(`<!DOCTYPE html><html><head><title>Receipt #${order.order_number}</title>
    <style>body{font-family:-apple-system,sans-serif;padding:16px;max-width:280px;margin:0 auto;font-size:13px}
    .center{text-align:center}.bold{font-weight:700}.line{border-top:1px dashed #ccc;margin:8px 0}
    .row{display:flex;justify-content:space-between;padding:2px 0}.total{font-size:18px;font-weight:700}
    @media print{body{padding:0}}</style></head><body>
    <div class="center bold" style="font-size:16px;margin-bottom:4px">Flow Cafe</div>
    <div class="center" style="font-size:11px;color:#888;margin-bottom:8px">
      Order #${order.order_number} &bull; ${new Date(order.created_at).toLocaleString()}</div>
    <div class="line"></div>
    ${items}
    <div class="line"></div>
    <div class="row"><span>Subtotal</span><span>$${order.subtotal.toFixed(2)}</span></div>
    ${order.discount_amount > 0 ? `<div class="row" style="color:green"><span>Discount</span><span>-$${order.discount_amount.toFixed(2)}</span></div>` : ''}
    <div class="row"><span>Tax</span><span>$${order.tax_amount.toFixed(2)}</span></div>
    <div class="line"></div>
    <div class="row total"><span>Total</span><span>$${order.total.toFixed(2)}</span></div>
    <div style="font-size:11px;color:#888;margin-top:4px;text-transform:capitalize">Paid by ${order.payment_method}</div>
    <div class="center" style="margin-top:16px;font-size:11px;color:#aaa">Thank you!</div>
    </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

export default function OrdersPage() {
  const toast = useToast();
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { data: orders, loading, refetch } = useApi(`/orders?date=${date}`, [date]);
  const { data: orderDetail, loading: loadingDetail, refetch: refetchDetail } = useApi(
    selectedOrder ? `/orders/${selectedOrder}` : null,
    [selectedOrder]
  );

  const handleVoid = async (id) => {
    if (!confirm('Void this order? Stock will be restored.')) return;
    try {
      await api.patch(`/orders/${id}/void`);
      refetch();
      refetchDetail();
      toast('Order voided, stock restored', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (loading) return <PageLoader />;

  if (selectedOrder && orderDetail) {
    const cfg = statusConfig[orderDetail.status] || statusConfig.pending;
    const StatusIcon = cfg.icon;
    return (
      <div className="h-full overflow-y-auto animate-fade-in">
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => setSelectedOrder(null)} className="flex items-center gap-1 text-gray-500 mb-4 text-sm font-medium active:scale-95 transition-transform">
            <ArrowLeft size={16} /> Back to orders
          </button>
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Order #{orderDetail.order_number}</h2>
              <span className={`flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                <StatusIcon size={14} /> {cfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {new Date(orderDetail.created_at).toLocaleString()}
            </p>

            <div className="space-y-2 mb-4">
              {orderDetail.items?.map(item => (
                <div key={item.id} className="py-2 border-b border-gray-50">
                  <div className="flex justify-between">
                    <div>
                      <span className="font-medium">{item.quantity}x</span> {item.product_name}
                    </div>
                    <span className="font-medium">${item.total_price.toFixed(2)}</span>
                  </div>
                  {item.note && <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>}
                </div>
              ))}
            </div>

            <div className="space-y-1 text-sm border-t pt-3">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>${orderDetail.subtotal.toFixed(2)}</span>
              </div>
              {orderDetail.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span><span>-${orderDetail.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Tax</span><span>${orderDetail.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span><span>${orderDetail.total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-400 capitalize mt-2">Payment: {orderDetail.payment_method}</p>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => printReceipt(orderDetail)} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                <Printer size={16} /> Print
              </button>
              {orderDetail.status === 'completed' && (
                <button onClick={() => handleVoid(orderDetail.id)} className="btn-danger flex-1">
                  Void Order
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const completedOrders = orders?.filter(o => o.status === 'completed') || [];
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-2 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-xl font-bold flex-1">Orders</h1>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field w-auto py-2 text-sm" />
        </div>
        {orders?.length > 0 && (
          <div className="flex gap-3 text-sm">
            <div className="card px-3 py-2 flex items-center gap-2">
              <Receipt size={14} className="text-brand-500" />
              <span className="font-semibold">{completedOrders.length}</span>
              <span className="text-gray-400">orders</span>
            </div>
            <div className="card px-3 py-2 flex items-center gap-2">
              <span className="text-green-500 font-bold">$</span>
              <span className="font-semibold">{totalRevenue.toFixed(2)}</span>
              <span className="text-gray-400">revenue</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-2">
        {!orders?.length ? (
          <div className="text-center text-gray-400 py-16">
            <Receipt className="mx-auto mb-3 opacity-20" size={48} />
            <p>No orders for this date</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-lg mx-auto">
            {orders.map(order => {
              const cfg = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              return (
                <button key={order.id} onClick={() => setSelectedOrder(order.id)}
                  className="card w-full p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <StatusIcon size={18} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">#{order.order_number}</span>
                      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <span className="mx-1">&bull;</span>
                      <span className="capitalize">{order.payment_method}</span>
                    </p>
                  </div>
                  <span className="font-bold text-lg">${order.total.toFixed(2)}</span>
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
