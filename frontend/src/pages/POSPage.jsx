import { useState, useMemo, useRef } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingBag, X, CreditCard, Banknote, QrCode, Receipt, ChevronUp, MessageSquare, Percent, DollarSign, Printer } from 'lucide-react';
import { useApi, api } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { PageLoader } from '../components/Loading';

export default function POSPage() {
  const toast = useToast();
  const { data: categories, loading: loadingCats } = useApi('/categories');
  const { data: products, loading: loadingProds, refetch: refetchProducts } = useApi('/products?available_only=true');
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderComplete, setOrderComplete] = useState(null);
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState('fixed');
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const receiptRef = useRef(null);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      if (activeCategory !== 'all' && p.category_id !== activeCategory) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, activeCategory, search]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          toast('Max stock reached', 'warning');
          return prev;
        }
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1, max_stock: product.stock_quantity, note: '' }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > i.max_stock) { toast('Max stock reached', 'warning'); return i; }
      return { ...i, quantity: newQty };
    }).filter(Boolean));
  };

  const removeItem = (productId) => setCart(prev => prev.filter(i => i.product_id !== productId));

  const saveNote = () => {
    if (editingNote) {
      setCart(prev => prev.map(i => i.product_id === editingNote ? { ...i, note: noteText } : i));
      setEditingNote(null);
      setNoteText('');
    }
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountValue = parseFloat(discount) || 0;
  const discountAmount = discountType === 'percent'
    ? Math.round(subtotal * (Math.min(discountValue, 100) / 100) * 100) / 100
    : Math.min(discountValue, subtotal);
  const tax = Math.round(Math.max(subtotal - discountAmount, 0) * 0.07 * 100) / 100;
  const total = Math.round(Math.max(subtotal - discountAmount + tax, 0) * 100) / 100;
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const submitOrder = async (paymentMethod) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const order = await api.post('/orders', {
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, note: i.note || undefined })),
        discount_amount: discountAmount,
        discount_type: discountAmount > 0 ? discountType : null,
        payment_method: paymentMethod,
      });
      setOrderComplete(order);
      setCart([]);
      setDiscount('');
      setShowCheckout(false);
      setMobileCartOpen(false);
      refetchProducts();
      toast(`Order #${order.order_number} completed!`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const printReceipt = () => {
    if (!receiptRef.current) return;
    const win = window.open('', '_blank', 'width=320,height=600');
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
      <style>body{font-family:-apple-system,sans-serif;padding:16px;max-width:280px;margin:0 auto;font-size:13px}
      .center{text-align:center}.bold{font-weight:700}.line{border-top:1px dashed #ccc;margin:8px 0}
      .row{display:flex;justify-content:space-between;padding:2px 0}.total{font-size:18px}
      @media print{body{padding:0}}</style></head><body>`);
    win.document.write(receiptRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  if (loadingCats || loadingProds) return <PageLoader />;

  if (orderComplete) {
    return (
      <div className="h-full flex items-center justify-center p-6 animate-fade-in">
        <div className="card p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Receipt className="text-green-600" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Order Complete!</h2>
          <p className="text-gray-500 mb-6">Order #{orderComplete.order_number}</p>

          <div ref={receiptRef}>
            <div className="center bold" style={{fontSize: '16px', marginBottom: '4px'}}>Flow Cafe</div>
            <div className="center" style={{fontSize: '11px', color: '#888', marginBottom: '8px'}}>
              Order #{orderComplete.order_number} &bull; {new Date(orderComplete.created_at).toLocaleString()}
            </div>
            <div className="line" />
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-left">
              {orderComplete.items?.map(item => (
                <div key={item.id}>
                  <div className="row flex justify-between text-sm">
                    <span>{item.quantity}x {item.product_name}</span>
                    <span className="font-medium">${item.total_price.toFixed(2)}</span>
                  </div>
                  {item.note && <p className="text-xs text-gray-400 ml-4">{item.note}</p>}
                </div>
              ))}
            </div>
            <div className="line" />
            <div className="space-y-1 text-sm text-left">
              <div className="row flex justify-between text-gray-500">
                <span>Subtotal</span><span>${orderComplete.subtotal.toFixed(2)}</span>
              </div>
              {orderComplete.discount_amount > 0 && (
                <div className="row flex justify-between text-green-600">
                  <span>Discount</span><span>-${orderComplete.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="row flex justify-between text-gray-500">
                <span>Tax</span><span>${orderComplete.tax_amount.toFixed(2)}</span>
              </div>
              <div className="row flex justify-between font-bold text-lg pt-1 border-t total">
                <span>Total</span><span>${orderComplete.total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-400 capitalize pt-1">Paid by {orderComplete.payment_method}</p>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button onClick={printReceipt} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <Printer size={16} /> Print
            </button>
            <button onClick={() => setOrderComplete(null)} className="btn-primary flex-1 text-lg py-3">
              New Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  const CartContent = () => (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {cart.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <ShoppingBag className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-sm">Tap items to add to cart</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.product_id} className="bg-gray-50 rounded-xl p-3 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-brand-600 text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(item.product_id, -1)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center active:scale-90 transition-transform">
                    <Minus size={14} />
                  </button>
                  <span className="w-7 text-center font-semibold text-sm">{item.quantity}</span>
                  <button onClick={() => updateQty(item.product_id, 1)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center active:scale-90 transition-transform">
                    <Plus size={14} />
                  </button>
                  <button onClick={() => { setEditingNote(item.product_id); setNoteText(item.note || ''); }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform ${item.note ? 'text-brand-500' : 'text-gray-300'}`}>
                    <MessageSquare size={14} />
                  </button>
                  <button onClick={() => removeItem(item.product_id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 active:scale-90 transition-transform">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {item.note && <p className="text-xs text-gray-400 mt-1 pl-1">{item.note}</p>}
            </div>
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="p-4 border-t border-gray-100 space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span><span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>Tax (7%)</span><span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-1 border-t">
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
          </div>

          {showCheckout ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type="number" placeholder="Discount" value={discount} onChange={e => setDiscount(e.target.value)} className="input-field py-2 text-sm pr-10" min="0" />
                </div>
                <button onClick={() => setDiscountType(discountType === 'fixed' ? 'percent' : 'fixed')}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all ${
                    discountType === 'percent' ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-400'}`}>
                  {discountType === 'percent' ? <Percent size={16} /> : <DollarSign size={16} />}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => submitOrder('cash')} disabled={submitting}
                  className="btn-primary flex flex-col items-center gap-1 py-3 text-xs">
                  <Banknote size={20} /> Cash
                </button>
                <button onClick={() => submitOrder('card')} disabled={submitting}
                  className="btn-primary flex flex-col items-center gap-1 py-3 text-xs">
                  <CreditCard size={20} /> Card
                </button>
                <button onClick={() => submitOrder('qr')} disabled={submitting}
                  className="btn-primary flex flex-col items-center gap-1 py-3 text-xs">
                  <QrCode size={20} /> QR Pay
                </button>
              </div>
              <button onClick={() => setShowCheckout(false)} className="btn-secondary w-full text-sm">Back</button>
            </div>
          ) : (
            <button onClick={() => setShowCheckout(true)} className="btn-primary w-full text-lg py-3.5 flex items-center justify-center gap-2">
              Charge ${total.toFixed(2)}
            </button>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 pb-2 space-y-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search menu..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 py-2.5" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={16} /></button>
              )}
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${activeCategory === 'all' ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'}`}>
              All
            </button>
            {categories?.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                  ${activeCategory === cat.id ? 'text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'}`}
                style={activeCategory === cat.id ? { backgroundColor: cat.color } : {}}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-2 pb-20 lg:pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered?.map(product => {
              const inCart = cart.find(i => i.product_id === product.id);
              const outOfStock = product.stock_quantity <= 0;
              return (
                <button key={product.id} onClick={() => !outOfStock && addToCart(product)} disabled={outOfStock}
                  className={`card p-3 text-left transition-all active:scale-[0.97] relative
                    ${outOfStock ? 'opacity-50' : 'hover:shadow-md'}
                    ${inCart ? 'ring-2 ring-brand-500 shadow-md' : ''}`}>
                  <div className="w-full aspect-[4/3] rounded-xl mb-2 flex items-center justify-center"
                    style={{ backgroundColor: product.category_color + '15' }}>
                    <span style={{ color: product.category_color }} className="text-3xl font-bold opacity-30">
                      {product.name[0]}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-gray-900 truncate">{product.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-brand-600 font-bold">${product.price.toFixed(2)}</span>
                    {outOfStock && <span className="text-[10px] text-red-500 font-semibold bg-red-50 px-1.5 py-0.5 rounded">OUT</span>}
                    {product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold && (
                      <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">{product.stock_quantity} left</span>
                    )}
                  </div>
                  {inCart && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                      {inCart.quantity}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {filtered?.length === 0 && (
            <div className="text-center text-gray-400 py-16">No products found</div>
          )}
        </div>
      </div>

      {/* Desktop Cart Sidebar */}
      <div className="hidden lg:flex w-96 bg-white border-l border-gray-100 flex-col shrink-0">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingBag size={20} /> Cart
            {itemCount > 0 && <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">{itemCount}</span>}
          </h2>
          {cart.length > 0 && <button onClick={() => { setCart([]); toast('Cart cleared', 'info'); }} className="text-sm text-red-500 font-medium">Clear</button>}
        </div>
        <CartContent />
      </div>

      {/* Mobile Cart FAB */}
      {itemCount > 0 && !mobileCartOpen && (
        <button onClick={() => setMobileCartOpen(true)}
          className="lg:hidden fixed bottom-20 right-4 bg-brand-600 text-white rounded-2xl px-5 py-3.5 shadow-lg flex items-center gap-3 z-40 active:scale-95 transition-transform animate-scale-in">
          <ShoppingBag size={20} />
          <span className="font-bold">{itemCount} items</span>
          <span className="bg-white/20 px-2 py-0.5 rounded-lg font-bold">${total.toFixed(2)}</span>
          <ChevronUp size={16} />
        </button>
      )}

      {/* Mobile Cart Drawer */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 animate-fade-in" onClick={() => setMobileCartOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <ShoppingBag size={20} /> Cart
                <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">{itemCount}</span>
              </h2>
              <div className="flex items-center gap-3">
                <button onClick={() => { setCart([]); toast('Cart cleared', 'info'); }} className="text-sm text-red-500 font-medium">Clear</button>
                <button onClick={() => setMobileCartOpen(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>
            </div>
            <CartContent />
          </div>
        </div>
      )}

      {/* Note editing modal */}
      {editingNote && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-fade-in" onClick={() => setEditingNote(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="card max-w-sm w-full p-6 m-4 relative z-10 animate-slide-up space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold">Item Note</h3>
            <p className="text-sm text-gray-500">{cart.find(i => i.product_id === editingNote)?.name}</p>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="e.g., No ice, extra sugar, oat milk..."
              className="input-field h-24 resize-none" autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setEditingNote(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveNote} className="btn-primary flex-1">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
