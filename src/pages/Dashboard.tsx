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

export default function Dashboard() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // ✅ NOVO: Estado para performance do bot
  const [performance, setPerformance] = useState({
    monthlyReturn: 0,
    totalProfit: 0,
    totalTrades: 0,
    winRate: 0,
    isPositive: true
  });

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

  // ✅ NOVO: Função para carregar performance do banco de dados
  const loadPerformance = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/data?action=performance&user_id=${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // ✅ CORREÇÃO: Converter strings do MySQL para números
        setPerformance({
          monthlyReturn: parseFloat(data.monthly_return) || 0,
          totalProfit: parseFloat(data.total_profit) || 0,
          totalTrades: parseInt(data.total_trades) || 0,
          winRate: parseFloat(data.win_rate) || 0,
          isPositive: (parseFloat(data.monthly_return) || 0) >= 0
        });
        
        console.log('✅ Performance carregada do banco:', data);
      } else {
        console.log('⚠️ Erro ao carregar performance do banco');
        // Usar valores padrão
        setPerformance({
          monthlyReturn: 0,
          totalProfit: 0,
          totalTrades: 0,
          winRate: 0,
          isPositive: true
        });
      }
    } catch (error) {
      console.log('❌ Erro ao carregar performance:', error);
      setPerformance({
        monthlyReturn: 0,
        totalProfit: 0,
        totalTrades: 0,
        winRate: 0,
        isPositive: true
      });
    }
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mvb Pro</h1>
                <p className="text-sm text-gray-600">Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-600">{user?.email}</p>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status da Licença</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    {activeLicense ? getStatusIcon(activeLicense.days_remaining) : <AlertCircle className="h-4 w-4 text-red-600" />}
                    <span className="text-2xl font-bold">
                      {activeLicense ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeLicense ? `${activeLicense.days_remaining} dias restantes` : 'Nenhuma licença ativa'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Dispositivo</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    1/1
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dispositivo conectado
                  </p>
                </CardContent>
              </Card>

              {/* ✅ CORREÇÃO: Card de status do bot removido (causava problemas intermitentes) */}

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Performance</CardTitle>
                  <TrendingUp className={`h-4 w-4 ${performance.isPositive ? 'text-green-600' : 'text-red-600'}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${performance.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {performance.isPositive ? '+' : ''}{performance.monthlyReturn}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Retorno mensal projetado
                  </p>
                  {performance.totalTrades > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <div>Lucro atual: ${performance.totalProfit.toFixed(2)}</div>
                      <div>Taxa de vitória: {performance.winRate}%</div>
                      <div>Total de trades: {performance.totalTrades}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* License Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Detalhes da Licença</span>
                  </CardTitle>
                  <CardDescription>
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
                            activeLicense.days_remaining > 7 ? 'text-green-600' : 
                            activeLicense.days_remaining > 0 ? 'text-yellow-600' : 
                            'text-red-600'
                          }`}>
                            {activeLicense.days_remaining} {activeLicense.days_remaining === 1 ? 'dia' : 'dias'}
                          </span>
                        </div>
                        <Progress 
                          value={Math.min((activeLicense.days_remaining / 30) * 100, 100)} 
                          className="h-2"
                        />
                        <p className="text-xs text-gray-500 text-center">
                          {activeLicense.days_remaining > 7 ? 
                            'Licença ativa' : 
                            activeLicense.days_remaining > 0 ? 
                            '⚠️ Licença expirando em breve!' : 
                            '❌ Licença expirada'}
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bot className="h-5 w-5" />
                    <span>Atividade Recente</span>
                  </CardTitle>
                  <CardDescription>
                    Últimas atividades do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Sistema iniciado</p>
                        <p className="text-xs text-gray-600">Há 2 horas</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Licença validada</p>
                        <p className="text-xs text-gray-600">Há 3 horas</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Configuração atualizada</p>
                        <p className="text-xs text-gray-600">Ontem</p>
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