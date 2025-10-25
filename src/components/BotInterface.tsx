import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Key,
  Activity,
  Play,
  BarChart3,
  Settings,
  Bot,
  Bell,
  Target,
  TrendingUp,
  DollarSign,
  Zap,
  Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function BotInterfaceSimple() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  // Estados básicos
  const [isLicenseValid, setIsLicenseValid] = useState(true);
  const [activeTab, setActiveTab] = useState('trading');
  const [botRunning, setBotRunning] = useState(false);
  const [settings, setSettings] = useState({
    stake: 1,
    symbol: 'R_10',
    accountType: 'demo',
    duration: 15,
    stopWin: 3,
    stopLoss: -5,
    derivTokenDemo: '',
    derivTokenReal: '',
    selectedTokenType: 'demo'
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [tradingHistory, setTradingHistory] = useState<any[]>([]);

  // Refs
  const botContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  // Função para inicializar gráfico
  const initializeChart = () => {
    if (!chartRef.current) return;
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Destruir gráfico existente
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Dados iniciais simulados
    const initialData = [];
    const now = Date.now();
    let basePrice = 1.0000;
    
    for (let i = 60; i >= 0; i--) {
      const timestamp = now - (i * 60000); // 1 minuto
      const trend = Math.sin(i * 0.1) * 0.02;
      const noise = (Math.random() - 0.5) * 0.01;
      basePrice += trend + noise;
      
      const open = basePrice;
      const close = basePrice + (Math.random() - 0.5) * 0.005;
      const high = Math.max(open, close) + Math.random() * 0.003;
      const low = Math.min(open, close) - Math.random() * 0.003;
      
      initialData.push({
        x: timestamp,
        o: open,
        h: high,
        l: low,
        c: close
      });
    }

    setChartData(initialData);

    // Criar gráfico com Chart.js
    if (typeof (window as any).Chart !== 'undefined') {
      chartInstance.current = new (window as any).Chart(ctx, {
        type: 'candlestick',
        data: {
          datasets: [{
            label: 'Preço',
            data: initialData,
            borderColor: '#10b981',
            backgroundColor: (ctx: any) => {
              const point = ctx.parsed;
              return point.c >= point.o ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
            }
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'minute'
              }
            },
            y: {
              beginAtZero: false
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }
  };

  // Função para atualizar gráfico
  const updateChart = (newPrice: number) => {
    if (!chartInstance.current) return;
    
    const now = Date.now();
    const lastCandle = chartData[chartData.length - 1];
    
    if (lastCandle && (now - lastCandle.x) < 60000) {
      // Atualizar vela atual
      lastCandle.h = Math.max(lastCandle.h, newPrice);
      lastCandle.l = Math.min(lastCandle.l, newPrice);
      lastCandle.c = newPrice;
    } else {
      // Nova vela
      const newCandle = {
        x: now,
        o: newPrice,
        h: newPrice,
        l: newPrice,
        c: newPrice
      };
      
      const updatedData = [...chartData, newCandle].slice(-100); // Manter últimas 100 velas
      setChartData(updatedData);
      
      chartInstance.current.data.datasets[0].data = updatedData;
    }
    
    chartInstance.current.update('none');
    setCurrentPrice(newPrice);
  };

  // Função para inicializar bot
  const initializeBot = () => {
    if (!botContainerRef.current) return;
    
    botContainerRef.current.innerHTML = `
      <div style="background: #1e293b; border-radius: 8px; padding: 16px; border: 1px solid #334155;">
        <h3 style="color: #f1f5f9; margin-bottom: 16px;">🤖 Controle do Bot</h3>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #f1f5f9; margin-bottom: 8px;">Símbolo:</label>
          <select id="symbol" style="width: 100%; padding: 8px; border: 1px solid #334155; border-radius: 4px; background: #0f172a; color: #e2e8f0;">
            <option value="R_10">Volatility 10 Index</option>
            <option value="R_25">Volatility 25 Index</option>
            <option value="R_50">Volatility 50 Index</option>
            <option value="CRASH300N">Crash 300 Index</option>
            <option value="BOOM300N">Boom 300 Index</option>
          </select>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #f1f5f9; margin-bottom: 8px;">Stake:</label>
          <input type="number" id="stake" value="1" min="0.5" step="0.5" style="width: 100%; padding: 8px; border: 1px solid #334155; border-radius: 4px; background: #0f172a; color: #e2e8f0;">
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; color: #f1f5f9; margin-bottom: 8px;">Duração (min):</label>
          <input type="number" id="duration" value="15" min="5" max="60" style="width: 100%; padding: 8px; border: 1px solid #334155; border-radius: 4px; background: #0f172a; color: #e2e8f0;">
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          <button id="startBtn" onclick="startBot()" style="flex: 1; padding: 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">
            🚀 Iniciar Bot
          </button>
          <button id="stopBtn" onclick="stopBot()" style="flex: 1; padding: 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
            ⏹️ Parar Bot
          </button>
        </div>

        <div id="status" style="padding: 8px; background: #0f172a; border-radius: 4px; color: #94a3b8; text-align: center;">
          ⏸️ Bot Parado
        </div>

        <div id="logs" style="margin-top: 16px; max-height: 200px; overflow-y: auto; background: #0f172a; border-radius: 4px; padding: 8px;">
          <div style="color: #94a3b8; font-size: 12px;">📊 Logs do Bot aparecerão aqui...</div>
        </div>
      </div>
    `;
  };

  // Função para carregar tokens do localStorage
  const loadTokensFromStorage = () => {
    try {
      const savedSettings = localStorage.getItem('bot_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({
          ...prev,
          derivTokenDemo: parsedSettings.derivTokenDemo || '',
          derivTokenReal: parsedSettings.derivTokenReal || '',
          selectedTokenType: parsedSettings.selectedTokenType || 'demo'
        }));
        console.log('🔑 Tokens carregados do localStorage');
      }
    } catch (error) {
      console.error('Erro ao carregar tokens:', error);
    }
  };

  // Função para conectar com Deriv
  const connectToDeriv = async () => {
    try {
      // Tentar carregar tokens diretamente do localStorage
      let token = '';
      let selectedType = 'demo';
      
      try {
        const savedSettings = localStorage.getItem('bot_settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          selectedType = parsedSettings.selectedTokenType || 'demo';
          token = selectedType === 'demo' ? parsedSettings.derivTokenDemo : parsedSettings.derivTokenReal;
        }
      } catch (error) {
        console.error('Erro ao ler localStorage:', error);
      }
      
      console.log('🔍 Verificando token:', {
        selectedType,
        tokenLength: token ? token.length : 0,
        hasToken: !!token
      });
      
      if (!token) {
        addLog('❌ Token não configurado - Configure na aba Configurações');
        addLog('💡 Dica: Vá em Configurações → Cole seu token → Salvar');
        return null;
      }

      const wsUrl = 'wss://ws.binaryws.com/websockets/v3?app_id=1089';
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        addLog('🔗 Conectado com Deriv');
        ws.send(JSON.stringify({ authorize: token }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.msg_type === 'authorize') {
          addLog('✅ Autorizado com Deriv');
          // Subscribir a ticks
          ws.send(JSON.stringify({
            ticks: settings.symbol,
            subscribe: 1
          }));
        }
        
        if (data.msg_type === 'tick') {
          const tick = data.tick;
          updateChart(tick.quote);
          addLog(`📊 Preço: ${tick.quote}`);
        }
      };

      ws.onerror = (error) => {
        addLog('❌ Erro na conexão');
        console.error('WebSocket error:', error);
      };

      return ws;
    } catch (error) {
      addLog('❌ Erro ao conectar');
      console.error('Connection error:', error);
      return null;
    }
  };

  // Funções do bot
  const startBot = async () => {
    console.log('🚀 Iniciando bot...');
    setBotRunning(true);
    
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.innerHTML = '🟢 Bot Operando';
      statusElement.style.color = '#10b981';
    }

    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;

    addLog('📊 Iniciando análise...');
    
    // Conectar com Deriv
    const ws = await connectToDeriv();
    if (ws) {
      (window as any).derivWS = ws;
      addLog('🔗 Conectado com Deriv API');
    } else {
      addLog('⚠️ Usando modo simulado');
      // Simular operações se não conseguir conectar
      setTimeout(() => {
        addLog('🎯 Sinal detectado: CALL');
      }, 3000);

      setTimeout(() => {
        addLog('✅ Trade executado: WIN +$3.00');
        const newTrade = {
          id: Date.now(),
          symbol: settings.symbol,
          signal: 'CALL',
          result: 'WIN',
          profit: 3.00,
          timestamp: new Date()
        };
        setTradingHistory(prev => [newTrade, ...prev]);
      }, 5000);
    }
  };

  const stopBot = () => {
    console.log('⏹️ Parando bot...');
    setBotRunning(false);
    
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.innerHTML = '⏸️ Bot Parado';
      statusElement.style.color = '#94a3b8';
    }

    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
  };

  const addLog = (message: string) => {
    const logsElement = document.getElementById('logs');
    if (logsElement) {
      const logEntry = document.createElement('div');
      logEntry.style.color = '#e2e8f0';
      logEntry.style.fontSize = '12px';
      logEntry.style.marginBottom = '4px';
      logEntry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
      
      logsElement.insertBefore(logEntry, logsElement.firstChild);
      logsElement.scrollTop = 0;
    }
  };

  // Carregar configurações do localStorage ao montar o componente
  useEffect(() => {
    loadTokensFromStorage();
  }, []);

  // Exportar funções para window
  useEffect(() => {
    (window as any).startBot = startBot;
    (window as any).stopBot = stopBot;
  }, []);

  // Inicializar bot e gráfico
  useEffect(() => {
    if (activeTab === 'trading' && isLicenseValid) {
      setTimeout(() => {
        initializeBot();
        initializeChart();
      }, 100);
    }
  }, [activeTab, isLicenseValid]);

  // Atualizar gráfico quando dados mudarem
  useEffect(() => {
    if (chartInstance.current && chartData.length > 0) {
      chartInstance.current.data.datasets[0].data = chartData;
      chartInstance.current.update('none');
    }
  }, [chartData]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">🔐 Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Você precisa estar logado para acessar o bot.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trading">🤖 Trading</TabsTrigger>
          <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Configurações</TabsTrigger>
          <TabsTrigger value="telegram">📱 Telegram</TabsTrigger>
        </TabsList>

        <TabsContent value="trading" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Painel de Controle */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Controle do Bot</span>
                </CardTitle>
                <CardDescription>
                  Configure e controle o bot de trading
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div ref={botContainerRef} className="min-h-[400px]">
                  <div className="flex items-center justify-center h-48 text-slate-400">
                    <div className="text-center">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Carregando bot...</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Gráfico de Preços</span>
                </CardTitle>
                <CardDescription>
                  Análise em tempo real
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-slate-800 rounded-lg p-4">
                  <canvas ref={chartRef} className="w-full h-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cards de Estatísticas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Total de Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">{tradingHistory.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Taxa de Acerto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">
                  {tradingHistory.length > 0 
                    ? Math.round((tradingHistory.filter(t => t.result === 'WIN').length / tradingHistory.length) * 100)
                    : 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Lucro Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">
                  ${tradingHistory.reduce((sum, trade) => sum + (trade.profit || 0), 0).toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Preço Atual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-400">
                  ${currentPrice.toFixed(4)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Histórico de Trades */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Histórico de Trades</CardTitle>
              <CardDescription>Últimas operações realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              {tradingHistory.length > 0 ? (
                <div className="space-y-2">
                  {tradingHistory.slice(0, 10).map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${trade.result === 'WIN' ? 'bg-green-400' : 'bg-red-400'}`} />
                        <div>
                          <div className="font-medium text-white">{trade.symbol}</div>
                          <div className="text-sm text-slate-400">{trade.signal}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${trade.result === 'WIN' ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.result === 'WIN' ? '+' : '-'}${Math.abs(trade.profit).toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(trade.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum trade realizado ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configurações de Trading */}
            <Card>
              <CardHeader>
                <CardTitle>⚙️ Configurações de Trading</CardTitle>
                <CardDescription>Parâmetros do bot</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="stake">Stake (USD)</Label>
                  <Input
                    id="stake"
                    type="number"
                    value={settings.stake}
                    onChange={(e) => setSettings(prev => ({ ...prev, stake: parseFloat(e.target.value) }))}
                    min="0.5"
                    step="0.5"
                  />
                </div>

                <div>
                  <Label htmlFor="symbol">Símbolo</Label>
                  <Select value={settings.symbol} onValueChange={(value) => setSettings(prev => ({ ...prev, symbol: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="R_10">Volatility 10 Index</SelectItem>
                      <SelectItem value="R_25">Volatility 25 Index</SelectItem>
                      <SelectItem value="R_50">Volatility 50 Index</SelectItem>
                      <SelectItem value="CRASH300N">Crash 300 Index</SelectItem>
                      <SelectItem value="BOOM300N">Boom 300 Index</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Duração (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={settings.duration}
                    onChange={(e) => setSettings(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    min="5"
                    max="60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stopWin">Stop Win (USD)</Label>
                    <Input
                      id="stopWin"
                      type="number"
                      value={settings.stopWin}
                      onChange={(e) => setSettings(prev => ({ ...prev, stopWin: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stopLoss">Stop Loss (USD)</Label>
                    <Input
                      id="stopLoss"
                      type="number"
                      value={settings.stopLoss}
                      onChange={(e) => setSettings(prev => ({ ...prev, stopLoss: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configurações de Conta */}
            <Card>
              <CardHeader>
                <CardTitle>🔑 Configurações de Conta</CardTitle>
                <CardDescription>Tokens da Deriv</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="accountType">Tipo de Conta</Label>
                  <Select value={settings.selectedTokenType} onValueChange={(value) => setSettings(prev => ({ ...prev, selectedTokenType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demo">🎮 Conta DEMO</SelectItem>
                      <SelectItem value="real">💰 Conta REAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="demoToken">Token DEMO</Label>
                  <Input
                    id="demoToken"
                    type="password"
                    value={settings.derivTokenDemo}
                    onChange={(e) => setSettings(prev => ({ ...prev, derivTokenDemo: e.target.value }))}
                    placeholder="Cole seu token DEMO aqui"
                  />
                </div>

                <div>
                  <Label htmlFor="realToken">Token REAL</Label>
                  <Input
                    id="realToken"
                    type="password"
                    value={settings.derivTokenReal}
                    onChange={(e) => setSettings(prev => ({ ...prev, derivTokenReal: e.target.value }))}
                    placeholder="Cole seu token REAL aqui"
                  />
                </div>

                <Button 
                  onClick={() => {
                    // Salvar configurações no localStorage
                    const settingsToSave = {
                      ...settings,
                      derivTokenDemo: settings.derivTokenDemo,
                      derivTokenReal: settings.derivTokenReal,
                      selectedTokenType: settings.selectedTokenType
                    };
                    
                    localStorage.setItem('bot_settings', JSON.stringify(settingsToSave));
                    
                    toast({
                      title: "✅ Configurações salvas",
                      description: "Suas configurações foram salvas com sucesso!",
                    });
                    
                    console.log('💾 Configurações salvas:', settingsToSave);
                  }}
                  className="w-full"
                >
                  💾 Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="telegram" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📱 Configurações do Telegram</CardTitle>
              <CardDescription>Configure notificações via Telegram</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="botToken">Token do Bot</Label>
                <Input
                  id="botToken"
                  type="password"
                  placeholder="Cole o token do seu bot aqui"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Obtenha o token em @BotFather no Telegram
                </p>
              </div>

              <div>
                <Label htmlFor="chatId">Chat ID</Label>
                <Input
                  id="chatId"
                  placeholder="Seu Chat ID do Telegram"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Use /start no bot para obter seu Chat ID
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input type="checkbox" id="notifications" className="rounded" />
                <Label htmlFor="notifications">Ativar notificações</Label>
              </div>

              <Button className="w-full">
                🔗 Conectar Telegram
              </Button>

              <div className="bg-slate-800 p-4 rounded-lg">
                <h4 className="font-medium text-white mb-2">📋 Como configurar:</h4>
                <ol className="text-sm text-slate-300 space-y-1">
                  <li>1. Crie um bot em @BotFather</li>
                  <li>2. Cole o token acima</li>
                  <li>3. Use /start no seu bot</li>
                  <li>4. Cole o Chat ID recebido</li>
                  <li>5. Clique em "Conectar Telegram"</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
