import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, AlertTriangle, Save } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';

export default function OrcamentoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [formData, setFormData] = useState({
    cliente: { nome: '', endereco: '', contato: '' },
    items: [],
    desconto_aplicado: 0,
    observacoes: ''
  });
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedItemForAdd, setSelectedItemForAdd] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [itemSearch, setItemSearch] = useState('');

  useEffect(() => {
    fetchItems();
    if (isEdit) {
      fetchOrcamento();
    }
  }, [id]);

  const fetchItems = async () => {
    try {
      const response = await api.get('/items');
      setAllItems(response.data);
    } catch (error) {
      toast.error('Erro ao carregar itens');
    }
  };

  const fetchOrcamento = async () => {
    try {
      const response = await api.get(`/orcamentos/${id}`);
      setFormData({
        cliente: response.data.cliente,
        items: response.data.items,
        desconto_aplicado: response.data.desconto_aplicado,
        observacoes: response.data.observacoes || ''
      });
    } catch (error) {
      toast.error('Erro ao carregar orçamento');
      navigate('/orcamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedItemForAdd || quantity < 1) return;
    
    const existingIndex = formData.items.findIndex(i => i.item_id === selectedItemForAdd.id);
    
    if (existingIndex >= 0) {
      const newItems = [...formData.items];
      newItems[existingIndex].quantidade += quantity;
      newItems[existingIndex].total_item = newItems[existingIndex].quantidade * newItems[existingIndex].preco_unitario;
      setFormData({ ...formData, items: newItems });
    } else {
      const newItem = {
        item_id: selectedItemForAdd.id,
        nome: selectedItemForAdd.nome,
        quantidade: quantity,
        preco_unitario: selectedItemForAdd.preco_venda,
        total_item: quantity * selectedItemForAdd.preco_venda
      };
      setFormData({ ...formData, items: [...formData.items, newItem] });
    }
    
    setSelectedItemForAdd(null);
    setQuantity(1);
    setItemSearch('');
    setItemDialogOpen(false);
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleQuantityChange = (index, newQuantity) => {
    const newItems = [...formData.items];
    newItems[index].quantidade = parseInt(newQuantity) || 0;
    newItems[index].total_item = newItems[index].quantidade * newItems[index].preco_unitario;
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total_item, 0);
    const total = subtotal - formData.desconto_aplicado;
    
    // Calculate margin
    let totalCusto = 0;
    let totalVenda = subtotal;
    
    formData.items.forEach(item => {
      const itemData = allItems.find(i => i.id === item.item_id);
      if (itemData) {
        totalCusto += itemData.preco_real * item.quantidade;
      }
    });
    
    const margem = totalVenda > 0 ? ((totalVenda - totalCusto) / totalVenda * 100) : 0;
    const margemComDesconto = total > 0 ? ((total - totalCusto) / total * 100) : 0;
    
    return { subtotal, total, margem, margemComDesconto };
  };

  const { subtotal, total, margem, margemComDesconto } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      toast.error('Adicione pelo menos um item ao orçamento');
      return;
    }
    
    setSaving(true);
    
    try {
      if (isEdit) {
        await api.put(`/orcamentos/${id}`, formData);
        toast.success('Orçamento atualizado com sucesso!');
      } else {
        await api.post('/orcamentos', formData);
        toast.success('Orçamento criado com sucesso!');
      }
      navigate('/orcamentos');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar orçamento');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="orcamento-form">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/orcamentos')}
            data-testid="back-button"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isEdit ? 'Editar Orçamento' : 'Novo Orçamento'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Preencha os dados do orçamento
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Cliente Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Dados do Cliente</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cliente_nome">Nome *</Label>
                <Input
                  id="cliente_nome"
                  value={formData.cliente.nome}
                  onChange={(e) => setFormData({
                    ...formData,
                    cliente: { ...formData.cliente, nome: e.target.value }
                  })}
                  required
                  data-testid="cliente-nome-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_endereco">Endereço *</Label>
                <Textarea
                  id="cliente_endereco"
                  value={formData.cliente.endereco}
                  onChange={(e) => setFormData({
                    ...formData,
                    cliente: { ...formData.cliente, endereco: e.target.value }
                  })}
                  required
                  data-testid="cliente-endereco-input"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_contato">Contato *</Label>
                <Input
                  id="cliente_contato"
                  value={formData.cliente.contato}
                  onChange={(e) => setFormData({
                    ...formData,
                    cliente: { ...formData.cliente, contato: e.target.value }
                  })}
                  required
                  data-testid="cliente-contato-input"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  data-testid="observacoes-input"
                  rows={4}
                  placeholder="Informações adicionais..."
                />
              </div>
            </div>
          </div>

          {/* Totals Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Resumo</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desconto">Desconto (R$)</Label>
                <Input
                  id="desconto"
                  type="number"
                  step="0.01"
                  value={formData.desconto_aplicado}
                  onChange={(e) => setFormData({ ...formData, desconto_aplicado: parseFloat(e.target.value) || 0 })}
                  data-testid="desconto-input"
                />
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">Total</span>
                  <span className="text-2xl font-bold text-cyan-500 font-mono">
                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Margem sem desconto</span>
                  <span className={`font-mono font-semibold ${
                    margem >= 30 ? 'text-emerald-500' :
                    margem >= 20 ? 'text-cyan-500' :
                    'text-red-500'
                  }`}>
                    {margem.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Margem com desconto</span>
                  <span className={`font-mono font-semibold ${
                    margemComDesconto >= 30 ? 'text-emerald-500' :
                    margemComDesconto >= 20 ? 'text-cyan-500' :
                    'text-red-500'
                  }`}>
                    {margemComDesconto.toFixed(1)}%
                  </span>
                </div>
              </div>

              {margemComDesconto < 20 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start space-x-2">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-red-600 dark:text-red-400">
                    <strong>Atenção:</strong> Margem abaixo de 20%
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Itens do Orçamento</h3>
              
              <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    type="button"
                    data-testid="add-item-button"
                    className="bg-cyan-500 hover:bg-cyan-600"
                  >
                    <Plus size={16} className="mr-2" />
                    Adicionar Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Adicionar Item</DialogTitle>
                    <DialogDescription>
                      Selecione um item e defina a quantidade
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    <Input
                      placeholder="Buscar item..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="w-full"
                    />
                    
                    <div className="flex-1 overflow-y-auto space-y-2">
                      {allItems
                        .filter(item => item.nome.toLowerCase().includes(itemSearch.toLowerCase()))
                        .map((item) => (
                          <div
                            key={item.id}
                            onClick={() => setSelectedItemForAdd(item)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedItemForAdd?.id === item.id
                                ? 'border-cyan-500 bg-cyan-500/10'
                                : 'border-slate-200 dark:border-slate-800 hover:border-cyan-500/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {item.nome}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {item.categoria === 'material' ? 'Material' : 'Serviço'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono font-semibold text-slate-900 dark:text-white">
                                  R$ {item.preco_venda.toFixed(2)}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  Margem: {item.margem.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                    
                    {selectedItemForAdd && (
                      <div className="border-t pt-4">
                        <div className="space-y-3">
                          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {selectedItemForAdd.nome}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              R$ {selectedItemForAdd.preco_venda.toFixed(2)} / unidade
                            </div>
                          </div>
                          <div className="flex items-end space-x-2">
                            <div className="flex-1">
                              <Label htmlFor="qty">Quantidade</Label>
                              <Input
                                id="qty"
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <Button 
                              type="button" 
                              onClick={handleAddItem}
                              className="bg-cyan-500 hover:bg-cyan-600"
                            >
                              <Plus size={16} className="mr-2" />
                              Adicionar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Items List */}
            <div className="space-y-3" data-testid="items-list">
              {formData.items.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate">
                      {item.nome}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      R$ {item.preco_unitario.toFixed(2)} / un
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      className="w-20 h-9 text-center"
                      data-testid={`item-quantity-${index}`}
                    />
                    
                    <div className="w-32 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      R$ {item.total_item.toFixed(2)}
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      data-testid={`remove-item-${index}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}

              {formData.items.length === 0 && (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/orcamentos')}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={saving}
              data-testid="save-orcamento-button"
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              {saving ? (
                'Salvando...'
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {isEdit ? 'Atualizar' : 'Criar'} Orçamento
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}