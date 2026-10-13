import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Sparkles,
  Edit,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Save,
  X,
  ShoppingCart,
  Upload,
} from 'lucide-react';
import { apiClient } from '../api/client';

interface ProductsPageProps {
  onTriggerAgentRun: (productId: string) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ onTriggerAgentRun }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'issues' | 'healthy'>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  // Modal / Detail state
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [healthScoreDetail, setHealthScoreDetail] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit: 15,
        search: search || undefined,
      };
      if (filterType === 'issues') params.hasIssues = true;
      if (filterType === 'healthy') params.minHealth = 80;

      const res = await apiClient.getProducts(params);
      setProducts(res.data || []);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, filterType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleOpenDetail = async (prod: any) => {
    setSelectedProduct(prod);
    setEditForm({
      name: prod.name,
      sku: prod.sku || '',
      price: prod.price || '',
      regular_price: prod.regular_price || '',
      description: prod.description || '',
      short_description: prod.short_description || '',
      meta_title: prod.meta_title || '',
      meta_description: prod.meta_description || '',
    });

    try {
      const score = await apiClient.getProductHealthScore(prod.id);
      setHealthScoreDetail(score);
    } catch {
      setHealthScoreDetail(null);
    }
  };

  const handleSaveProduct = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const updated = await apiClient.updateProduct(selectedProduct.id, editForm);
      setSelectedProduct(updated);
      fetchProducts();
      alert('Product updated successfully and health score recalculated!');
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncProduct = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await apiClient.syncProduct(id);
      alert(`Sync completed! ${res.message}`);
      fetchProducts();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const res = await apiClient.importFile(file);
      alert(`Import complete! Processed ${res.imported_count} products. Catalog Doctor scanned and scores recalculated.`);
      fetchProducts();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#F43F5E';
  };

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Controls Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search
              size={16}
              color="#64748B"
              style={{ position: 'absolute', left: '12px', top: '10px' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by title, SKU, category..."
              className="glass-input"
              style={{ width: '100%', paddingLeft: '36px' }}
            />
          </div>
          <button type="submit" className="btn-secondary" style={{ padding: '8px 14px' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => {
              setFilterType('all');
              setPage(1);
            }}
            className={filterType === 'all' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            All Products
          </button>
          <button
            onClick={() => {
              setFilterType('issues');
              setPage(1);
            }}
            className={filterType === 'issues' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            Has Issues
          </button>
          <button
            onClick={() => {
              setFilterType('healthy');
              setPage(1);
            }}
            className={filterType === 'healthy' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          >
            Optimal (80+)
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.json"
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Upload size={14} color="#06B6D4" />
            <span>{importing ? 'Importing...' : 'Import Catalog'}</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.88rem',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <th style={{ padding: '14px 20px', color: '#94A3B8', fontWeight: 600 }}>PRODUCT</th>
              <th style={{ padding: '14px 16px', color: '#94A3B8', fontWeight: 600 }}>SKU</th>
              <th style={{ padding: '14px 16px', color: '#94A3B8', fontWeight: 600 }}>PRICE</th>
              <th style={{ padding: '14px 16px', color: '#94A3B8', fontWeight: 600 }}>
                HEALTH SCORE
              </th>
              <th style={{ padding: '14px 16px', color: '#94A3B8', fontWeight: 600 }}>ISSUES</th>
              <th style={{ padding: '14px 16px', color: '#94A3B8', fontWeight: 600 }}>SYNC</th>
              <th
                style={{
                  padding: '14px 20px',
                  color: '#94A3B8',
                  fontWeight: 600,
                  textAlign: 'right',
                }}
              >
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                  <RefreshCw
                    size={24}
                    className="animate-spin"
                    style={{ margin: '0 auto 8px auto' }}
                  />
                  Loading products...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                  No matching products found.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const score = p.health_score ?? 0;
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#F8FAFC' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>ID: {p.id}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {p.sku ? (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: '#CBD5E1',
                            fontSize: '0.82rem',
                          }}
                        >
                          {p.sku}
                        </span>
                      ) : (
                        <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>
                          MISSING
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#F8FAFC', fontWeight: 600 }}>
                      {p.price ? `$${p.price}` : <span style={{ color: '#F43F5E' }}>No Price</span>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            background: getScoreColor(score) + '22',
                            color: getScoreColor(score),
                          }}
                        >
                          {score}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {p.issues_count > 0 ? (
                        <span className="badge badge-critical" style={{ fontSize: '0.72rem' }}>
                          {p.issues_count} open
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                          Clean
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {p.wc_synced_at ? (
                        <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                          SYNCED
                        </span>
                      ) : (
                        <span className="badge badge-demo" style={{ fontSize: '0.68rem' }}>
                          PENDING
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenDetail(p)}
                          className="btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                          title="View / Edit Product"
                        >
                          <Edit size={13} /> Edit
                        </button>
                        <button
                          onClick={() => onTriggerAgentRun(p.id)}
                          className="btn-primary"
                          style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                          title="Run Multi-Agent Repair"
                        >
                          <Sparkles size={13} /> Fix
                        </button>
                        <button
                          onClick={() => handleSyncProduct(p.id)}
                          disabled={syncingId === p.id}
                          className="btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                          title="Sync to WooCommerce"
                        >
                          <ShoppingCart size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Product Detail & Inline Editor Modal */}
      {selectedProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              background: '#0d1322',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>
                  {selectedProduct.name}
                </h2>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  Product ID: {selectedProduct.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: '24px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              {/* Score Breakdown Bar */}
              {healthScoreDetail && (
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC' }}>
                      Health Score Breakdown
                    </span>
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        color: getScoreColor(healthScoreDetail.total),
                      }}
                    >
                      {healthScoreDetail.total}/100
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '10px',
                      fontSize: '0.78rem',
                      color: '#94A3B8',
                    }}
                  >
                    <div>
                      Description:{' '}
                      <strong style={{ color: '#fff' }}>{healthScoreDetail.description}/25</strong>
                    </div>
                    <div>
                      SEO: <strong style={{ color: '#fff' }}>{healthScoreDetail.seo}/20</strong>
                    </div>
                    <div>
                      Media: <strong style={{ color: '#fff' }}>{healthScoreDetail.media}/20</strong>
                    </div>
                    <div>
                      Attributes:{' '}
                      <strong style={{ color: '#fff' }}>{healthScoreDetail.attributes}/15</strong>
                    </div>
                    <div>
                      SKU/ID:{' '}
                      <strong style={{ color: '#fff' }}>{healthScoreDetail.identifier}/10</strong>
                    </div>
                    <div>
                      Price: <strong style={{ color: '#fff' }}>{healthScoreDetail.price}/10</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      color: '#94A3B8',
                      marginBottom: '4px',
                    }}
                  >
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      color: '#94A3B8',
                      marginBottom: '4px',
                    }}
                  >
                    SKU
                  </label>
                  <input
                    type="text"
                    value={editForm.sku}
                    onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      color: '#94A3B8',
                      marginBottom: '4px',
                    }}
                  >
                    Price ($)
                  </label>
                  <input
                    type="text"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      color: '#94A3B8',
                      marginBottom: '4px',
                    }}
                  >
                    Regular Price ($)
                  </label>
                  <input
                    type="text"
                    value={editForm.regular_price}
                    onChange={(e) => setEditForm({ ...editForm, regular_price: e.target.value })}
                    className="glass-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    color: '#94A3B8',
                    marginBottom: '4px',
                  }}
                >
                  SEO Meta Title
                </label>
                <input
                  type="text"
                  value={editForm.meta_title}
                  onChange={(e) => setEditForm({ ...editForm, meta_title: e.target.value })}
                  className="glass-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    color: '#94A3B8',
                    marginBottom: '4px',
                  }}
                >
                  SEO Meta Description
                </label>
                <textarea
                  rows={2}
                  value={editForm.meta_description}
                  onChange={(e) => setEditForm({ ...editForm, meta_description: e.target.value })}
                  className="glass-input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    color: '#94A3B8',
                    marginBottom: '4px',
                  }}
                >
                  Full Description
                </label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="glass-input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  onTriggerAgentRun(selectedProduct.id);
                }}
                className="btn-secondary"
              >
                <Sparkles size={14} color="#06B6D4" /> Trigger AI Multi-Agent Repair
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setSelectedProduct(null)} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleSaveProduct} disabled={saving} className="btn-primary">
                  <Save size={14} /> {saving ? 'Saving...' : 'Save & Recalculate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
