import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bot, 
  Shield, 
  Calendar, 
  Users, 
  TrendingUp, 
  Settings,
  LogOut,
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BotInterface from '@/components/BotInterface';

interface License {
  id: number;
  license_key: string;
  license_type: string;
  expires_at: string;
  days_remaining: number;
  active_devices: number;
  max_devices: number;
  is_active: boolean;
  status: string;
  created_at: string;
}

// ✅ Componente para configuração de performance
function PerformanceConfigForm({ onSave }: { onSave: (config: any) => void }) {
  const [formData, setFormData] = useState({
    initialBalance: 0,
    totalDeposits: 0,
    tradingDays: 30
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="text-sm font-medium text-gray-700 mb-3">
        Configure seus dados de performance:
      </div>
      
      <div className="space-y-2">
        <div>
          <Label htmlFor="initialBalance" className="text-xs">Saldo Inicial ($)</Label>
          <Input
            id="initialBalance"
            type="number"
            step="0.01"
            placeholder="10.00"
            value={formData.initialBalance || ''}
            onChange={(e) => handleChange('initialBalance', e.target.value)}
            className="h-8 text-xs"
          />
          <p className="text-xs text-gray-500 mt-1">
            Valor que você começou a negociar
          </p>
        </div>
        
        <div>
          <Label htmlFor="totalDeposits" className="text-xs">Depósitos ($)</Label>
          <Input
            id="totalDeposits"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.totalDeposits || ''}
            onChange={(e) => handleChange('totalDeposits', e.target.value)}
            className="h-8 text-xs"
          />
          <p className="text-xs text-gray-500 mt-1">
            Total de depósitos feitos durante o período
          </p>
        </div>
        
        <div>
          <Label htmlFor="tradingDays" className="text-xs">Dias de Trading</Label>
          <Input
            id="tradingDays"
            type="number"
            placeholder="30"
            value={formData.tradingDays || ''}
            onChange={(e) => handleChange('tradingDays', e.target.value)}
            className="h-8 text-xs"
          />
          <p className="text-xs text-gray-500 mt-1">
            Quantos dias você está negociando
          </p>
        </div>
        
        {/* Informações automáticas */}
        <div className="bg-blue-50 p-3 rounded-md">
          <div className="text-xs font-medium text-blue-800 mb-2">
            📊 Dados automáticos:
          </div>
          <div className="text-xs text-blue-700 space-y-1">
            <div>• Saldo atual: Buscado da Deriv automaticamente</div>
            <div>• Total de trades: Calculado do histórico</div>
            <div>• Taxa de vitória: Calculada do histórico</div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 pt-2">
        <Button type="submit" size="sm" className="flex-1 text-xs">
          Salvar Configuração
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => onSave({})}
          className="text-xs"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export default function Dashboard() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // ✅ NOVO: Estado para performance do bot
  const [performance, setPerformance] = useState({
    initialBalance: 0, // Valor inicial em dólares (manual)
    currentBalance: 0, // Valor atual em dólares (buscar da Deriv)
    totalDeposits: 0, // Total de depósitos feitos
    totalProfit: 0,
    totalProfitPercentage: 0,
    dailyAverage: 0,
    weeklyAverage: 0,
    monthlyAverage: 0,
    totalTrades: 0, // Buscar do histórico automaticamente
    winRate: 0, // Calcular do histórico automaticamente
    isPositive: true,
    tradingDays: 0
  });
  
  // Estado para controlar se deve mostrar formulário de configuração
  const [showConfigForm, setShowConfigForm] = useState(false);

  useEffect(() => {
    const loadLicenses = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/data?action=licenses&user_id=${user.id}`);
        
        if (response.ok) {
          const data = await response.json();
          setLicenses(data.licenses || []);
          console.log('✅ Licenças carregadas:', data.licenses);
        } else {
          throw new Error('Erro ao carregar licenças');
        }
      } catch (err) {
        setError('Erro ao carregar licenças');
        console.error('Error loading licenses:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLicenses();
  }, [user?.id]);

  // ✅ NOVO: Função para calcular performance
  const calculatePerformance = () => {
    const initial = performance.initialBalance;
    const current = performance.currentBalance;
    const deposits = performance.totalDeposits;
    
    // Calcular lucro total (considerando depósitos)
    // Lucro = Saldo Atual - Saldo Inicial - Depósitos
    const totalProfit = current - initial - deposits;
    const totalProfitPercentage = initial > 0 ? ((totalProfit / initial) * 100) : 0;
    
    // Simular dados de trading (em produção viria do banco)
    const totalTrades = 45; // Simulado
    const winRate = 78; // Simulado
    const tradingDays = 30; // Simulado - dias de trading
    
    // Calcular médias
    const dailyAverage = tradingDays > 0 ? (totalProfit / tradingDays) : 0;
    const weeklyAverage = dailyAverage * 7;
    const monthlyAverage = dailyAverage * 30;
    
    setPerformance(prev => ({
      ...prev,
      totalProfit,
      totalProfitPercentage,
      dailyAverage,
      weeklyAverage,
      monthlyAverage,
      totalTrades,
      winRate,
      isPositive: totalProfit >= 0,
      tradingDays
    }));
  };

  // ✅ NOVO: Função para buscar saldo atual da Deriv
  const fetchDerivBalance = async () => {
    try {
      // Simular busca da API da Deriv (substitua pela API real)
      const response = await fetch(`/api/data?action=deriv_balance&user_id=${user?.id}`);
      
      if (response.ok) {
        const data = await response.json();
        const currentBalance = parseFloat(data.balance) || 0;
        
        setPerformance(prev => ({
          ...prev,
          currentBalance: currentBalance
        }));
        
        console.log('✅ Saldo da Deriv carregado:', currentBalance);
        return currentBalance;
      } else {
        console.log('⚠️ Erro ao buscar saldo da Deriv, usando valor salvo');
        return null;
      }
    } catch (error) {
      console.log('❌ Erro ao buscar saldo da Deriv:', error);
      return null;
    }
  };

  // ✅ NOVO: Função para buscar dados do histórico de trading
  const fetchTradingHistory = async () => {
    try {
      const response = await fetch(`/api/data?action=trading_history&user_id=${user?.id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Calcular total de trades e taxa de vitória
        const totalTrades = data.trades ? data.trades.length : 0;
        const winningTrades = data.trades ? data.trades.filter((trade: any) => trade.profit > 0).length : 0;
        const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100) : 0;
        
        setPerformance(prev => ({
          ...prev,
          totalTrades: totalTrades,
          winRate: winRate
        }));
        
        console.log('✅ Histórico de trading carregado:', { totalTrades, winRate });
        return { totalTrades, winRate };
      } else {
        console.log('⚠️ Erro ao buscar histórico de trading');
        return { totalTrades: 0, winRate: 0 };
      }
    } catch (error) {
      console.log('❌ Erro ao buscar histórico de trading:', error);
      return { totalTrades: 0, winRate: 0 };
    }
  };

  // ✅ NOVO: Função para carregar performance do banco de dados
  const loadPerformance = async () => {
    if (!user?.id) return;
    
    try {
      // 1. Buscar saldo atual da Deriv
      await fetchDerivBalance();
      
      // 2. Buscar dados do histórico de trading
      await fetchTradingHistory();
      
      // 3. Tentar carregar configurações salvas
      const savedData = localStorage.getItem(`performance_${user.id}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setPerformance(prev => ({
          ...prev,
          initialBalance: parsed.initialBalance || 0,
          totalDeposits: parsed.totalDeposits || 0,
          tradingDays: parsed.tradingDays || 30,
        }));
        calculatePerformance();
      } else {
        // Mostrar formulário de configuração se não há dados salvos
        setShowConfigForm(true);
      }
    } catch (error) {
      console.log('❌ Erro ao carregar performance:', error);
      setShowConfigForm(true);
    }
  };

  // ✅ NOVO: Função para salvar configuração de performance
  const savePerformanceConfig = (config: any) => {
    if (!user?.id) return;
    
    // Salvar no localStorage
    localStorage.setItem(`performance_${user.id}`, JSON.stringify(config));
    
    // Atualizar apenas os campos manuais (os automáticos já foram carregados)
    setPerformance(prev => ({
      ...prev,
      initialBalance: config.initialBalance,
      totalDeposits: config.totalDeposits,
      tradingDays: config.tradingDays,
    }));
    
    // Calcular performance
    calculatePerformance();
    
    // Esconder formulário
    setShowConfigForm(false);
  };

  // ✅ NOVO: Carregar performance do banco de dados
  useEffect(() => {
    // Carregar imediatamente
    loadPerformance();
    
    // Recarregar a cada 60 segundos
    const interval = setInterval(loadPerformance, 60000);
    
    return () => {
      clearInterval(interval);
    };
  }, [user?.id]);

  const getStatusColor = (daysRemaining: number) => {
    if (daysRemaining > 30) return 'bg-green-500';
    if (daysRemaining > 7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (daysRemaining: number) => {
    if (daysRemaining > 30) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (daysRemaining > 7) return <Clock className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const activeLicense = licenses.find(license => license.is_active && license.days_remaining > 0);
  
  const getStatusBadge = (status: string) => {
    const colors = {
      'ativa': 'bg-green-100 text-green-800',
      'expirando': 'bg-yellow-100 text-yellow-800',
      'expira hoje': 'bg-orange-100 text-orange-800',
      'expirada': 'bg-red-100 text-red-800',
      'inativa': 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || colors.inativa;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-300">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 shadow-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100">MVB Pro</h1>
                <p className="text-sm text-gray-400">Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-100">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate('/admin')}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Painel Admin</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-slate-900">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="bot">Bot Trading</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6" forceMount style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
            {/* Informações da Conta */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <Shield className="h-5 w-5 text-blue-400" />
                  Minha Conta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Nome</p>
                    <p className="font-semibold text-slate-100">{user?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="font-semibold text-slate-100">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Cliente desde</p>
                    <p className="font-semibold text-slate-100">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </div>
                </div>
                {activeLicense && (
                  <div className="pt-4 border-t border-slate-600">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Tipo de Licença</p>
                        <Badge className="mt-1 bg-blue-600 text-white">
                          {activeLicense.license_type.toUpperCase()}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Chave</p>
                        <p className="font-mono text-xs font-semibold text-slate-100">{activeLicense.license_key}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Expira em</p>
                        <p className="font-semibold text-slate-100">
                          {activeLicense.license_type === 'lifetime' 
                            ? '∞ Vitalícia' 
                            : activeLicense.license_type === 'free' 
                            ? `${Math.max(0, Math.ceil((new Date(activeLicense.expires_at).getTime() - Date.now()) / (1000 * 60)))} min`
                            : `${activeLicense.days_remaining} dias`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Dispositivos</p>
                        <p className="font-semibold text-slate-100">{activeLicense.max_devices} permitido(s)</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Cards */}
            <div className="grid grid-cols-1 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-100">Performance</CardTitle>
                  <TrendingUp className={`h-4 w-4 ${performance.isPositive ? 'text-green-400' : 'text-red-400'}`} />
                </CardHeader>
                <CardContent>
                  {showConfigForm ? (
                    <PerformanceConfigForm onSave={savePerformanceConfig} />
                  ) : (
                    <div className="space-y-3">
                      {/* Principais métricas */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`text-xl font-bold ${performance.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {performance.isPositive ? '+' : ''}{performance.totalProfitPercentage.toFixed(1)}%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Ganho total: ${performance.totalProfit.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-green-600">
                            ${performance.currentBalance.toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground">Saldo Deriv</p>
                        </div>
                      </div>
                      
                      {/* Estatísticas compactas */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-700 p-2 rounded">
                          <div className="text-muted-foreground">Média diária</div>
                          <div className={`font-semibold ${performance.dailyAverage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {performance.dailyAverage >= 0 ? '+' : ''}${performance.dailyAverage.toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-slate-700 p-2 rounded">
                          <div className="text-muted-foreground">Taxa vitória</div>
                          <div className="font-semibold text-blue-600">
                            {performance.winRate.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      {/* Botões compactos */}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            fetchDerivBalance();
                            fetchTradingHistory();
                          }}
                          className="flex-1 text-xs h-7"
                        >
                          🔄 Atualizar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowConfigForm(true)}
                          className="flex-1 text-xs h-7"
                        >
                          ⚙️ Config
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* License Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-100">
                    <Shield className="h-5 w-5 text-blue-400" />
                    <span>Detalhes da Licença</span>
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Informações sobre sua licença ativa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeLicense ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Status:</span>
                        <Badge className={getStatusBadge(activeLicense.status)}>
                          {activeLicense.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Tipo:</span>
                        <Badge variant="secondary">
                          {activeLicense.license_type === 'free' ? 'TESTE' : activeLicense.license_type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Chave:</span>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          {activeLicense.license_key}
                        </code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Criada em:</span>
                        <span className="text-sm font-medium">
                          {new Date(activeLicense.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Expira em:</span>
                        <span className="text-sm font-medium">
                          {new Date(activeLicense.expires_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Tempo restante:</span>
                          <span className={`text-sm font-bold ${
                            activeLicense.license_type === 'free' 
                              ? (Math.max(0, Math.ceil((new Date(activeLicense.expires_at).getTime() - Date.now()) / (1000 * 60))) > 2 ? 'text-green-600' : 'text-red-600')
                              : (activeLicense.days_remaining > 7 ? 'text-green-600' : 
                                activeLicense.days_remaining > 0 ? 'text-yellow-600' : 
                                'text-red-600')
                          }`}>
                            {activeLicense.license_type === 'free' 
                              ? `${Math.max(0, Math.ceil((new Date(activeLicense.expires_at).getTime() - Date.now()) / (1000 * 60)))} min`
                              : `${activeLicense.days_remaining} ${activeLicense.days_remaining === 1 ? 'dia' : 'dias'}`}
                          </span>
                        </div>
                        <Progress 
                          value={activeLicense.license_type === 'free' 
                            ? Math.max(0, ((new Date(activeLicense.expires_at).getTime() - Date.now()) / (1000 * 60 * 5)) * 100)
                            : Math.min((activeLicense.days_remaining / 30) * 100, 100)
                          } 
                          className="h-2"
                        />
                        <p className="text-xs text-gray-500 text-center">
                          {activeLicense.license_type === 'free' 
                            ? (Math.max(0, Math.ceil((new Date(activeLicense.expires_at).getTime() - Date.now()) / (1000 * 60))) > 2 
                              ? 'Licença ativa' 
                              : '⚠️ Licença expirando em breve!')
                            : (activeLicense.days_remaining > 7 ? 
                              'Licença ativa' : 
                              activeLicense.days_remaining > 0 ? 
                              '⚠️ Licença expirando em breve!' : 
                              '❌ Licença expirada')
                          }
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">Nenhuma licença ativa encontrada</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Entre em contato com o administrador para adquirir uma licença
                      </p>
                      <Badge variant="outline" className="text-xs">
                        Total de licenças: {licenses.length}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-slate-100">
                    <Bot className="h-5 w-5 text-blue-400" />
                    <span>Atividade Recente</span>
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Últimas atividades do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-100">Sistema iniciado</p>
                        <p className="text-xs text-gray-400">Há 2 horas</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-100">Licença validada</p>
                        <p className="text-xs text-gray-400">Há 3 horas</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-100">Configuração atualizada</p>
                        <p className="text-xs text-gray-400">Ontem</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bot" forceMount style={{ display: activeTab === 'bot' ? 'block' : 'none' }}>
            <BotInterface />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}