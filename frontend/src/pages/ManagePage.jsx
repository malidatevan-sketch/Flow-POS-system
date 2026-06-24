import { useState } from 'react';
import { Plus, Edit3, Trash2, X, Tag, Coffee } from 'lucide-react';
import { useApi, api } from '../hooks/useApi';

function CategoryForm({ category, categories, onSave, onCancel }) {
  const [name, setName] = useState(category?.name || '');
  const [color, setColor] = useState(category?.color || '#6366f1');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (category) {
      await api.put(`/categories/${category.id}`, { name, color });
    } else {
      await api.post('/categories', { name, color });
    }
    onSave();
  };

  const colors = ['#92400e', '#166534', '#9333ea', '#c2410c', '#0369a1', '#b91c1c', '#6366f1', '#0891b2', '#d97706'];

  return (
    <div className="space-y-3">
      <input type="text" placeholder="Category name" value={name} onChange={e => setName(e.target.value)} className="input-field" autoFocus />
      <div className="flex gap-2 flex-wrap">
        {colors.map(c => (
          <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`} style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button onClick={handleSubmit} className="btn-primary flex-1">{category ? 'Update' : 'Add'}</button>
      </div>
    </div>
  );
}

function ProductForm({ product, categories, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    price: product?.price?.toString() || '',
    category_id: product?.category_id || categories?.[0]?.id || '',
    stock_quantity: product?.stock_quantity?.toString() || '0',
    low_stock_threshold: product?.low_stock_threshold?.toString() || '10',
    unit: product?.unit || 'pcs',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price || !form.category_id) return;
    const data = { ...form, price: parseFloat(form.price), stock_quantity: parseInt(form.stock_quantity), low_stock_threshold: parseInt(form.low_stock_threshold) };
    if (product) {
      await api.put(`/products/${product.id}`, data);
    } else {
      await api.post('/products', data);
    }
    onSave();
  };

  return (
    <div className="space-y-3">
      <input type="text" placeholder="Product name" value={form.name} onChange={e => set('name', e.target.value)} className="input-field" autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <input type="number" placeholder="Price" value={form.price} onChange={e => set('price', e.target.value)} className="input-field" step="0.01" min="0" />
        <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className="input-field">
          {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input type="number" placeholder="Stock" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} className="input-field" min="0" />
        <input type="number" placeholder="Low threshold" value={form.low_stock_threshold} onChange={e => set('low_stock_threshold', e.target.value)} className="input-field" min="0" />
        <select value={form.unit} onChange={e => set('unit', e.target.value)} className="input-field">
          <option value="pcs">pcs</option>
          <option value="cups">cups</option>
          <option value="kg">kg</option>
          <option value="L">L</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button onClick={handleSubmit} className="btn-primary flex-1">{product ? 'Update' : 'Add'}</button>
      </div>
    </div>
  );
}

export default function ManagePage() {
  const [tab, setTab] = useState('products');
  const { data: categories, refetch: refetchCats } = useApi('/categories');
  const { data: products, refetch: refetchProds } = useApi('/products');
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProdForm, setShowProdForm] = useState(false);

  const deleteCategory = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      refetchCats();
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    refetchProds();
  };

  const toggleAvailable = async (product) => {
    await api.put(`/products/${product.id}`, { is_available: product.is_available ? 0 : 1 });
    refetchProds();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-2 shrink-0">
        <h1 className="text-xl font-bold mb-3">Manage</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('products')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === 'products' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            <Coffee size={14} className="inline mr-1" /> Products
          </button>
          <button
            onClick={() => setTab('categories')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === 'categories' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            <Tag size={14} className="inline mr-1" /> Categories
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-2">
        <div className="max-w-2xl mx-auto">
          {tab === 'categories' && (
            <div className="space-y-3">
              <button onClick={() => { setShowCatForm(true); setEditingCategory(null); }} className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Add Category
              </button>
              {(showCatForm || editingCategory) && (
                <div className="card p-4">
                  <CategoryForm
                    category={editingCategory}
                    categories={categories}
                    onSave={() => { setShowCatForm(false); setEditingCategory(null); refetchCats(); }}
                    onCancel={() => { setShowCatForm(false); setEditingCategory(null); }}
                  />
                </div>
              )}
              {categories?.map(cat => (
                <div key={cat.id} className="card p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 font-medium">{cat.name}</span>
                  <button onClick={() => { setEditingCategory(cat); setShowCatForm(false); }} className="p-2 text-gray-400 hover:text-gray-600">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => deleteCategory(cat.id)} className="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'products' && (
            <div className="space-y-3">
              <button onClick={() => { setShowProdForm(true); setEditingProduct(null); }} className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Add Product
              </button>
              {(showProdForm || editingProduct) && (
                <div className="card p-4">
                  <ProductForm
                    product={editingProduct}
                    categories={categories}
                    onSave={() => { setShowProdForm(false); setEditingProduct(null); refetchProds(); }}
                    onCancel={() => { setShowProdForm(false); setEditingProduct(null); }}
                  />
                </div>
              )}
              {products?.map(prod => (
                <div key={prod.id} className="card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: prod.category_color + '20' }}>
                    <span className="font-bold text-sm" style={{ color: prod.category_color }}>{prod.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{prod.name}</p>
                    <p className="text-xs text-gray-400">{prod.category_name} &middot; ${prod.price.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => toggleAvailable(prod)}
                    className={`text-xs font-medium px-2 py-1 rounded-full ${prod.is_available ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                  >
                    {prod.is_available ? 'Active' : 'Hidden'}
                  </button>
                  <button onClick={() => { setEditingProduct(prod); setShowProdForm(false); }} className="p-2 text-gray-400 hover:text-gray-600">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => deleteProduct(prod.id)} className="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
