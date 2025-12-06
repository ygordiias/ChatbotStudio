import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { toast } from 'sonner';
import { 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, chartsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/charts')
      ]);
      
      setStats(statsRes.data);
      setCharts(chartsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Orçamentos',
      value: stats?.total_orcamentos || 0,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Valor Vendido',
      value: `R$ ${(stats?.valor_total_vendido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Pendentes',
      value: stats?.pendentes || 0,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: 'Aprovados',
      value: stats?.aprovados || 0,
      icon: CheckCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      title: 'Reprovados',
      value: stats?.reprovados || 0,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    {
      title: 'Ticket Médio',
      value: `R$ ${(stats?.ticket_medio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10'
    },
  ];

  const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Visão geral do seu negócio
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              data-testid={`stat-card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
              className="stat-card bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                    {card.value}
                  </p>
                </div>
                <div className={`${card.bgColor} ${card.color} p-3 rounded-lg`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas por Mês */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Vendas por Mês
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={charts?.vendas_por_mes || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="mes" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Bar dataKey="valor" fill="#06b6d4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Margem Total */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Margem de Lucro Total
          </h3>
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center">
              <div className="text-6xl font-black text-cyan-500">
                {(charts?.margem_total || 0).toFixed(1)}%
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-4">
                Margem média em orçamentos aprovados
              </p>
            </div>
          </div>
        </div>

        {/* Items Mais Vendidos */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Itens Mais Vendidos
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">#</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Item</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Quantidade</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500 dark:text-slate-400">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {charts?.items_mais_vendidos?.slice(0, 10).map((item, index) => (
                  <tr 
                    key={index}
                    className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{index + 1}</td>
                    <td className="py-3 px-4 text-slate-900 dark:text-white">{item.nome}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white">{item.quantidade}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white">
                      R$ {item.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}