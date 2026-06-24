import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingBag, X, CreditCard, Banknote, QrCode, Receipt } from 'lucide-react';
import { useApi, api } from '../hooks/useApi';

export default function POSPage() {
  const { data: categories } = useApi('/categories');
  const { data: products, refetch: refetchProducts } = useApi('/products?available_only=true');
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderComplete, setOrderComplete] = useState(null);
  const [discount, setDiscount] = useState('');

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
        if (existing.quantity >= product.stock_quantity) return prev;
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1, max_stock: product.stock_quantity }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > i.max_stock) return i;
      return { ...i, quantity: newQty };
    }).filter(Boolean));
  };

  const removeItem = (productId) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = discount ? parseFloat(discount) || 0 : 0;
  const tax = Math.round((subtotal - discountAmount) * 0.07 * 100) / 100;
  const total = Math.round((subtotal - discountAmount + tax) * 100) / 100;
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const submitOrder = async (paymentMethod) => {
    try {
      const order = await api.post('/orders', {
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        discount_amount: discountAmount,
        discount_type: discountAmount > 0 ? 'fixed' : null,
        payment_method: paymentMethod,
      });
      setOrderComplete(order);
      setCart([]);
      setDiscount('');
      setShowCheckout(false);
      refetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  if (orderComplete) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Receipt className="text-green-600" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Order Complete!</h2>
          <p className="text-gray-500 mb-6">Order #{orderComplete.order_number}</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
            {orderComplete.items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.product_name}</span>
                <span className="font-medium">${item.total_price.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${orderComplete.total.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={() => setOrderComplete(null)} className="btn-primary w-full text-lg py-3">
            New Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 pb-2 space-y-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search menu..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field pl-10 py-2.5"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                ${activeCategory === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              All
            </button>
            {categories?.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                  ${activeCategory === cat.id ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                style={activeCategory === cat.id ? { backgroundColor: cat.color } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered?.map(product => {
              const inCart = cart.find(i => i.product_id === product.id);
              const outOfStock = product.stock_quantity <= 0;
              return (
                <button
                  key={product.id}
                  onClick={() => !outOfStock && addToCart(product)}
                  disabled={outOfStock}
                  className={`card p-3 text-left transition-all active:scale-[0.97] relative
                    ${outOfStock ? 'opacity-50' : 'hover:shadow-md'}
                    ${inCart ? 'ring-2 ring-brand-500' : ''}`}
                >
                  <div
                    className="w-full aspect-square rounded-xl mb-2 flex items-center justify-center text-2xl"
                    style={{ backgroundColor: product.category_color + '15' }}
                  >
                    <span style={{ color: product.category_color }} className="text-3xl font-bold opacity-40">
                      {product.name[0]}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-gray-900 truncate">{product.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-brand-600 font-bold">${product.price.toFixed(2)}</span>
                    {outOfStock && <span className="text-[10px] text-red-500 font-medium">OUT</span>}
                    {product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold && (
                      <span className="text-[10px] text-amber-500 font-medium">{product.stock_quantity} left</span>
                    )}
                  </div>
                  {inCart && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
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

      {/* Cart Sidebar */}
      <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingBag size={20} /> Cart
            {itemCount > 0 && (
              <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">{itemCount}</span>
            )}
          </h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-sm text-red-500 font-medium">Clear</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <ShoppingBag className="mx-auto mb-3 opacity-30" size={40} />
              <p className="text-sm">Tap items to add to cart</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product_id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-brand-600 text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.product_id, -1)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center active:scale-90 transition-transform">
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                  <button onClick={() => updateQty(item.product_id, 1)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center active:scale-90 transition-transform">
                    <Plus size={14} />
                  </button>
                  <button onClick={() => removeItem(item.product_id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 active:scale-90 transition-transform">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-gray-100 space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Tax (7%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-1 border-t">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {showCheckout ? (
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Discount amount ($)"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  className="input-field py-2 text-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => submitOrder('cash')} className="btn-primary flex flex-col items-center gap-1 py-3 text-xs">
                    <Banknote size={20} /> Cash
                  </button>
                  <button onClick={() => submitOrder('card')} className="btn-primary flex flex-col items-center gap-1 py-3 text-xs">
                    <CreditCard size={20} /> Card
                  </button>
                  <button onClick={() => submitOrder('qr')} className="btn-primary flex flex-col items-center gap-1 py-3 text-xs">
                    <QrCode size={20} /> QR Pay
                  </button>
                </div>
                <button onClick={() => setShowCheckout(false)} className="btn-secondary w-full text-sm">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setShowCheckout(true)} className="btn-primary w-full text-lg py-3.5 flex items-center justify-center gap-2">
                Charge ${total.toFixed(2)}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
