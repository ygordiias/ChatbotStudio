import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { toast } from 'sonner';
import { ArrowLeft, FileDown, Edit, Calendar, MapPin, Phone } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

export default function OrcamentoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orcamento, setOrcamento] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrcamento();
  }, [id]);

  const fetchOrcamento = async () => {
    try {
      const response = await api.get(`/orcamentos/${id}`);
      setOrcamento(response.data);
    } catch (error) {
      toast.error('Erro ao carregar orçamento');
      navigate('/orcamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/orcamentos/${id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orcamento_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/orcamentos/${id}/status`, { status: newStatus });
      setOrcamento({ ...orcamento, status: newStatus });
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pendente': 'bg-yellow-500/10 text-yellow-500',
      'Aprovado': 'bg-emerald-500/10 text-emerald-500',
      'Reprovado': 'bg-red-500/10 text-red-500'
    };
    return colors[status];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="orcamento-detail">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/orcamentos')}
            data-testid="back-button"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                {orcamento.id_orcamento}
              </h1>
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(orcamento.status)}`}>
                {orcamento.status}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Detalhes do orçamento
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <Select value={orcamento.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[150px]" data-testid="status-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Aprovado">Aprovado</SelectItem>
              <SelectItem value="Reprovado">Reprovado</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline"
            onClick={() => navigate(`/orcamentos/${id}/edit`)}
            data-testid="edit-button"
          >
            <Edit size={16} className="mr-2" />
            Editar
          </Button>
          
          <Button 
            onClick={handleDownloadPDF}
            data-testid="download-pdf-button"
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            <FileDown size={16} className="mr-2" />
            Baixar PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Cliente Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Cliente</h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Nome</div>
                <div className="font-medium text-slate-900 dark:text-white">{orcamento.cliente.nome}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center">
                  <MapPin size={14} className="mr-1" />
                  Endereço
                </div>
                <div className="text-slate-900 dark:text-white">{orcamento.cliente.endereco}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center">
                  <Phone size={14} className="mr-1" />
                  Contato
                </div>
                <div className="font-mono text-slate-900 dark:text-white">{orcamento.cliente.contato}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center">
                  <Calendar size={14} className="mr-1" />
                  Data
                </div>
                <div className="text-slate-900 dark:text-white">{orcamento.data}</div>
              </div>
            </div>
          </div>

          {orcamento.observacoes && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Observações</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap">
                {orcamento.observacoes}
              </p>
            </div>
          )}

          {/* Totals Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Resumo Financeiro</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="font-mono text-slate-900 dark:text-white">
                  R$ {orcamento.total_sem_desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {orcamento.desconto_aplicado > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Desconto</span>
                  <span className="font-mono text-red-500">
                    - R$ {orcamento.desconto_aplicado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">Total</span>
                  <span className="text-2xl font-bold text-cyan-500 font-mono">
                    R$ {orcamento.total_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Items */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Itens ({orcamento.items.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Item</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Qtd</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Preço Unit.</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orcamento.items.map((item, index) => (
                    <tr 
                      key={index}
                      className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-4 px-4 text-slate-900 dark:text-white">{item.nome}</td>
                      <td className="py-4 px-4 text-center font-mono text-slate-900 dark:text-white">{item.quantidade}</td>
                      <td className="py-4 px-4 text-right font-mono text-slate-900 dark:text-white">
                        R$ {item.preco_unitario.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                        R$ {item.total_item.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
