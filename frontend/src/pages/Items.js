import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

export default function Items() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [formData, setFormData] = useState({
    nome: '',
    preco_real: '',
    preco_venda: '',
    desconto_maximo: 10,
    categoria: 'material'
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setItems(response.data);
    } catch (error) {
      toast.error('Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        preco_real: parseFloat(formData.preco_real),
        preco_venda: parseFloat(formData.preco_venda),
        desconto_maximo: parseFloat(formData.desconto_maximo)
      };

      if (editingItem) {
        await api.put(`/items/${editingItem.id}`, data);
        toast.success('Item atualizado com sucesso!');
      } else {
        await api.post('/items', data);
        toast.success('Item criado com sucesso!');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar item');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      preco_real: item.preco_real.toString(),
      preco_venda: item.preco_venda.toString(),
      desconto_maximo: item.desconto_maximo,
      categoria: item.categoria
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/items/${deleteDialog.item.id}`);
      toast.success('Item excluído com sucesso!');
      setDeleteDialog({ open: false, item: null });
      fetchItems();
    } catch (error) {
      toast.error('Erro ao excluir item');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      preco_real: '',
      preco_venda: '',
      desconto_maximo: 10,
      categoria: 'material'
    });
    setEditingItem(null);
  };

  const calculateMargin = () => {
    const real = parseFloat(formData.preco_real) || 0;
    const venda = parseFloat(formData.preco_venda) || 0;
    if (venda === 0) return 0;
    return ((venda - real) / venda * 100).toFixed(2);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="items-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Itens
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Gerencie seu catálogo de produtos e serviços
          </p>
        </div>
        <Button 
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          data-testid="create-item-button"
          className="bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20"
        >
          <Plus size={20} className="mr-2" />
          Novo Item
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <Input
              placeholder="Buscar itens..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="search-items-input"
              className="pl-10 h-12"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48 h-12" data-testid="category-filter">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="servico">Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="items-table">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="text-left py-4 px-6 font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Item</th>
                <th className="text-right py-4 px-6 font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Custo Real</th>
                <th className="text-right py-4 px-6 font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Preço Venda</th>
                <th className="text-right py-4 px-6 font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Margem</th>
                <th className="text-center py-4 px-6 font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Categoria</th>
                <th className="text-right py-4 px-6 font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr 
                  key={item.id}
                  data-testid={`item-row-${item.id}`}
                  className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="bg-cyan-500/10 text-cyan-500 p-2 rounded-lg">
                        <Package size={16} />
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">{item.nome}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right font-mono text-slate-900 dark:text-white">
                    R$ {item.preco_real.toFixed(2)}
                  </td>
                  <td className="py-4 px-6 text-right font-mono text-slate-900 dark:text-white">
                    R$ {item.preco_venda.toFixed(2)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className={`font-mono font-semibold ${
                      item.margem >= 30 ? 'text-emerald-500' :
                      item.margem >= 20 ? 'text-cyan-500' :
                      'text-red-500'
                    }`}>
                      {item.margem.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                      item.categoria === 'material' 
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-purple-500/10 text-purple-500'
                    }`}>
                      {item.categoria === 'material' ? 'Material' : 'Serviço'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        data-testid={`edit-item-${item.id}`}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, item })}
                        data-testid={`delete-item-${item.id}`}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">Nenhum item encontrado</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Crie um novo item para começar.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="item-dialog">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Atualize as informações do item' : 'Adicione um novo item ao catálogo'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Item</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                data-testid="item-name-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preco_real">Custo Real (R$)</Label>
                <Input
                  id="preco_real"
                  type="number"
                  step="0.01"
                  value={formData.preco_real}
                  onChange={(e) => setFormData({ ...formData, preco_real: e.target.value })}
                  required
                  data-testid="item-preco-real-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preco_venda">Preço Venda (R$)</Label>
                <Input
                  id="preco_venda"
                  type="number"
                  step="0.01"
                  value={formData.preco_venda}
                  onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })}
                  required
                  data-testid="item-preco-venda-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="desconto_maximo">Desconto Máximo (%)</Label>
                <Input
                  id="desconto_maximo"
                  type="number"
                  step="0.1"
                  value={formData.desconto_maximo}
                  onChange={(e) => setFormData({ ...formData, desconto_maximo: e.target.value })}
                  required
                  data-testid="item-desconto-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select 
                  value={formData.categoria} 
                  onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                >
                  <SelectTrigger data-testid="item-categoria-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.preco_real && formData.preco_venda && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <div className="text-sm text-slate-500 dark:text-slate-400">Margem calculada:</div>
                <div className={`text-2xl font-bold ${
                  parseFloat(calculateMargin()) >= 30 ? 'text-emerald-500' :
                  parseFloat(calculateMargin()) >= 20 ? 'text-cyan-500' :
                  'text-red-500'
                }`}>
                  {calculateMargin()}%
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                data-testid="item-submit-button"
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                {editingItem ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteDialog.item?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              data-testid="confirm-delete-item"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}