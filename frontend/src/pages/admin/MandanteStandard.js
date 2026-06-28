import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../../components/ui/dialog';
import {
  Plus, Edit2, Trash2, Loader2, FolderTree, FileText, ArrowLeft, Link2,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MandanteStandard = () => {
  const { mandanteId } = useParams();
  const [mandante, setMandante] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category dialog
  const [catDialog, setCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  // Item dialog
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [targetCategoryId, setTargetCategoryId] = useState(null);
  const [itemForm, setItemForm] = useState({ name: '', description: '', document_type_id: '', is_required: true });

  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = async () => {
    const [m, std, dt] = await Promise.all([
      fetch(`${API}/mandantes`, { headers }).then((r) => r.json()),
      fetch(`${API}/mandantes/${mandanteId}/standard`, { headers }).then((r) => r.json()),
      fetch(`${API}/document-types`, { headers }).then((r) => (r.ok ? r.json() : [])),
    ]);
    setMandante((m || []).find((x) => x.mandante_id === mandanteId) || null);
    setCategories(std.categories || []);
    setItems(std.items || []);
    setDocTypes(dt || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [mandanteId]);

  const itemsByCategory = useMemo(() => {
    const m = {};
    items.forEach((it) => {
      if (!m[it.category_id]) m[it.category_id] = [];
      m[it.category_id].push(it);
    });
    return m;
  }, [items]);

  const docTypeNameById = useMemo(
    () => docTypes.reduce((acc, d) => { acc[d.document_type_id] = d.name; return acc; }, {}),
    [docTypes]
  );

  const submitCategory = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingCat
        ? `${API}/mandantes/${mandanteId}/standard/categories/${editingCat.category_id}`
        : `${API}/mandantes/${mandanteId}/standard/categories`;
      const method = editingCat ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers, body: JSON.stringify({
        name: catForm.name.trim(),
        description: catForm.description || null,
        order_index: editingCat?.order_index ?? categories.length,
      }) });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      toast.success(editingCat ? 'Categoría actualizada' : 'Categoría creada');
      setCatDialog(false);
      setEditingCat(null);
      setCatForm({ name: '', description: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitItem = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingItem
        ? `${API}/mandantes/${mandanteId}/standard/items/${editingItem.item_id}`
        : `${API}/mandantes/${mandanteId}/standard/items`;
      const method = editingItem ? 'PUT' : 'POST';
      const payload = {
        category_id: editingItem?.category_id || targetCategoryId,
        name: itemForm.name.trim(),
        description: itemForm.description || null,
        document_type_id: itemForm.document_type_id || null,
        is_required: itemForm.is_required,
        order_index: editingItem?.order_index ?? (itemsByCategory[targetCategoryId]?.length || 0),
      };
      const r = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error((await r.json()).detail || 'Error');
      toast.success(editingItem ? 'Ítem actualizado' : 'Ítem creado');
      setItemDialog(false);
      setEditingItem(null);
      setItemForm({ name: '', description: '', document_type_id: '', is_required: true });
      fetchAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría? Se eliminarán también todos sus ítems.')) return;
    const r = await fetch(`${API}/mandantes/${mandanteId}/standard/categories/${id}`, { method: 'DELETE', headers });
    if (r.ok) { toast.success('Eliminada'); fetchAll(); } else toast.error('Error');
  };

  const deleteItem = async (id) => {
    if (!window.confirm('¿Eliminar este ítem?')) return;
    const r = await fetch(`${API}/mandantes/${mandanteId}/standard/items/${id}`, { method: 'DELETE', headers });
    if (r.ok) { toast.success('Eliminado'); fetchAll(); } else toast.error('Error');
  };

  const openNewItem = (categoryId) => {
    setTargetCategoryId(categoryId);
    setEditingItem(null);
    setItemForm({ name: '', description: '', document_type_id: '', is_required: true });
    setItemDialog(true);
  };

  const openEditItem = (it) => {
    setTargetCategoryId(it.category_id);
    setEditingItem(it);
    setItemForm({
      name: it.name || '',
      description: it.description || '',
      document_type_id: it.document_type_id || '',
      is_required: it.is_required ?? true,
    });
    setItemDialog(true);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  const totalItems = items.length;
  const requiredItems = items.filter((i) => i.is_required).length;

  return (
    <div className="space-y-6" data-testid="mandante-standard">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link to="/admin/mandantes" className="mt-1 text-slate-400 hover:text-slate-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Estándar de Acreditación</p>
            <h1 className="text-2xl font-bold text-slate-900">{mandante?.name || 'Mandante'}</h1>
            <p className="text-sm text-slate-500">
              {categories.length} categoría(s) · {totalItems} ítem(s) · {requiredItems} obligatorio(s)
            </p>
          </div>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => { setEditingCat(null); setCatForm({ name: '', description: '' }); setCatDialog(true); }}
          data-testid="new-category-btn"
        >
          <Plus className="w-4 h-4 mr-2" /> Nueva categoría
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-slate-500">
          <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium">Sin categorías definidas todavía.</p>
          <p className="text-xs text-slate-400 mt-1">
            Empieza creando categorías como &quot;Documentación legal&quot;, &quot;Salud ocupacional&quot;, &quot;Capacitaciones obligatorias&quot;.
          </p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4" data-testid="categories-list">
          {categories.map((cat) => (
            <Card key={cat.category_id} data-testid={`category-${cat.category_id}`}>
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FolderTree className="w-5 h-5 text-blue-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{cat.name}</CardTitle>
                      {cat.description && <p className="text-xs text-slate-500 mt-0.5">{cat.description}</p>}
                      <p className="text-xs text-slate-400 mt-1">
                        {(itemsByCategory[cat.category_id] || []).length} ítem(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline"
                      onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, description: cat.description || '' }); setCatDialog(true); }}
                      data-testid={`edit-category-${cat.category_id}`}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700"
                      onClick={() => deleteCategory(cat.category_id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                {(itemsByCategory[cat.category_id] || []).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">Sin ítems en esta categoría.</p>
                ) : (
                  (itemsByCategory[cat.category_id] || []).map((it) => (
                    <div key={it.item_id} className="border border-slate-200 rounded-lg p-3 flex items-start justify-between gap-3" data-testid={`item-${it.item_id}`}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-slate-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900">{it.name}</p>
                            {it.is_required ? (
                              <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">Obligatorio</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">Opcional</Badge>
                            )}
                            {it.document_type_id && (
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 gap-1">
                                <Link2 className="w-2.5 h-2.5" />
                                {docTypeNameById[it.document_type_id] || 'Tipo vinculado'}
                              </Badge>
                            )}
                          </div>
                          {it.description && <p className="text-xs text-slate-500 mt-0.5">{it.description}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => openEditItem(it)} data-testid={`edit-item-${it.item_id}`}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => deleteItem(it.item_id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 border-dashed text-slate-600"
                  onClick={() => openNewItem(cat.category_id)}
                  data-testid={`new-item-${cat.category_id}`}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar ítem
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category dialog */}
      <Dialog open={catDialog} onOpenChange={(o) => { setCatDialog(o); if (!o) { setEditingCat(null); setCatForm({ name: '', description: '' }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
            <DialogDescription>Agrupa los ítems documentales (ej: Documentación legal, Salud ocupacional).</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCategory} className="space-y-3">
            <div><Label>Nombre *</Label><Input required value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} data-testid="category-name-input" /></div>
            <div><Label>Descripción (opcional)</Label><Textarea rows={2} value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} /></div>
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700" data-testid="category-submit-btn">
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {editingCat ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemDialog} onOpenChange={(o) => { setItemDialog(o); if (!o) { setEditingItem(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar ítem' : 'Nuevo ítem'}</DialogTitle>
            <DialogDescription>Documento o evidencia requerida por el mandante.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitItem} className="space-y-3">
            <div><Label>Nombre del ítem *</Label><Input required value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="Ej: Contrato de trabajo" data-testid="item-name-input" /></div>
            <div><Label>Descripción (opcional)</Label><Textarea rows={2} value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Detalles, formato esperado, vigencia mínima..." /></div>
            <div>
              <Label>Vincular a Tipo de Documento (opcional)</Label>
              <select
                value={itemForm.document_type_id}
                onChange={(e) => setItemForm({ ...itemForm, document_type_id: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                data-testid="item-doctype-select"
              >
                <option value="">— Sin vínculo —</option>
                {docTypes.map((d) => (
                  <option key={d.document_type_id} value={d.document_type_id}>{d.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">Si vinculas un tipo, el sistema podrá detectar automáticamente cuándo el trabajador lo cargue.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={itemForm.is_required}
                onCheckedChange={(v) => setItemForm({ ...itemForm, is_required: !!v })}
                data-testid="item-required-checkbox"
              />
              <span className="text-sm text-slate-700">Ítem obligatorio</span>
            </label>
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700" data-testid="item-submit-btn">
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {editingItem ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MandanteStandard;
