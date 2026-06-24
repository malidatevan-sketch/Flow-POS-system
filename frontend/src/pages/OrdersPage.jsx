import { useState } from 'react';
import { Clock, CheckCircle, XCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { useApi, api } from '../hooks/useApi';

const statusConfig = {
  completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Completed' },
  voided: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Voided' },
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Pending' },
};

export default function OrdersPage() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { data: orders, refetch } = useApi(`/orders?date=${date}`, [date]);
  const { data: orderDetail, refetch: refetchDetail } = useApi(
    selectedOrder ? `/orders/${selectedOrder}` : null,
    [selectedOrder]
  );

  const handleVoid = async (id) => {
    if (!confirm('Void this order? Stock will be restored.')) return;
    await api.patch(`/orders/${id}/void`);
    refetch();
    refetchDetail();
  };

  if (selectedOrder && orderDetail) {
    const cfg = statusConfig[orderDetail.status] || statusConfig.pending;
    const StatusIcon = cfg.icon;
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => setSelectedOrder(null)} className="flex items-center gap-1 text-gray-500 mb-4 text-sm font-medium">
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
                <div key={item.id} className="flex justify-between py-2 border-b border-gray-50">
                  <div>
                    <span className="font-medium">{item.quantity}x</span> {item.product_name}
                    {item.note && <p className="text-xs text-gray-400">{item.note}</p>}
                  </div>
                  <span className="font-medium">${item.total_price.toFixed(2)}</span>
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

            {orderDetail.status === 'completed' && (
              <button onClick={() => handleVoid(orderDetail.id)} className="btn-danger w-full mt-4">
                Void Order
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-2 flex items-center gap-3 shrink-0">
        <h1 className="text-xl font-bold flex-1">Orders</h1>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="input-field w-auto py-2 text-sm"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-4 pt-2">
        {!orders?.length ? (
          <div className="text-center text-gray-400 py-16">No orders for this date</div>
        ) : (
          <div className="space-y-2 max-w-lg mx-auto">
            {orders.map(order => {
              const cfg = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              return (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order.id)}
                  className="card w-full p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                >
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                    <StatusIcon size={18} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">#{order.order_number}</span>
                      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString()}</p>
                  </div>
                  <span className="font-bold text-lg">${order.total.toFixed(2)}</span>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
