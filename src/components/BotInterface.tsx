import { useState, useEffect, useRef } from 'react';
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
  Square,
  Settings,
  Bot,
  BarChart3,
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  Bell,
  RotateCcw,
  Rocket,
  PieChart,
  Clock,
  TrendingDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster as ReactToaster } from '@/components/ui/toaster';

// ===== TIPOS TYPESCRIPT =====
interface LicenseInfo {
  type: string;
  days: number;
  features: string[];
  maxDevices: number;
}

interface TelegramSettings {
  botToken: string;
  userTelegram: string;
  notificationsEnabled: boolean;
}

interface TradingSettings {
  // Configurações Básicas
  stake: number;
  selectedTokenType: 'demo' | 'real';
  selectedSymbol: string;
  derivTokenDemo: string;
  derivTokenReal: string;
  
  // Configurações de Scalping
  takeProfitPercent: number;
  stopLossPercent: number;
  confidence: number;
  maxTradesPerHour: number;
  cooldownBetweenTrades: number;
  
  // Gestão de Risco
  maxDailyLoss: number;
  maxConsecutiveLosses: number;
  useStopLoss: boolean;
  useTakeProfit: boolean;
}

interface ActiveTrade {
  id: string;
  signal: 'CALL' | 'PUT';
  entryPrice: number;
  currentPrice: number;
  stake: number;
  startTime: Date;
  takeProfitPrice: number;
  stopLossPrice: number;
  status: 'open' | 'closing' | 'closed';
  profitPercent: number;
}

interface TechnicalAnalysis {
  signal: 'CALL' | 'PUT' | 'HOLD';
  confidence: number;
  reason: string;
}

// ===== ATIVOS DISPONÍVEIS =====
const AVAILABLE_SYMBOLS = [
  { value: 'R_10', label: '🎲 Volatility 10', category: 'Volatility' },
  { value: 'R_25', label: '🎲 Volatility 25', category: 'Volatility' },
  { value: 'R_50', label: '🎲 Volatility 50', category: 'Volatility' },
  { value: 'R_75', label: '🎲 Volatility 75', category: 'Volatility' },
  { value: 'R_100', label: '🎲 Volatility 100', category: 'Volatility' },
  { value: 'CRASH300N', label: '📉 Crash 300', category: 'Crash' },
  { value: 'CRASH500N', label: '📉 Crash 500', category: 'Crash' },
  { value: 'CRASH1000N', label: '📉 Crash 1000', category: 'Crash' },
  { value: 'BOOM300N', label: '📈 Boom 300', category: 'Boom' },
  { value: 'BOOM500N', label: '📈 Boom 500', category: 'Boom' },
  { value: 'BOOM1000N', label: '📈 Boom 1000', category: 'Boom' }
];

export default function BotInterface() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  // ===== ESTADOS DE LICENÇA =====
  const [isLicenseValid, setIsLicenseValid] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [licenseStatus, setLicenseStatus] = useState('');
  const [userLicenses, setUserLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trading');
  
  // ===== ESTADOS PRINCIPAIS =====
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  
  // ===== REFS =====
  const priceChartRef = useRef<any>(null);
  const performanceChartRef = useRef<any>(null);
  const tradeMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const analysisRef = useRef<NodeJS.Timeout | null>(null);

  // ===== ESTATÍSTICAS =====
  const [stats, setStats] = useState({
    totalProfit: 0,
    totalTrades: 0,
    wins: 0,
    losses: 0,
    currentWinStreak: 0,
    bestWinStreak: 0
  });

  // ===== ESTADOS DAS CONFIGURAÇÕES =====
  const [settings, setSettings] = useState<TradingSettings>({
    // Configurações Básicas
    stake: 1,
    selectedTokenType: 'demo',
    selectedSymbol: 'R_10',
    derivTokenDemo: '',
    derivTokenReal: '',
    
    // Configurações de Scalping
    takeProfitPercent: 5, // 5% de lucro
    stopLossPercent: 2,   // 2% de perda
    confidence: 60,
    maxTradesPerHour: 10,
    cooldownBetweenTrades: 5, // segundos
    
    // Gestão de Risco
    maxDailyLoss: 50,
    maxConsecutiveLosses: 3,
    useStopLoss: true,
    useTakeProfit: true
  });

  // ===== ESTADOS DO TELEGRAM =====
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    botToken: '',
    userTelegram: '',
    notificationsEnabled: false
  });

  // ===== GESTÃO DE RISCO =====
  const [riskManagement, setRiskManagement] = useState({
    currentDailyLoss: 0,
    consecutiveLosses: 0,
    tradesToday: 0,
    lastTradeTime: null as Date | null,
    isInCooldown: false
  });

  // ===== FUNÇÕES UTILITÁRIAS =====
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
  };

  // ===== CONEXÃO COM DERIV API =====
  const connectToDerivAPI = () => {
    console.log('🔌 Conectando à Deriv API...');
    
    const token = settings.selectedTokenType === 'demo' ? settings.derivTokenDemo : settings.derivTokenReal;
    if (!token) {
      toast({
        title: "❌ Token Necessário",
        description: "Configure o token da conta nas configurações.",
        variant: "destructive"
      });
      return;
    }

    const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
    
    ws.onopen = () => {
      console.log('✅ Conectado à Deriv API');
      ws.send(JSON.stringify({ authorize: token }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.authorize) {
        console.log('✅ Autorizado na Deriv API');
        ws.send(JSON.stringify({ ticks: settings.selectedSymbol }));
      }
      
      if (data.tick) {
        const currentPrice = parseFloat(data.tick.quote);
        
        // Atualizar gráfico
        updateRealTimeChart(currentPrice);
        
        // Atualizar preços das trades ativas
        updateActiveTradesPrices(currentPrice);
        
        // Análise para novos trades
        if (isBotRunning) {
          analyzeAndExecuteTrade(currentPrice);
        }
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Erro na conexão Deriv:', error);
    };

    ws.onclose = () => {
      console.log('🔌 Conexão Deriv fechada');
    };

    (window as any).derivWS = ws;
  };

  // ===== ANÁLISE TÉCNICA SIMPLIFICADA =====
  const performTechnicalAnalysis = (currentPrice: number): TechnicalAnalysis => {
    // Análise simples baseada em movimento de preço
    if (!priceChartRef.current) {
      return { signal: 'HOLD', confidence: 0, reason: 'Gráfico não carregado' };
    }

    const prices = priceChartRef.current.data.datasets[0].data;
    if (prices.length < 10) {
      return { signal: 'HOLD', confidence: 0, reason: 'Dados insuficientes' };
    }

    const recentPrices = prices.slice(-10).map((p: any) => p.y);
    const shortMA = recentPrices.slice(-3).reduce((a: number, b: number) => a + b, 0) / 3;
    const longMA = recentPrices.reduce((a: number, b: number) => a + b, 0) / recentPrices.length;

    let signal: 'CALL' | 'PUT' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reason = '';

    if (currentPrice > shortMA && shortMA > longMA) {
      signal = 'CALL';
      confidence = 65 + Math.random() * 20;
      reason = 'Tendência de alta detectada';
    } else if (currentPrice < shortMA && shortMA < longMA) {
      signal = 'PUT';
      confidence = 65 + Math.random() * 20;
      reason = 'Tendência de baixa detectada';
    } else {
      signal = 'HOLD';
      confidence = 0;
      reason = 'Mercado lateral';
    }

    return { signal, confidence, reason };
  };

  // ===== EXECUÇÃO DE TRADES =====
  const analyzeAndExecuteTrade = (currentPrice: number) => {
    // Verificar se pode operar
    if (!canTrade()) return;

    const analysis = performTechnicalAnalysis(currentPrice);
    updateTechnicalIndicators(analysis);

    if (analysis.signal !== 'HOLD' && analysis.confidence >= settings.confidence) {
      executeTrade(analysis.signal, currentPrice, analysis);
    }
  };

  const canTrade = (): boolean => {
    // Verificar cooldown
    if (riskManagement.isInCooldown) return false;
    
    // Verificar trades ativos
    if (activeTrades.length > 0) return false;
    
    // Verificar perda diária
    if (riskManagement.currentDailyLoss >= settings.maxDailyLoss) return false;
    
    // Verificar perdas consecutivas
    if (riskManagement.consecutiveLosses >= settings.maxConsecutiveLosses) return false;
    
    return true;
  };

  const executeTrade = (signal: 'CALL' | 'PUT', price: number, analysis: TechnicalAnalysis) => {
    const tradeId = `trade_${Date.now()}`;
    
    // Calcular níveis de take profit e stop loss
    const takeProfitPrice = signal === 'CALL' 
      ? price * (1 + settings.takeProfitPercent / 100)
      : price * (1 - settings.takeProfitPercent / 100);
    
    const stopLossPrice = signal === 'CALL'
      ? price * (1 - settings.stopLossPercent / 100)
      : price * (1 + settings.stopLossPercent / 100);

    const newTrade: ActiveTrade = {
      id: tradeId,
      signal,
      entryPrice: price,
      currentPrice: price,
      stake: settings.stake,
      startTime: new Date(),
      takeProfitPrice,
      stopLossPrice,
      status: 'open',
      profitPercent: 0
    };

    setActiveTrades(prev => [...prev, newTrade]);
    
    // Atualizar gestão de risco
    setRiskManagement(prev => ({
      ...prev,
      lastTradeTime: new Date(),
      tradesToday: prev.tradesToday + 1
    }));

    console.log(`🚀 Trade executado: ${signal} a $${price.toFixed(4)}`);
    
    toast({
      title: "📊 Trade Executado",
      description: `${signal} - $${settings.stake.toFixed(2)} - ${analysis.reason}`,
      duration: 3000
    });

    // Notificação Telegram
    if (telegramSettings.notificationsEnabled) {
      sendTelegramNotification(`
🎯 <b>Novo Trade Executado</b>

📈 Direção: ${signal}
💰 Stake: $${settings.stake.toFixed(2)}
🎯 TP: ${settings.takeProfitPercent}% | SL: ${settings.stopLossPercent}%
📊 Confiança: ${analysis.confidence.toFixed(1)}%

⏰ ${new Date().toLocaleString()}
      `.trim());
    }
  };

  // ===== MONITORAMENTO DE TRADES ATIVAS =====
  const updateActiveTradesPrices = (currentPrice: number) => {
    setActiveTrades(prev => prev.map(trade => {
      const profitPercent = trade.signal === 'CALL'
        ? ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100
        : ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;

      return {
        ...trade,
        currentPrice,
        profitPercent
      };
    }));
  };

  const monitorActiveTrades = () => {
    setActiveTrades(prev => {
      const updatedTrades: ActiveTrade[] = [];
      const tradesToClose: ActiveTrade[] = [];

      prev.forEach(trade => {
        let shouldClose = false;
        let closeReason = '';
        let result: 'WIN' | 'LOSS' = 'LOSS';

        // Verificar Take Profit
        if (settings.useTakeProfit) {
          if (trade.signal === 'CALL' && trade.currentPrice >= trade.takeProfitPrice) {
            shouldClose = true;
            closeReason = `Take Profit (+${settings.takeProfitPercent}%)`;
            result = 'WIN';
          } else if (trade.signal === 'PUT' && trade.currentPrice <= trade.takeProfitPrice) {
            shouldClose = true;
            closeReason = `Take Profit (+${settings.takeProfitPercent}%)`;
            result = 'WIN';
          }
        }

        // Verificar Stop Loss
        if (settings.useStopLoss && !shouldClose) {
          if (trade.signal === 'CALL' && trade.currentPrice <= trade.stopLossPrice) {
            shouldClose = true;
            closeReason = `Stop Loss (-${settings.stopLossPercent}%)`;
            result = 'LOSS';
          } else if (trade.signal === 'PUT' && trade.currentPrice >= trade.stopLossPrice) {
            shouldClose = true;
            closeReason = `Stop Loss (-${settings.stopLossPercent}%)`;
            result = 'LOSS';
          }
        }

        if (shouldClose) {
          tradesToClose.push(trade);
          closeTrade(trade, result, closeReason);
        } else {
          updatedTrades.push(trade);
        }
      });

      return updatedTrades;
    });
  };

  const closeTrade = (trade: ActiveTrade, result: 'WIN' | 'LOSS', reason: string) => {
    const profit = result === 'WIN' 
      ? trade.stake * (settings.takeProfitPercent / 100)
      : -trade.stake * (settings.stopLossPercent / 100);

    // Atualizar estatísticas
    setStats(prev => ({
      ...prev,
      totalProfit: prev.totalProfit + profit,
      totalTrades: prev.totalTrades + 1,
      wins: result === 'WIN' ? prev.wins + 1 : prev.wins,
      losses: result === 'LOSS' ? prev.losses + 1 : prev.losses,
      currentWinStreak: result === 'WIN' ? prev.currentWinStreak + 1 : 0,
      bestWinStreak: result === 'WIN' ? Math.max(prev.bestWinStreak, prev.currentWinStreak + 1) : prev.bestWinStreak
    }));

    // Atualizar gestão de risco
    setRiskManagement(prev => ({
      ...prev,
      currentDailyLoss: result === 'LOSS' ? prev.currentDailyLoss + Math.abs(profit) : prev.currentDailyLoss,
      consecutiveLosses: result === 'LOSS' ? prev.consecutiveLosses + 1 : 0,
      isInCooldown: true
    }));

    // Salvar no histórico
    const tradeResult = {
      id: trade.id,
      signal: trade.signal,
      entryPrice: trade.entryPrice,
      exitPrice: trade.currentPrice,
      result,
      profit,
      reason,
      timestamp: new Date()
    };

    setTradeHistory(prev => [tradeResult, ...prev.slice(0, 49)]); // Manter últimas 50 trades

    // Notificação
    toast({
      title: result === 'WIN' ? '🎉 Trade Fechado' : '💸 Trade Fechado',
      description: `${trade.signal} - ${reason} - $${profit.toFixed(2)}`,
      variant: result === 'WIN' ? 'default' : 'destructive'
    });

    // Notificação Telegram
    if (telegramSettings.notificationsEnabled) {
      sendTelegramNotification(`
${result === 'WIN' ? '🎉' : '💸'} <b>Trade Fechado - ${result}</b>

📈 ${trade.signal}
💰 Lucro: $${profit.toFixed(2)}
📊 ${reason}
🎯 Entrada: $${trade.entryPrice.toFixed(4)}
🎯 Saída: $${trade.currentPrice.toFixed(4)}

⏰ ${new Date().toLocaleString()}
      `.trim());
    }

    // Cooldown
    setTimeout(() => {
      setRiskManagement(prev => ({ ...prev, isInCooldown: false }));
    }, settings.cooldownBetweenTrades * 1000);
  };

  // ===== BOTÕES DE CONTROLE =====
  const handleStartBot = () => {
    if (!isLicenseValid) {
      toast({
        title: "❌ Licença Necessária",
        description: "Você precisa de uma licença válida para iniciar o bot.",
        variant: "destructive"
      });
      return;
    }

    if (!settings.derivTokenDemo && settings.selectedTokenType === 'demo') {
      toast({
        title: "❌ Token Demo Necessário",
        description: "Configure o token da conta demo nas configurações.",
        variant: "destructive"
      });
      return;
    }

    setIsBotRunning(true);
    connectToDerivAPI();
    
    toast({
      title: "🚀 Bot Iniciado",
      description: `Scalping ativo - TP: ${settings.takeProfitPercent}% | SL: ${settings.stopLossPercent}%`,
    });
  };

  const handleStopBot = () => {
    setIsBotRunning(false);
    
    if ((window as any).derivWS) {
      (window as any).derivWS.close();
      (window as any).derivWS = null;
    }

    // Fechar todas as trades ativas
    activeTrades.forEach(trade => {
      closeTrade(trade, 'LOSS', 'Bot parado');
    });

    toast({
      title: "⏹️ Bot Parado",
      description: "Scalping interrompido e trades fechadas.",
    });
  };

  // ===== CONFIGURAÇÕES =====
  const updateSetting = (key: keyof TradingSettings, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      // Salvar localmente
      const settingsKey = user?.id ? `scalping_settings_${user.id}` : 'scalping_settings_temp';
      localStorage.setItem(settingsKey, JSON.stringify(newSettings));
      return newSettings;
    });
  };

  const loadSettings = () => {
    try {
      const settingsKey = user?.id ? `scalping_settings_${user.id}` : 'scalping_settings_temp';
      const savedSettings = localStorage.getItem(settingsKey);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const resetSettings = () => {
    const defaultSettings: TradingSettings = {
      stake: 1,
      selectedTokenType: 'demo',
      selectedSymbol: 'R_10',
      derivTokenDemo: '',
      derivTokenReal: '',
      takeProfitPercent: 5,
      stopLossPercent: 2,
      confidence: 60,
      maxTradesPerHour: 10,
      cooldownBetweenTrades: 5,
      maxDailyLoss: 50,
      maxConsecutiveLosses: 3,
      useStopLoss: true,
      useTakeProfit: true
    };
    
    setSettings(defaultSettings);
    const settingsKey = user?.id ? `scalping_settings_${user.id}` : 'scalping_settings_temp';
    localStorage.setItem(settingsKey, JSON.stringify(defaultSettings));
    
    toast({
      title: "🔄 Configurações Resetadas",
      description: "Configurações padrão de scalping aplicadas.",
    });
  };

  // ===== TELEGRAM =====
  const sendTelegramNotification = async (message: string) => {
    try {
      if (!telegramSettings.notificationsEnabled || !telegramSettings.userTelegram) return false;

      const response = await fetch(`https://api.telegram.org/bot${telegramSettings.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramSettings.userTelegram,
          text: message,
          parse_mode: 'HTML'
        })
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const saveTelegramSettings = () => {
    localStorage.setItem('telegram_settings', JSON.stringify(telegramSettings));
    toast({
      title: "✅ Configurações salvas!",
      description: "Notificações configuradas com sucesso.",
    });
  };

  // ===== GRÁFICO =====
  const initializeRealTimeChart = () => {
    if (typeof window === 'undefined' || !(window as any).Chart) return;

    const canvas = document.getElementById('realTimeChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (priceChartRef.current) {
      priceChartRef.current.destroy();
    }

    try {
      priceChartRef.current = new (window as any).Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: `Preço ${settings.selectedSymbol}`,
            data: [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            pointRadius: 2,
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 0 },
          plugins: {
            legend: { display: true },
            tooltip: { mode: 'index', intersect: false }
          },
          scales: {
            x: { display: false },
            y: { 
              ticks: { 
                callback: (value: any) => `$${parseFloat(value).toFixed(4)}` 
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Erro ao inicializar gráfico:', error);
    }
  };

  const updateRealTimeChart = (price: number) => {
    if (!priceChartRef.current) return;

    try {
      const now = new Date();
      const timeLabel = now.toLocaleTimeString();
      
      const currentData = priceChartRef.current.data.datasets[0].data;
      const currentLabels = priceChartRef.current.data.labels;

      currentData.push({ x: currentData.length, y: price });
      currentLabels.push(timeLabel);

      // Manter últimos 50 pontos
      if (currentData.length > 50) {
        currentData.shift();
        currentLabels.shift();
      }

      priceChartRef.current.update('none');
    } catch (error) {
      console.error('Erro ao atualizar gráfico:', error);
    }
  };

  const updateTechnicalIndicators = (analysis: TechnicalAnalysis) => {
    const signalEl = document.getElementById('current-signal');
    const confidenceEl = document.getElementById('current-confidence');
    const reasonEl = document.getElementById('signal-reason');

    if (signalEl && confidenceEl && reasonEl) {
      let color = 'text-gray-400';
      let symbol = '⏸️ HOLD';

      switch (analysis.signal) {
        case 'CALL':
          color = 'text-green-400';
          symbol = '📈 CALL';
          break;
        case 'PUT':
          color = 'text-red-400';
          symbol = '📉 PUT';
          break;
      }

      signalEl.textContent = symbol;
      signalEl.className = `text-xl font-bold ${color}`;
      confidenceEl.textContent = `${analysis.confidence.toFixed(1)}%`;
      reasonEl.textContent = analysis.reason;
    }
  };

  // ===== EFEITOS =====
  useEffect(() => {
    loadSettings();
    
    // Carregar Telegram
    const savedTelegram = localStorage.getItem('telegram_settings');
    if (savedTelegram) {
      setTelegramSettings(JSON.parse(savedTelegram));
    }
  }, []);

  useEffect(() => {
    if (isBotRunning) {
      tradeMonitorRef.current = setInterval(monitorActiveTrades, 1000);
    } else {
      if (tradeMonitorRef.current) {
        clearInterval(tradeMonitorRef.current);
      }
    }

    return () => {
      if (tradeMonitorRef.current) {
        clearInterval(tradeMonitorRef.current);
      }
    };
  }, [isBotRunning]);

  useEffect(() => {
    if (activeTab === 'trading') {
      setTimeout(initializeRealTimeChart, 1000);
    }
  }, [activeTab]);

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">🤖</div>
            <CardTitle className="text-2xl text-white">Carregando Zeus Scalping</CardTitle>
            <CardDescription className="text-gray-400">Inicializando sistema...</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Bot className="h-8 w-8" />
            Zeus Scalping Bot
          </h1>
          <p className="text-gray-400">Sistema profissional de scalping automático</p>
        </div>
        
        {licenseInfo && (
          <Badge variant={isLicenseValid ? "default" : "destructive"}>
            {isLicenseValid ? `✅ ${licenseInfo.type.toUpperCase()}` : '❌ Licença Expirada'}
          </Badge>
        )}
      </div>

      {/* Container Principal */}
      <Card className="shadow-2xl border-slate-700 bg-slate-800">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-12 bg-slate-700">
              <TabsTrigger value="trading" className="data-[state=active]:bg-blue-600">
                <Play className="h-4 w-4 mr-2" />
                Trading
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-green-600">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-purple-600">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </TabsTrigger>
            </TabsList>
            
            {/* ABA TRADING */}
            <TabsContent value="trading" className="space-y-6">
              {!isLicenseValid && (
                <Alert className="border-red-400 bg-red-900/20">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-200">
                    {licenseStatus || 'Nenhuma licença válida. Renove sua licença.'}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Controle da Conta */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader>
                  <CardTitle className="text-blue-400 flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Conta Deriv
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => updateSetting('selectedTokenType', 'demo')}
                      className={`h-16 ${
                        settings.selectedTokenType === 'demo' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-700 text-blue-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold">💎 Demo</div>
                        <div className="text-xs opacity-75">
                          {settings.derivTokenDemo ? '✅ Configurado' : '❌ Não configurado'}
                        </div>
                      </div>
                    </Button>
                    <Button
                      onClick={() => updateSetting('selectedTokenType', 'real')}
                      className={`h-16 ${
                        settings.selectedTokenType === 'real' 
                          ? 'bg-green-600 text-white' 
                          : 'bg-slate-700 text-green-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold">💰 Real</div>
                        <div className="text-xs opacity-75">
                          {settings.derivTokenReal ? '✅ Configurado' : '❌ Não configurado'}
                        </div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Controle do Bot */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Controle do Bot
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={handleStartBot}
                      disabled={!isLicenseValid || isBotRunning}
                      className={`h-16 text-lg font-semibold ${
                        isLicenseValid && !isBotRunning
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Play className="h-5 w-5 mr-2" />
                      {isBotRunning ? 'Executando...' : 'Iniciar Bot'}
                    </Button>
                    
                    <Button
                      onClick={handleStopBot}
                      disabled={!isBotRunning}
                      className={`h-16 text-lg font-semibold ${
                        isBotRunning
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Square className="h-5 w-5 mr-2" />
                      Parar Bot
                    </Button>
                  </div>
                  
                  {isBotRunning && (
                    <div className="mt-4 p-3 bg-green-900/20 border border-green-600 rounded-lg">
                      <div className="flex items-center justify-between text-green-400">
                        <span>🟢 Bot em execução</span>
                        <span>TP: {settings.takeProfitPercent}% | SL: {settings.stopLossPercent}%</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gráfico */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Gráfico em Tempo Real
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-slate-900 rounded-lg p-4">
                    <canvas id="realTimeChart"></canvas>
                  </div>
                </CardContent>
              </Card>

              {/* Status e Sinal */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status do Trading */}
                <Card className="border-slate-600 bg-slate-750">
                  <CardHeader>
                    <CardTitle className="text-white">Status do Trading</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-slate-700 rounded-lg">
                        <div className="text-2xl font-bold text-white">${stats.totalProfit.toFixed(2)}</div>
                        <div className="text-sm text-gray-400">Lucro Total</div>
                      </div>
                      <div className="text-center p-4 bg-slate-700 rounded-lg">
                        <div className="text-2xl font-bold text-white">{stats.totalTrades}</div>
                        <div className="text-sm text-gray-400">Total Trades</div>
                      </div>
                      <div className="text-center p-4 bg-slate-700 rounded-lg">
                        <div className="text-2xl font-bold text-white">
                          {stats.totalTrades > 0 ? ((stats.wins / stats.totalTrades) * 100).toFixed(1) : 0}%
                        </div>
                        <div className="text-sm text-gray-400">Win Rate</div>
                      </div>
                      <div className="text-center p-4 bg-slate-700 rounded-lg">
                        <div className="text-2xl font-bold text-white">
                          {isBotRunning ? '🟢' : '🔴'}
                        </div>
                        <div className="text-sm text-gray-400">Status Bot</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sinal Atual */}
                <Card className="border-slate-600 bg-slate-750">
                  <CardHeader>
                    <CardTitle className="text-white">Sinal Atual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center p-6 bg-slate-700 rounded-lg">
                      <div className="text-3xl font-bold text-white mb-2" id="current-signal">⏸️ HOLD</div>
                      <div className="text-xl text-gray-400 mb-4" id="current-confidence">0%</div>
                      <div className="text-sm text-gray-500" id="signal-reason">Aguardando análise...</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Trades Ativos */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Trades Ativos ({activeTrades.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeTrades.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum trade ativo no momento</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeTrades.map(trade => (
                        <div key={trade.id} className="p-4 bg-slate-700 rounded-lg border border-slate-600">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`text-2xl ${
                                trade.signal === 'CALL' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {trade.signal === 'CALL' ? '📈' : '📉'}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{trade.signal}</div>
                                <div className="text-sm text-gray-400">Entrada: ${trade.entryPrice.toFixed(4)}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${
                                trade.profitPercent >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {trade.profitPercent >= 0 ? '+' : ''}{trade.profitPercent.toFixed(2)}%
                              </div>
                              <div className="text-sm text-gray-400">Atual: ${trade.currentPrice.toFixed(4)}</div>
                            </div>
                          </div>
                          
                          {/* Barra de Progresso */}
                          <div className="mt-3">
                            <div className="flex justify-between text-sm text-gray-400 mb-1">
                              <span>SL: -{settings.stopLossPercent}%</span>
                              <span>TP: +{settings.takeProfitPercent}%</span>
                            </div>
                            <div className="w-full bg-slate-600 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  trade.profitPercent >= 0 ? 'bg-green-500' : 'bg-red-500'
                                }`}
                                style={{ 
                                  width: `${Math.min(Math.abs(trade.profitPercent) / settings.takeProfitPercent * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA ANALYTICS */}
            <TabsContent value="analytics" className="space-y-6">
              {/* Estatísticas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Lucro Total</p>
                        <p className="text-3xl font-bold text-white">${stats.totalProfit.toFixed(2)}</p>
                      </div>
                      <DollarSign className="h-10 w-10 opacity-90" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Win Rate</p>
                        <p className="text-3xl font-bold text-white">
                          {stats.totalTrades > 0 ? ((stats.wins / stats.totalTrades) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                      <Target className="h-10 w-10 opacity-90" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Total Trades</p>
                        <p className="text-3xl font-bold text-white">{stats.totalTrades}</p>
                      </div>
                      <BarChart3 className="h-10 w-10 opacity-90" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Melhor Sequência</p>
                        <p className="text-3xl font-bold text-white">{stats.bestWinStreak}</p>
                      </div>
                      <Zap className="h-10 w-10 opacity-90" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Histórico de Trades */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader>
                  <CardTitle className="text-white">Histórico de Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-600">
                          <th className="text-left py-3 px-4 text-gray-400">Data/Hora</th>
                          <th className="text-left py-3 px-4 text-gray-400">Ativo</th>
                          <th className="text-left py-3 px-4 text-gray-400">Direção</th>
                          <th className="text-left py-3 px-4 text-gray-400">Resultado</th>
                          <th className="text-left py-3 px-4 text-gray-400">Lucro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {tradeHistory.slice(0, 10).map((trade) => (
                          <tr key={trade.id}>
                            <td className="py-3 px-4 text-gray-300">
                              {new Date(trade.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-300">{settings.selectedSymbol}</td>
                            <td className={`py-3 px-4 font-semibold ${
                              trade.signal === 'CALL' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {trade.signal}
                            </td>
                            <td className={`py-3 px-4 font-semibold ${
                              trade.result === 'WIN' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {trade.result}
                            </td>
                            <td className={`py-3 px-4 font-semibold ${
                              trade.profit >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              ${trade.profit.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        {tradeHistory.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-500">
                              Nenhum trade registrado
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA CONFIGURAÇÕES */}
            <TabsContent value="settings" className="space-y-6">
              {/* Configurações de Scalping */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Rocket className="h-5 w-5" />
                    Configurações de Scalping
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Configure os parâmetros do sistema de scalping
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stake" className="text-gray-300">
                        Stake ($)
                      </Label>
                      <Input
                        id="stake"
                        type="number"
                        value={settings.stake}
                        onChange={(e) => updateSetting('stake', parseFloat(e.target.value) || 1)}
                        className="bg-slate-700 border-slate-600 text-white"
                        min="0.35"
                        step="0.01"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="symbol" className="text-gray-300">
                        Ativo
                      </Label>
                      <Select
                        value={settings.selectedSymbol}
                        onValueChange={(value) => updateSetting('selectedSymbol', value)}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          {AVAILABLE_SYMBOLS.map((symbol) => (
                            <SelectItem key={symbol.value} value={symbol.value}>
                              {symbol.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="takeProfitPercent" className="text-gray-300">
                        Take Profit (%)
                      </Label>
                      <Input
                        id="takeProfitPercent"
                        type="number"
                        value={settings.takeProfitPercent}
                        onChange={(e) => updateSetting('takeProfitPercent', parseFloat(e.target.value) || 5)}
                        className="bg-slate-700 border-slate-600 text-white"
                        min="0.1"
                        max="20"
                        step="0.1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stopLossPercent" className="text-gray-300">
                        Stop Loss (%)
                      </Label>
                      <Input
                        id="stopLossPercent"
                        type="number"
                        value={settings.stopLossPercent}
                        onChange={(e) => updateSetting('stopLossPercent', parseFloat(e.target.value) || 2)}
                        className="bg-slate-700 border-slate-600 text-white"
                        min="0.1"
                        max="10"
                        step="0.1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confidence" className="text-gray-300">
                        Confiança Mínima (%)
                      </Label>
                      <Input
                        id="confidence"
                        type="number"
                        value={settings.confidence}
                        onChange={(e) => updateSetting('confidence', parseInt(e.target.value) || 60)}
                        className="bg-slate-700 border-slate-600 text-white"
                        min="1"
                        max="100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cooldownBetweenTrades" className="text-gray-300">
                        Cooldown (segundos)
                      </Label>
                      <Input
                        id="cooldownBetweenTrades"
                        type="number"
                        value={settings.cooldownBetweenTrades}
                        onChange={(e) => updateSetting('cooldownBetweenTrades', parseInt(e.target.value) || 5)}
                        className="bg-slate-700 border-slate-600 text-white"
                        min="1"
                        max="60"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="derivTokenDemo" className="text-gray-300">
                        Token Deriv (Demo)
                      </Label>
                      <Input
                        id="derivTokenDemo"
                        type="password"
                        value={settings.derivTokenDemo}
                        onChange={(e) => updateSetting('derivTokenDemo', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="Cole seu token da conta demo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="derivTokenReal" className="text-gray-300">
                        Token Deriv (Real)
                      </Label>
                      <Input
                        id="derivTokenReal"
                        type="password"
                        value={settings.derivTokenReal}
                        onChange={(e) => updateSetting('derivTokenReal', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="Cole seu token da conta real"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button onClick={resetSettings} variant="outline" className="border-red-500 text-red-500">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Resetar
                    </Button>
                    <Button onClick={() => toast({ title: "✅ Configurações salvas!" })} className="bg-blue-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Configurações do Telegram */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notificações Telegram
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userTelegram" className="text-gray-300">
                      Chat ID do Telegram
                    </Label>
                    <Input
                      id="userTelegram"
                      value={telegramSettings.userTelegram}
                      onChange={(e) => setTelegramSettings(prev => ({ ...prev, userTelegram: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="123456789"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="notificationsEnabled"
                      checked={telegramSettings.notificationsEnabled}
                      onChange={(e) => setTelegramSettings(prev => ({ ...prev, notificationsEnabled: e.target.checked }))}
                      className="rounded bg-slate-700 border-slate-600 text-blue-500"
                    />
                    <Label htmlFor="notificationsEnabled" className="text-gray-300">
                      Ativar notificações
                    </Label>
                  </div>

                  <Button onClick={saveTelegramSettings} className="bg-green-600">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Salvar Configurações Telegram
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <ReactToaster />
    </div>
  );
}