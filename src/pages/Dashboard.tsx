import { useState, useEffect } from 'react';
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
  Activity, 
  TrendingUp, 
  Settings,
  LogOut,
  CheckCircle,
  AlertCircle,
  Clock
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
  const { user, logout } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [botStatus, setBotStatus] = useState<'online' | 'offline'>('offline');
  const [activeTab, setActiveTab] = useState('overview');

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

  // Listener para status do bot
  useEffect(() => {
    const handleBotStart = () => {
      setBotStatus('online');
      localStorage.setItem('bot_status', 'online');
      console.log('🤖 Bot iniciado');
    };

    const handleBotStop = () => {
      setBotStatus('offline');
      localStorage.setItem('bot_status', 'offline');
      console.log('🛑 Bot parado');
    };

    // Adicionar listeners
    window.addEventListener('bot-started', handleBotStart);
    window.addEventListener('bot-stopped', handleBotStop);

    // Carregar status inicial do localStorage
    const savedStatus = localStorage.getItem('bot_status');
    if (savedStatus === 'online') {
      setBotStatus('online');
    }

    // Verificar status real do bot periodicamente
    const checkBotStatus = () => {
      const statusElement = document.getElementById('status');
      const startButton = document.getElementById('startBtn');
      
      if (statusElement && statusElement.textContent) {
        const statusText = statusElement.textContent.trim();
        
        // Se o status diz "Bot Parado", marcar como offline
        if (statusText.includes('⏸️') || statusText.includes('Bot Parado') || statusText === '') {
          if (botStatus === 'online') {
            setBotStatus('offline');
            localStorage.setItem('bot_status', 'offline');
          }
        }
        // Se tem texto diferente de "Bot Parado" e não está vazio
        else if (statusText.length > 0 && !statusText.includes('⏸️')) {
          if (botStatus === 'offline') {
            setBotStatus('online');
            localStorage.setItem('bot_status', 'online');
          }
        }
      }
      
      // Se o botão "Iniciar" está visível, bot está parado
      if (startButton && startButton.style.display !== 'none') {
        if (botStatus === 'online') {
          setBotStatus('offline');
          localStorage.setItem('bot_status', 'offline');
        }
      }
    };

    // Verificar periodicamente (a cada 1 segundo)
    const interval = setInterval(checkBotStatus, 1000);

    return () => {
      window.removeEventListener('bot-started', handleBotStart);
      window.removeEventListener('bot-stopped', handleBotStop);
      clearInterval(interval);
    };
  }, [botStatus]);

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
                <h1 className="text-xl font-bold text-gray-900">Bot MVB Pro</h1>
                <p className="text-sm text-gray-600">Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-600">{user?.email}</p>
              </div>
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

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bot Status</CardTitle>
                  <Activity className={`h-4 w-4 ${botStatus === 'online' ? 'text-green-600 animate-pulse' : 'text-gray-400'}`} />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${botStatus === 'online' ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`}></div>
                    <div className={`text-2xl font-bold ${botStatus === 'online' ? 'text-green-600' : 'text-gray-600'}`}>
                      {botStatus === 'online' ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {botStatus === 'online' ? 'Bot em execução' : 'Bot parado'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Performance</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">+12.5%</div>
                  <p className="text-xs text-muted-foreground">
                    Retorno mensal
                  </p>
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
                    <Activity className="h-5 w-5" />
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