import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'sonner';
import { Plus, Search, Eye, Edit, FileDown, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';

export default function Orcamentos() {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrcamentos();
  }, []);

  const fetchOrcamentos = async () => {
    try {
      const response = await api.get('/orcamentos');
      setOrcamentos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (idOrcamento) => {
    try {
      const response = await api.get(`/orcamentos/${idOrcamento}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orcamento_${idOrcamento}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'Pendente': 'bg-yellow-500/10 text-yellow-500',
      'Aprovado': 'bg-emerald-500/10 text-emerald-500',
      'Reprovado': 'bg-red-500/10 text-red-500'
    };
    
    return (
      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${variants[status]}`}>
        {status}
      </span>
    );
  };

  const filteredOrcamentos = orcamentos.filter(orc => {
    const matchesSearch = orc.cliente.nome.toLowerCase().includes(search.toLowerCase()) ||
                         orc.id_orcamento.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || orc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="orcamentos-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Orçamentos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Gerencie seus orçamentos e propostas
          </p>
        </div>
        <Button 
          onClick={() => navigate('/orcamentos/new')}
          data-testid="create-orcamento-button"
          className="bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/20"
        >
          <Plus size={20} className="mr-2" />
          Novo Orçamento
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <Input
              placeholder="Buscar por cliente ou número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="search-orcamentos-input"
              className="pl-10 h-12"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 h-12" data-testid="status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Aprovado">Aprovado</SelectItem>
              <SelectItem value="Reprovado">Reprovado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orcamentos Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="orcamentos-table">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="text-left py-4 px-6 font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Número</th>
                <th className="text-left py-4 px-6 font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
                <th className="text-left py-4 px-6 font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data</th>
                <th className="text-right py-4 px-6 font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Valor</th>
                <th className="text-center py-4 px-6 font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right py-4 px-6 font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrcamentos.map((orc) => (
                <tr 
                  key={orc.id_orcamento}
                  data-testid={`orcamento-row-${orc.id_orcamento}`}
                  className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <span className="font-mono font-semibold text-cyan-500">{orc.id_orcamento}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">{orc.cliente.nome}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{orc.cliente.contato}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-900 dark:text-white">{orc.data}</td>
                  <td className="py-4 px-6 text-right">
                    <div className="font-mono font-semibold text-slate-900 dark:text-white">
                      R$ {orc.total_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    {orc.desconto_aplicado > 0 && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Desconto: R$ {orc.desconto_aplicado.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {getStatusBadge(orc.status)}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/orcamentos/${orc.id_orcamento}`)}
                        data-testid={`view-orcamento-${orc.id_orcamento}`}
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/orcamentos/${orc.id_orcamento}/edit`)}
                        data-testid={`edit-orcamento-${orc.id_orcamento}`}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadPDF(orc.id_orcamento)}
                        data-testid={`download-pdf-${orc.id_orcamento}`}
                        className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                      >
                        <FileDown size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrcamentos.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">Nenhum orçamento encontrado</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Crie um novo orçamento para começar.</p>
            <div className="mt-6">
              <Button 
                onClick={() => navigate('/orcamentos/new')}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                <Plus size={16} className="mr-2" />
                Criar Orçamento
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}