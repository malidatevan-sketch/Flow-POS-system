import { useState } from 'react';
import { Plus, Edit3, Trash2, Tag, Coffee, GripVertical, Eye, EyeOff } from 'lucide-react';
import { useApi, api } from '../hooks/useApi';
import { useToast } from '../components/Toast';
import { PageLoader } from '../components/Loading';
import Modal from '../components/Modal';

function CategoryForm({ category, onSave, onCancel }) {
  const toast = useToast();
  const [name, setName] = useState(category?.name || '');
  const [color, setColor] = useState(category?.color || '#6366f1');
  const [saving, setSaving] = useState(false);

  const colors = ['#92400e', '#166534', '#9333ea', '#c2410c', '#0369a1', '#b91c1c', '#6366f1', '#0891b2', '#d97706', '#be185d', '#4338ca', '#059669'];

  const handleSubmit = async () => {
    if (!name.trim()) { toast('Name is required', 'warning'); return; }
    setSaving(true);
    try {
      if (category) {
        await api.put(`/categories/${category.id}`, { name, color });
        toast('Category updated', 'success');
      } else {
        await api.post('/categories', { name, color });
        toast('Category created', 'success');
      }
      onSave();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <input type="text" placeholder="Category name" value={name} onChange={e => setName(e.target.value)} className="input-field" autoFocus />
      <div>
        <p className="text-xs text-gray-400 mb-2">Color</p>
        <div className="flex gap-2 flex-wrap">
          {colors.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={`w-9 h-9 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : category ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );
}

function ProductForm({ product, categories, onSave, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: product?.name || '',
    price: product?.price?.toString() || '',
    category_id: product?.category_id || categories?.[0]?.id || '',
    stock_quantity: product?.stock_quantity?.toString() || '0',
    low_stock_threshold: product?.low_stock_threshold?.toString() || '10',
    unit: product?.unit || 'pcs',
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast('Name is required', 'warning'); return; }
    if (!form.price || parseFloat(form.price) <= 0) { toast('Valid price is required', 'warning'); return; }
    if (!form.category_id) { toast('Select a category', 'warning'); return; }
    setSaving(true);
    try {
      const data = {
        ...form,
        price: parseFloat(form.price),
        stock_quantity: parseInt(form.stock_quantity) || 0,
        low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
      };
      if (product) {
        await api.put(`/products/${product.id}`, data);
        toast('Product updated', 'success');
      } else {
        await api.post('/products', data);
        toast('Product created', 'success');
      }
      onSave();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <input type="text" placeholder="Product name" value={form.name} onChange={e => set('name', e.target.value)} className="input-field" autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Price ($)</label>
          <input type="number" placeholder="0.00" value={form.price} onChange={e => set('price', e.target.value)} className="input-field" step="0.01" min="0" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Category</label>
          <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className="input-field">
            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Stock</label>
          <input type="number" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} className="input-field" min="0" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Low alert</label>
          <input type="number" value={form.low_stock_threshold} onChange={e => set('low_stock_threshold', e.target.value)} className="input-field" min="0" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Unit</label>
          <select value={form.unit} onChange={e => set('unit', e.target.value)} className="input-field">
            <option value="pcs">pcs</option>
            <option value="cups">cups</option>
            <option value="kg">kg</option>
            <option value="L">L</option>
            <option value="bottles">bottles</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : product ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );
}

export default function ManagePage() {
  const toast = useToast();
  const [tab, setTab] = useState('products');
  const { data: categories, loading: loadingCats, refetch: refetchCats } = useApi('/categories');
  const { data: products, loading: loadingProds, refetch: refetchProds } = useApi('/products');
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProdForm, setShowProdForm] = useState(false);

  const deleteCategory = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast('Category deleted', 'success');
      refetchCats();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast('Product deleted', 'success');
      refetchProds();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const toggleAvailable = async (product) => {
    const newState = product.is_available ? 0 : 1;
    await api.put(`/products/${product.id}`, { is_available: newState });
    toast(newState ? `${product.name} is now visible` : `${product.name} hidden from POS`, 'info');
    refetchProds();
  };

  if (loadingCats || loadingProds) return <PageLoader />;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-2 shrink-0">
        <h1 className="text-xl font-bold mb-3">Manage</h1>
        <div className="flex gap-2">
          <button onClick={() => setTab('products')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5
              ${tab === 'products' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            <Coffee size={14} /> Products ({products?.length || 0})
          </button>
          <button onClick={() => setTab('categories')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5
              ${tab === 'categories' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            <Tag size={14} /> Categories ({categories?.length || 0})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-2">
        <div className="max-w-2xl mx-auto">
          {tab === 'categories' && (
            <div className="space-y-3">
              <button onClick={() => { setShowCatForm(true); setEditingCategory(null); }}
                className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Add Category
              </button>

              {categories?.map(cat => (
                <div key={cat.id} className="card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color }}>
                    <span className="text-white font-bold text-sm">{cat.name[0]}</span>
                  </div>
                  <span className="flex-1 font-medium">{cat.name}</span>
                  <button onClick={() => { setEditingCategory(cat); setShowCatForm(false); }}
                    className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 active:scale-90 transition-all">
                    <Edit3 size={15} />
                  </button>
                  <button onClick={() => deleteCategory(cat.id)}
                    className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 active:scale-90 transition-all">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'products' && (
            <div className="space-y-3">
              <button onClick={() => { setShowProdForm(true); setEditingProduct(null); }}
                className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Add Product
              </button>

              {products?.map(prod => (
                <div key={prod.id} className="card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: (prod.category_color || '#6366f1') + '20' }}>
                    <span className="font-bold text-sm" style={{ color: prod.category_color || '#6366f1' }}>{prod.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{prod.name}</p>
                    <p className="text-xs text-gray-400">{prod.category_name} &middot; ${prod.price.toFixed(2)} &middot; {prod.stock_quantity} {prod.unit}</p>
                  </div>
                  <button onClick={() => toggleAvailable(prod)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center active:scale-90 transition-all
                      ${prod.is_available ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400'}`}>
                    {prod.is_available ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button onClick={() => { setEditingProduct(prod); setShowProdForm(false); }}
                    className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 active:scale-90 transition-all">
                    <Edit3 size={15} />
                  </button>
                  <button onClick={() => deleteProduct(prod.id)}
                    className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 active:scale-90 transition-all">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Form Modal */}
      <Modal open={showCatForm || !!editingCategory} onClose={() => { setShowCatForm(false); setEditingCategory(null); }}
        title={editingCategory ? 'Edit Category' : 'New Category'}>
        <CategoryForm
          category={editingCategory}
          onSave={() => { setShowCatForm(false); setEditingCategory(null); refetchCats(); }}
          onCancel={() => { setShowCatForm(false); setEditingCategory(null); }}
        />
      </Modal>

      {/* Product Form Modal */}
      <Modal open={showProdForm || !!editingProduct} onClose={() => { setShowProdForm(false); setEditingProduct(null); }}
        title={editingProduct ? 'Edit Product' : 'New Product'} size="lg">
        <ProductForm
          product={editingProduct}
          categories={categories}
          onSave={() => { setShowProdForm(false); setEditingProduct(null); refetchProds(); }}
          onCancel={() => { setShowProdForm(false); setEditingProduct(null); }}
        />
      </Modal>
    </div>
  );
}
