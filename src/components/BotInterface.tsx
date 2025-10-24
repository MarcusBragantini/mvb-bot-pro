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
import { toast as sonnerToast } from 'sonner';
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

interface CandleData {
  x: number;
  o: number;
  h: number;
  l: number;
  c: number;
  volume?: number;
  time: string;
}

interface ChartConfig {
  type: 'candlestick' | 'line';
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  theme: 'dark' | 'light';
}

// ===== SISTEMA DE LICENÇAS =====
const LICENSE_KEYS: Record<string, LicenseInfo> = {
  'STANDARD-MVB-2025': {
    type: 'standard',
    days: 30,
    features: ['all_features', 'premium_support'],
    maxDevices: 2
  },
  'BASIC-MVB-7': {
    type: 'basic', 
    days: 7,
    features: ['basic_features', 'email_support'],
    maxDevices: 1
  },
  'FREE-MVB-24': {
    type: 'free',
    days: 1,
    features: ['limited_features'],
    maxDevices: 1
  },
  'PRO-MVB-UNLIMITED': {
    type: 'pro',
    days: 365,
    features: ['all_features', 'premium_support', 'unlimited_trades'],
    maxDevices: 5
  }
};

// ===== ESTRATÉGIAS PRÉ-CONFIGURADAS =====
const STRATEGIES = {
  scalper: {
    name: '⚡ Scalper',
    description: 'Lucros rápidos e frequentes',
    stake: 0.5,
    autoCloseProfit: 15,
    autoStopLoss: 30,
    trailingStop: true,
    trailingStopPercent: 10,
    stopWin: 10,
    stopLoss: -10,
    confidence: 60
  },
  conservador: {
    name: '🛡️ Conservador',
    description: 'Segurança e estabilidade',
    stake: 1,
    autoCloseProfit: 25,
    autoStopLoss: 25,
    trailingStop: true,
    trailingStopPercent: 12,
    stopWin: 20,
    stopLoss: -20,
    confidence: 75
  },
  agressivo: {
    name: '🔥 Agressivo',
    description: 'Alto risco, alto retorno',
    stake: 2,
    autoCloseProfit: 40,
    autoStopLoss: 50,
    trailingStop: false,
    trailingStopPercent: 15,
    stopWin: 50,
    stopLoss: -50,
    confidence: 65
  },
  profissional: {
    name: '💎 Profissional',
    description: 'Trailing stop inteligente',
    stake: 1.5,
    autoCloseProfit: 35,
    autoStopLoss: 35,
    trailingStop: true,
    trailingStopPercent: 12,
    stopWin: 30,
    stopLoss: -30,
    confidence: 70
  },
  personalizado: {
    name: '⚙️ Personalizado',
    description: 'Configure manualmente',
    stake: 1,
    autoCloseProfit: 20,
    autoStopLoss: 50,
    trailingStop: false,
    trailingStopPercent: 10,
    stopWin: 3,
    stopLoss: -5,
    confidence: 70
  }
};

// ===== SISTEMAS DE GESTÃO DE CAPITAL =====
const MONEY_MANAGEMENT = {
  martingale_classico: {
    name: '🔴 Martingale Clássico',
    description: 'Dobra stake após loss (arriscado)'
  },
  martingale_inteligente: {
    name: '🧠 Martingale Inteligente',
    description: 'Martingale com limite e recuperação gradual'
  },
  anti_martingale: {
    name: '🟢 Anti-Martingale',
    description: 'Aumenta stake em wins, diminui em losses'
  },
  kelly_criterion: {
    name: '📊 Kelly Criterion',
    description: 'Stake baseado em win rate e edge'
  },
  fixo: {
    name: '💰 Stake Fixo',
    description: 'Stake sempre igual (seguro)'
  }
};

export default function BotInterface() {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  
  // ===== ESTADOS DE LICENÇA =====
  const [isLicenseValid, setIsLicenseValid] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [licenseStatus, setLicenseStatus] = useState('');
  const [userLicenses, setUserLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trading');
  
  // ===== ESTADOS DE ANALYTICS =====
  const [analyticsAccountFilter, setAnalyticsAccountFilter] = useState<'all' | 'real' | 'demo'>('all');
  
  // ===== ESTADO DO GRÁFICO PROFISSIONAL =====
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'candlestick',
    timeframe: '1m',
    theme: 'dark'
  });

  // ===== ESTADOS DAS CONFIGURAÇÕES =====
  const [settings, setSettings] = useState({
    stake: 1,
    martingale: 2,
    duration: 15,
    stopWin: 3,
    stopLoss: -5,
    confidence: 70,
    strategy: 'martingale',
    moneyManagement: 'martingale_inteligente',
    derivTokenDemo: '',
    derivTokenReal: '',
    selectedTokenType: 'demo',
    selectedStrategy: 'personalizado',
    mhiPeriods: 20,
    emaFast: 8,
    emaSlow: 18,
    rsiPeriods: 10,
    autoCloseTime: 30,
    autoCloseProfit: 20,
    autoStopLoss: 50,
    trailingStop: false,
    trailingStopPercent: 10
  });

  // ===== ESTADOS DO TELEGRAM =====
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    botToken: '',
    userTelegram: '',
    notificationsEnabled: false
  });
  const [botTokenLoaded, setBotTokenLoaded] = useState(false);
  
  // ===== REFS PARA INTEGRAÇÃO =====
  const botContainerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  // ===== FUNÇÕES DO GRÁFICO PROFISSIONAL =====
  const getTimeUnit = (timeframe: string) => {
    switch (timeframe) {
      case '1m': return 'minute';
      case '5m': return 'minute';
      case '15m': return 'minute';
      case '1h': return 'hour';
      case '4h': return 'hour';
      case '1d': return 'day';
      default: return 'minute';
    }
  };

  const getTimeframeMilliseconds = (timeframe: string): number => {
    switch (timeframe) {
      case '1m': return 60000;
      case '5m': return 300000;
      case '15m': return 900000;
      case '1h': return 3600000;
      case '4h': return 14400000;
      case '1d': return 86400000;
      default: return 60000;
    }
  };

  const initializeProfessionalChart = () => {
    console.log('📊 Inicializando gráfico profissional...');
    
    const canvas = document.getElementById('priceChart') as HTMLCanvasElement;
    if (!canvas) {
      console.error('❌ Canvas do gráfico não encontrado!');
      return null;
    }
    
    if (typeof (window as any).Chart === 'undefined') {
      console.error('❌ Chart.js não está disponível!');
      return null;
    }

    // Destruir gráfico existente
    const existingChart = (window as any).priceChartInstance;
    if (existingChart) {
      console.log('🗑️ Destruindo gráfico existente...');
      existingChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Contexto do canvas não encontrado!');
      return null;
    }
    
    console.log('✅ Canvas e contexto prontos');

    // Criar gradiente para o fundo do gráfico
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.8)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0.2)');

    // Dados iniciais para o gráfico
    const initialData = [];
    const now = Date.now();
    const timeframeMs = getTimeframeMilliseconds(chartConfig.timeframe);
    
    // Criar 20 velas iniciais com dados simulados
    for (let i = 20; i >= 0; i--) {
      const timestamp = now - (i * timeframeMs);
      const basePrice = 1.0000 + Math.random() * 0.1;
      const variation = (Math.random() - 0.5) * 0.05;
      
      const open = basePrice + variation;
      const close = basePrice + variation + (Math.random() - 0.5) * 0.02;
      const high = Math.max(open, close) + Math.random() * 0.01;
      const low = Math.min(open, close) - Math.random() * 0.01;
      
      initialData.push({
        x: timestamp,
        o: open,
        h: high,
        l: low,
        c: close,
        time: new Date(timestamp).toISOString()
      });
    }

    // Configurações profissionais do gráfico
    const chart = new (window as any).Chart(ctx, {
      type: chartConfig.type === 'candlestick' ? 'candlestick' : 'line',
      data: {
        datasets: [
          {
            label: `Ativo - ${chartConfig.timeframe}`,
            data: initialData,
            ...(chartConfig.type === 'candlestick' && {
              color: {
                up: '#10b981',
                down: '#ef4444',
                unchanged: '#6b7280'
              },
              borderColor: {
                up: '#10b981',
                down: '#ef4444',
                unchanged: '#6b7280'
              },
              backgroundColor: {
                up: 'rgba(16, 185, 129, 0.3)',
                down: 'rgba(239, 68, 68, 0.3)',
                unchanged: 'rgba(107, 114, 128, 0.3)'
              },
              borderWidth: 2,
              wickColor: {
                up: '#10b981',
                down: '#ef4444',
                unchanged: '#6b7280'
              },
              wickWidth: 1
            }),
            ...(chartConfig.type === 'line' && {
              borderColor: '#3b82f6',
              backgroundColor: gradient,
              borderWidth: 3,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointBackgroundColor: '#3b82f6',
              pointBorderColor: '#1e40af',
              pointBorderWidth: 2,
              fill: true,
              tension: 0.1
            })
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: {
                size: 11,
                weight: 'bold'
              },
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            displayColors: true
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: getTimeUnit(chartConfig.timeframe),
              displayFormats: {
                millisecond: 'HH:mm:ss',
                second: 'HH:mm:ss',
                minute: 'HH:mm',
                hour: 'HH:mm',
                day: 'MMM dd'
              }
            },
            grid: {
              color: '#334155',
              drawBorder: false
            },
            ticks: {
              color: '#94a3b8',
              font: {
                size: 10
              },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8
            }
          },
          y: {
            position: 'right',
            grid: {
              color: '#334155',
              drawBorder: false
            },
            ticks: {
              color: '#cbd5e1',
              font: {
                size: 10,
                weight: 'bold'
              },
              callback: function(value: any) {
                return value.toFixed(4);
              }
            }
          }
        },
        elements: {
          point: {
            hoverRadius: 8,
            hoverBorderWidth: 2
          }
        }
      }
    });

    // Salvar instância globalmente
    (window as any).priceChartInstance = chart;
    
    console.log('✅ Gráfico profissional criado com sucesso!');
    console.log('📊 Canvas element:', canvas);
    console.log('📊 Chart instance:', chart);
    console.log('📊 Chart data:', chart.data);
    
    return chart;
  };

  const updateChartWithCandle = (candle: CandleData) => {
    const chart = (window as any).priceChartInstance;
    if (!chart) return;

    try {
      const mainDataset = chart.data.datasets[0];
      
      // Adicionar nova vela
      mainDataset.data.push(candle);
      
      // Manter apenas últimas 100 velas para performance
      if (mainDataset.data.length > 100) {
        mainDataset.data = mainDataset.data.slice(-100);
      }
      
      // Atualizar gráfico
      chart.update('none');
      
    } catch (error) {
      console.error('Erro ao atualizar gráfico:', error);
    }
  };

  const processTickToCandle = (price: number, timestamp: number): CandleData | null => {
    const chart = (window as any).priceChartInstance;
    if (!chart) return null;

    const timeframeMs = getTimeframeMilliseconds(chartConfig.timeframe);
    const candleStartTime = Math.floor(timestamp / timeframeMs) * timeframeMs;
    
    const mainData = chart.data.datasets[0].data;
    const lastCandle = mainData[mainData.length - 1] as CandleData;

    if (lastCandle && lastCandle.x === candleStartTime) {
      // Atualizar vela atual
      lastCandle.h = Math.max(lastCandle.h, price);
      lastCandle.l = Math.min(lastCandle.l, price);
      lastCandle.c = price;
      return lastCandle;
    } else {
      // Criar nova vela
      const newCandle: CandleData = {
        x: candleStartTime,
        o: lastCandle ? lastCandle.c : price,
        h: price,
        l: price,
        c: price,
        time: new Date(candleStartTime).toISOString()
      };
      return newCandle;
    }
  };

  const addTradeMarker = (price: number, timestamp: number, signal: 'CALL' | 'PUT') => {
    const chart = (window as any).priceChartInstance;
    if (!chart) return;

    // Adicionar marcador visual
    const markerDataset = {
      label: signal,
      data: [{ x: timestamp, y: price }],
      borderColor: 'transparent',
      backgroundColor: signal === 'CALL' ? '#10b981' : '#ef4444',
      pointRadius: 8,
      pointHoverRadius: 12,
      pointStyle: 'triangle',
      pointBackgroundColor: signal === 'CALL' ? '#10b981' : '#ef4444',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      showLine: false
    };

    chart.data.datasets.push(markerDataset);
    chart.update('none');
  };

  const updateCurrentPriceLine = (price: number, timestamp: number) => {
    const chart = (window as any).priceChartInstance;
    if (!chart) return;

    const currentPriceData = [
      { x: timestamp - 3600000, y: price },
      { x: timestamp + 3600000, y: price }
    ];
    
    // Verificar se já existe dataset de preço atual
    let priceLineDataset = chart.data.datasets.find((ds: any) => ds.label === 'Preço Atual');
    if (!priceLineDataset) {
      priceLineDataset = {
        label: 'Preço Atual',
        data: currentPriceData,
        borderColor: '#f59e0b',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        tension: 0
      };
      chart.data.datasets.push(priceLineDataset);
    } else {
      priceLineDataset.data = currentPriceData;
    }

    chart.update('none');
  };

  const calculateEMAValues = (data: any[], period: number) => {
    const emaValues = [];
    let ema = data[0]?.c || data[0]?.y || 0;

    for (let i = 0; i < data.length; i++) {
      const currentPrice = data[i]?.c || data[i]?.y || 0;
      
      if (i < period) {
        if (i === period - 1) {
          const sum = data.slice(0, period).reduce((acc, val) => acc + (val.c || val.y || 0), 0);
          ema = sum / period;
        } else {
          ema = currentPrice;
        }
      } else {
        const multiplier = 2 / (period + 1);
        ema = (currentPrice - ema) * multiplier + ema;
      }
      
      emaValues.push({
        x: data[i].x,
        y: ema
      });
    }

    return emaValues;
  };

  const updateEMAsOnChart = () => {
    const chart = (window as any).priceChartInstance;
    if (!chart) return;

    const mainData = chart.data.datasets[0].data;
    if (mainData.length < Math.max(settings.emaFast, settings.emaSlow)) return;

    // Calcular EMA rápida
    const emaFastData = calculateEMAValues(mainData, settings.emaFast);
    
    // Calcular EMA lenta
    const emaSlowData = calculateEMAValues(mainData, settings.emaSlow);

    // Atualizar ou criar datasets de EMA
    let emaFastDataset = chart.data.datasets.find((ds: any) => ds.label === `EMA ${settings.emaFast}`);
    let emaSlowDataset = chart.data.datasets.find((ds: any) => ds.label === `EMA ${settings.emaSlow}`);

    if (!emaFastDataset) {
      emaFastDataset = {
        label: `EMA ${settings.emaFast}`,
        data: emaFastData,
        borderColor: '#8b5cf6',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.1
      };
      chart.data.datasets.push(emaFastDataset);
    } else {
      emaFastDataset.data = emaFastData;
    }

    if (!emaSlowDataset) {
      emaSlowDataset = {
        label: `EMA ${settings.emaSlow}`,
        data: emaSlowData,
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.1
      };
      chart.data.datasets.push(emaSlowDataset);
    } else {
      emaSlowDataset.data = emaSlowData;
    }

    chart.update('none');
  };

  const clearChart = () => {
    const chart = (window as any).priceChartInstance;
    if (!chart) return;

    chart.data.datasets.forEach((dataset: any) => {
      dataset.data = [];
    });
    chart.update('none');
  };

  const changeChartType = (type: 'candlestick' | 'line') => {
    setChartConfig(prev => ({ ...prev, type }));
  };

  const changeChartTimeframe = (timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d') => {
    setChartConfig(prev => ({ ...prev, timeframe }));
  };

  // ===== FUNÇÃO DE PREVIEW DO MERCADO =====
  const startMarketPreview = () => {
    console.log('📊 Iniciando preview do mercado...');
    
    const symbol = (document.getElementById('symbol') as HTMLSelectElement)?.value;
    const token = (document.getElementById('token') as HTMLInputElement)?.value;
    
    if (!symbol || !token) {
      console.error('❌ Símbolo ou token não configurado!');
      return;
    }
    
    // Fechar WebSocket existente
    if ((window as any).marketPreviewWS) {
      (window as any).marketPreviewWS.close();
    }
    
    // Conectar com Deriv
    const wsUrl = 'wss://ws.binaryws.com/websockets/v3?app_id=1089';
    const ws = new WebSocket(wsUrl);
    (window as any).marketPreviewWS = ws;
    
    ws.onopen = () => {
      console.log('🔗 Conectado com Deriv');
      
      // Autenticar
      ws.send(JSON.stringify({
        authorize: token
      }));
      
      // Subscribir a ticks
      ws.send(JSON.stringify({
        ticks: symbol,
        subscribe: 1
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.msg_type === 'tick') {
          const tick = data.tick;
          console.log('📈 Tick recebido:', tick);
          
          // Atualizar gráfico
          const candle = processTickToCandle(tick.quote, tick.epoch * 1000);
          if (candle) {
            updateChartWithCandle(candle);
          }
          
          // Atualizar preço atual
          updateCurrentPriceLine(tick.quote, tick.epoch * 1000);
          
          // Log do preço
          const logsElement = document.getElementById('logs');
          if (logsElement) {
            const logEntry = document.createElement('div');
            logEntry.style.padding = '4px 0';
            logEntry.style.color = '#cbd5e1';
            logEntry.style.fontSize = '0.8rem';
            logEntry.innerHTML = `📊 ${symbol}: $${tick.quote.toFixed(4)} - ${new Date().toLocaleTimeString()}`;
            
            logsElement.appendChild(logEntry);
            
            // Manter apenas últimas 10 entradas
            while (logsElement.children.length > 10) {
              logsElement.removeChild(logsElement.firstChild!);
            }
          }
        }
        
        if (data.msg_type === 'authorize') {
          console.log('✅ Autorizado com Deriv');
        }
        
      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ Erro no WebSocket:', error);
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket fechado');
    };
  };

  // ===== FUNÇÕES AUXILIARES =====
  const isBotRunning = () => {
    const statusElement = document.getElementById('status');
    if (statusElement && statusElement.textContent) {
      const statusText = statusElement.textContent.trim();
      return !statusText.includes('⏸️') && !statusText.includes('Bot Parado') && statusText !== '';
    }
    return false;
  };

  const handleTabChange = (newTab: string) => {
    if (activeTab === 'trading' && newTab !== 'trading' && isBotRunning()) {
      toast({
        title: "⚠️ Bot em Execução!",
        description: "O bot continua rodando em segundo plano. Recomendamos não recarregar a página.",
        duration: 4000,
      });
    }
    setActiveTab(newTab);
    
    if (newTab === 'analytics' && user?.id) {
      loadAnalyticsFromDatabase();
    }
  };

  // ===== CARREGAR ANALYTICS DO BANCO =====
  const loadAnalyticsFromDatabase = async () => {
    if (!user?.id) {
      console.log('⚠️ User ID não encontrado');
      return;
    }
    
    console.log('🔍 Buscando trades para user_id:', user.id, 'Filtro:', analyticsAccountFilter);
    
    try {
      const filterParam = analyticsAccountFilter !== 'all' ? `&account_type=${analyticsAccountFilter}` : '';
      const response = await fetch(`/api/data?action=trading_history&user_id=${user.id}${filterParam}`);
      
      if (response.ok) {
        const data = await response.json();
        const trades = data.trades || [];
        
        if (trades.length > 0) {
          const totalTrades = trades.length;
          const wins = trades.filter((t: any) => t.result === 'WIN').length;
          const losses = totalTrades - wins;
          const winRate = ((wins / totalTrades) * 100).toFixed(1);
          const totalProfit = trades.reduce((sum: number, t: any) => sum + (parseFloat(t.profit) || 0), 0);
          
          const totalEl = document.getElementById('analytics-total-trades');
          const winRateEl = document.getElementById('analytics-win-rate');
          const profitEl = document.getElementById('analytics-profit');
          
          if (totalEl) totalEl.textContent = totalTrades.toString();
          if (winRateEl) winRateEl.textContent = winRate + '%';
          if (profitEl) profitEl.textContent = '$' + totalProfit.toFixed(2);
          
          const historyBody = document.getElementById('analytics-history');
          if (historyBody) {
            historyBody.innerHTML = '';
            
            trades.forEach((trade: any) => {
              const row = document.createElement('tr');
              row.style.borderBottom = '1px solid #334155';
              
              const tradeResult = trade.result || (parseFloat(trade.profit) >= 0 ? 'WIN' : 'LOSS');
              const tradeSignal = trade.trade_signal || trade.trade_type || '-';
              const tradeSymbol = trade.symbol || '-';
              const tradeStake = parseFloat(trade.stake) || 0;
              const tradeProfit = parseFloat(trade.profit) || 0;
              
              const resultColor = tradeResult === 'WIN' ? '#10b981' : '#ef4444';
              const profitColor = tradeProfit >= 0 ? '#10b981' : '#ef4444';
              const signalColor = tradeSignal === 'CALL' ? '#10b981' : '#ef4444';
              
              row.innerHTML = `
                <td class="hidden sm:table-cell" style="padding: 12px 8px; font-size: 0.8rem; color: #f1f5f9;">${new Date(trade.created_at).toLocaleString()}</td>
                <td style="padding: 12px 8px; font-size: 0.8rem; font-weight: 600; color: #f1f5f9;">${tradeSymbol}</td>
                <td style="padding: 12px 8px; font-size: 0.8rem; color: ${signalColor}; font-weight: 600;">${tradeSignal}</td>
                <td class="hidden md:table-cell" style="padding: 12px 8px; font-size: 0.8rem; color: #f1f5f9;">$${tradeStake.toFixed(2)}</td>
                <td style="padding: 12px 8px; font-size: 0.8rem; color: ${resultColor}; font-weight: 600;">${tradeResult}</td>
                <td style="padding: 12px 8px; font-size: 0.8rem; color: ${profitColor}; font-weight: 600;">$${tradeProfit.toFixed(2)}</td>
              `;
              
              historyBody.appendChild(row);
            });
          }
          
          createPerformanceChart(trades, wins, losses);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    }
  };

  // ===== CRIAR GRÁFICO DE PERFORMANCE =====
  const createPerformanceChart = (trades: any[], wins: number, losses: number) => {
    const canvas = document.getElementById('performanceChart') as HTMLCanvasElement;
    if (!canvas || typeof (window as any).Chart === 'undefined') return;
    
    const existingChart = (window as any).performanceChartInstance;
    if (existingChart) {
      existingChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let cumulativeProfit = 0;
    const profitData = trades.reverse().map((trade: any) => {
      cumulativeProfit += parseFloat(trade.profit) || 0;
      return {
        x: new Date(trade.created_at),
        y: cumulativeProfit
      };
    });
    
    const chart = new (window as any).Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Evolução do Lucro',
            data: profitData,
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#60a5fa',
            pointBorderColor: '#1e40af',
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#cbd5e1',
              font: { size: 12, weight: 'bold' }
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'minute',
              displayFormats: {
                minute: 'HH:mm',
                hour: 'HH:mm'
              }
            },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 }
            },
            grid: {
              color: '#334155',
              drawBorder: false
            }
          },
          y: {
            ticks: {
              color: '#cbd5e1',
              font: { size: 11, weight: 'bold' },
              callback: (value: any) => '$' + value.toFixed(2)
            },
            grid: {
              color: '#334155',
              drawBorder: false
            }
          }
        }
      }
    });
    
    (window as any).performanceChartInstance = chart;
  };

  // ===== FUNÇÕES DE CONFIGURAÇÃO =====
  const loadSettings = async () => {
    try {
      console.log('🔍 Carregando configurações...');
      
      if (user?.id) {
        try {
          const response = await fetch(`/api/data?action=settings&user_id=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.settings) {
              console.log('✅ Configurações carregadas do servidor:', data.settings);
              setSettings(prev => ({ ...prev, ...data.settings }));
              return;
            }
          }
        } catch (serverError) {
          console.error('⚠️ Erro ao carregar do servidor:', serverError);
        }
      }
      
      const settingsKey = user?.id ? `mvb_bot_settings_${user.id}` : 'mvb_bot_settings_temp';
      const savedSettings = localStorage.getItem(settingsKey);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        console.log('✅ Configurações carregadas do localStorage:', parsed);
        setSettings(parsed);
      } else {
        console.log('⚠️ Nenhuma configuração encontrada');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const settingsKey = user?.id ? `mvb_bot_settings_${user.id}` : 'mvb_bot_settings_temp';
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      
      if (user?.id) {
        try {
          const response = await fetch('/api/data?action=settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              settings: settings
            }),
          });

          if (response.ok) {
            toast({
              title: "✅ Configurações salvas!",
              description: "Sincronizadas em todos os dispositivos!",
            });
          } else {
            throw new Error('Erro na API');
          }
        } catch (serverError) {
          console.log('⚠️ Servidor indisponível, salvo apenas localmente');
          toast({
            title: "✅ Configurações salvas localmente",
            description: "Sincronização com servidor indisponível no momento.",
          });
        }
      } else {
        toast({
          title: "✅ Configurações salvas!",
          description: "Faça login para sincronizar entre dispositivos.",
        });
      }
    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);
      toast({
        title: "❌ Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    }
  };

  const applyStrategy = (strategyKey: string) => {
    const strategy = STRATEGIES[strategyKey as keyof typeof STRATEGIES];
    if (!strategy) return;
    
    const newSettings = {
      ...settings,
      selectedStrategy: strategyKey,
      stake: strategy.stake,
      autoCloseProfit: strategy.autoCloseProfit,
      autoStopLoss: strategy.autoStopLoss,
      trailingStop: strategy.trailingStop,
      trailingStopPercent: strategy.trailingStopPercent,
      stopWin: strategy.stopWin,
      stopLoss: strategy.stopLoss,
      confidence: strategy.confidence
    };
    setSettings(newSettings);
    
    toast({
      title: `${strategy.name} Ativada!`,
      description: strategy.description,
    });
  };

  const updateSetting = (key: string, value: any) => {
    if (key !== 'selectedStrategy' && settings.selectedStrategy !== 'personalizado') {
      const newSettings = {
        ...settings,
        selectedStrategy: 'personalizado',
        [key]: value
      };
      setSettings(newSettings);
      return;
    }
    
    const newSettings = {
      ...settings,
      [key]: value
    };
    setSettings(newSettings);
    
    const settingsKey = user?.id ? `mvb_bot_settings_${user.id}` : 'mvb_bot_settings_temp';
    localStorage.setItem(settingsKey, JSON.stringify(newSettings));
    
    if (key === 'selectedTokenType') {
      console.log('🔄 Tipo de conta alterado:', value);
    }
  };

  // ===== FUNÇÕES DO TELEGRAM =====
  const sendTelegramNotification = async (message: string) => {
    try {
      if (!telegramSettings.notificationsEnabled || !telegramSettings.userTelegram) {
        return;
      }

      const botToken = telegramSettings.botToken;
      if (!botToken) {
        return;
      }

      const chatId = telegramSettings.userTelegram;
      const isNumeric = /^\d+$/.test(chatId);
      
      if (!isNumeric) {
        return false;
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });

      const data = await response.json();
      return data.ok;
    } catch (error) {
      return false;
    }
  };

  const testTelegramNotification = async () => {
    if (!telegramSettings.userTelegram) {
      toast({
        title: "❌ Chat ID não configurado",
        description: "Por favor, insira seu Chat ID do Telegram",
        variant: "destructive"
      });
      return;
    }

    const isNumeric = /^\d+$/.test(telegramSettings.userTelegram);
    if (!isNumeric) {
      toast({
        title: "❌ Chat ID inválido",
        description: "O Chat ID deve ser apenas números. Siga as instruções para obter o Chat ID correto.",
        variant: "destructive"
      });
      return;
    }

    const success = await sendTelegramNotification(`
🤖 <b>Teste de Notificação - Zeus</b>

✅ Sistema de notificações funcionando perfeitamente!
📊 Agora você receberá atualizações automáticas:
• Bot iniciado/parado
• Sinais detectados
• Resultados de trades
• Alertas importantes

⏰ ${new Date().toLocaleString()}
    `.trim());

    if (success) {
      toast({
        title: "✅ Teste enviado!",
        description: "Verifique seu Telegram para confirmar o recebimento.",
      });
    } else {
      toast({
        title: "❌ Erro no envio",
        description: "Verifique o token do bot e seu username.",
        variant: "destructive"
      });
    }
  };

  const saveTelegramSettings = async () => {
    const settingsToSave = {
      userTelegram: telegramSettings.userTelegram,
      notificationsEnabled: telegramSettings.notificationsEnabled
    };
    localStorage.setItem('telegram_settings', JSON.stringify(settingsToSave));
    
    if (user?.id && telegramSettings.userTelegram) {
      try {
        const response = await fetch('/api/data?action=save_telegram_chat_id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            telegram_chat_id: telegramSettings.userTelegram
          })
        });

        const data = await response.json();
        if (data.success) {
          console.log('✅ Chat ID salvo no banco de dados');
        }
      } catch (error) {
        console.error('❌ Erro ao salvar Chat ID no banco:', error);
      }
    }
    
    toast({
      title: "✅ Configurações do Telegram salvas!",
      description: "Notificações configuradas com sucesso.",
    });
  };

  // ===== FUNÇÕES DE LICENÇA =====
  const generateDeviceId = () => {
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset()
    ];
    return btoa(fingerprint.join('|')).slice(0, 24);
  };

  const validateLicense = () => {
    const key = licenseKey.trim();
    const license = LICENSE_KEYS[key];
    
    if (!license) {
      setLicenseStatus('Licença inválida. Verifique sua chave de acesso.');
      toast({
        title: "Licença inválida",
        description: "Chave de licença não encontrada. Verifique se digitou corretamente.",
        variant: "destructive"
      });
      return;
    }
    
    const currentDeviceId = generateDeviceId();
    setDeviceId(currentDeviceId);
    
    setLicenseInfo(license);
    setIsLicenseValid(true);
    setLicenseStatus('Acesso autorizado com sucesso!');
    
    const sessionData = {
      license,
      deviceId: currentDeviceId,
      expires: Date.now() + (license.days * 24 * 60 * 60 * 1000)
    };
    localStorage.setItem('mvb_session_2025', btoa(JSON.stringify(sessionData)));
    
    toast({
      title: "✅ Acesso liberado!",
      description: `Tipo: ${license.type.toUpperCase()}`,
    });
  };

  // ===== INICIALIZAR BOT ORIGINAL =====
  const initializeOriginalBot = () => {
    console.log('🤖 Iniciando initializeOriginalBot...');
    console.log('📦 botContainerRef.current:', botContainerRef.current);
    
    if (!botContainerRef.current) {
      console.error('❌ Container do bot não encontrado!');
      // Tentar encontrar o container pelo ID
      const containerById = document.getElementById('bot-container');
      console.log('🔍 Container por ID:', containerById);
      if (containerById) {
        botContainerRef.current = containerById as HTMLDivElement;
        console.log('✅ Container encontrado por ID, atualizando ref');
      } else {
        console.error('❌ Container não encontrado nem por ID!');
        return;
      }
    }

    console.log('🤖 Inicializando bot original...');
    
    // Limpar container antes de inserir novo conteúdo
    botContainerRef.current.innerHTML = '';

    botContainerRef.current.innerHTML = `
      <div class="bot-interface-original" style="background: #0f172a; border-radius: 8px; padding: 8px; border: 1px solid #334155;">
        <!-- Controles Principais -->
        <div class="main-controls" style="background: #1e293b; border-radius: 8px; padding: 12px; margin: 8px 0; border: 1px solid #334155;">
          <div class="control-grid" style="display: grid; gap: 12px;">
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #f1f5f9; font-size: 0.9rem;">🔑 Conta Deriv:</label>
              <div style="display: flex; gap: 8px;">
                <select 
                  id="accountType" 
                  onchange="loadTokenByAccountType()"
                  style="flex: 1; padding: 14px; border: 2px solid #334155; border-radius: 12px; font-size: 16px; background: #0f172a; color: #e2e8f0;"
                >
                  <option value="demo">🎮 Conta DEMO</option>
                  <option value="real">💰 Conta REAL</option>
                </select>
                <input 
                  type="text" 
                  id="token" 
                  placeholder="Token será carregado automaticamente..." 
                  readonly
                  style="flex: 2; padding: 14px; border: 2px solid #334155; border-radius: 12px; font-size: 16px; background: #1e293b; color: #94a3b8;"
                />
                <button 
                  onclick="(window as any).reloadSettings().then(() => (window as any).loadTokenByAccountType())" 
                  style="padding: 14px 12px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3); transition: transform 0.2s;"
                  onmouseover="this.style.transform='scale(1.02)'" 
                  onmouseout="this.style.transform='scale(1)'"
                >
                  🔄
                </button>
              </div>
            </div>
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #f1f5f9; font-size: 0.9rem;">📈 Símbolo:</label>
              <select id="symbol" style="width: 100%; padding: 14px; border: 2px solid #334155; border-radius: 12px; font-size: 16px; background: #0f172a; color: #e2e8f0;">
                <optgroup label="🎲 ÍNDICES VOLÁTEIS">
                  <option value="R_10">Volatility 10 Index</option>
                  <option value="R_25">Volatility 25 Index</option>
                  <option value="R_50">Volatility 50 Index</option>
                  <option value="R_75">Volatility 75 Index</option>
                  <option value="R_100">Volatility 100 Index</option>
                </optgroup>
                <optgroup label="📉 CRASH INDICES">
                  <option value="CRASH300N">Crash 300 Index</option>
                  <option value="CRASH500N">Crash 500 Index</option>
                  <option value="CRASH1000N">Crash 1000 Index</option>
                </optgroup>
                <optgroup label="📈 BOOM INDICES">
                  <option value="BOOM300N">Boom 300 Index</option>
                  <option value="BOOM500N">Boom 500 Index</option>
                  <option value="BOOM1000N">Boom 1000 Index</option>
                </optgroup>
                <optgroup label="🪜 STEP INDICES">
                  <option value="stpRNG">Step Index</option>
                </optgroup>
                <optgroup label="🎯 JUMP INDICES">
                  <option value="JD10">Jump 10 Index</option>
                  <option value="JD25">Jump 25 Index</option>
                  <option value="JD50">Jump 50 Index</option>
                  <option value="JD75">Jump 75 Index</option>
                  <option value="JD100">Jump 100 Index</option>
                </optgroup>
              </select>
            </div>
          </div>

          <!-- Botões de Controle -->
          <div class="button-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px;">
            <button 
              onclick="startBot()" 
              ${!isLicenseValid ? 'disabled' : ''}
              style="background: ${isLicenseValid ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#6b7280'}; color: white; border: none; padding: 10px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: ${isLicenseValid ? 'pointer' : 'not-allowed'}; box-shadow: 0 2px 6px ${isLicenseValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(107, 114, 128, 0.3)'}; transition: transform 0.2s; opacity: ${isLicenseValid ? '1' : '0.5'}; width: 100%; min-height: 40px;" 
              onmouseover="if(this.style.cursor==='pointer') this.style.transform='scale(1.02)'" 
              onmouseout="if(this.style.cursor==='pointer') this.style.transform='scale(1)'"
            >
              🚀 Iniciar
            </button>
            <button 
              onclick="stopBot()" 
              style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; padding: 10px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3); transition: transform 0.2s; width: 100%; min-height: 40px;" 
              onmouseover="this.style.transform='scale(1.02)'" 
              onmouseout="this.style.transform='scale(1)'"
            >
              ⏸️ Parar
            </button>
          </div>
        </div>

        <!-- Gráfico Profissional -->
        <div style="background: #1e293b; border: 1px solid #475569; border-radius: 8px; padding: 8px; margin: 8px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
            <h3 style="color: #f1f5f9; margin: 0; font-size: 0.9rem; font-weight: 600;">📈 Gráfico</h3>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <select id="chartType" style="padding: 4px 8px; border-radius: 4px; background: #0f172a; color: #e2e8f0; border: 1px solid #475569; font-size: 0.75rem;">
                <option value="candlestick">Velas</option>
                <option value="line">Linha</option>
              </select>
              <select id="chartTimeframe" style="padding: 4px 8px; border-radius: 4px; background: #0f172a; color: #e2e8f0; border: 1px solid #475569; font-size: 0.75rem;">
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1h">1h</option>
                <option value="4h">4h</option>
                <option value="1d">1d</option>
              </select>
            </div>
          </div>
          <div style="position: relative; width: 100%; height: 250px; overflow: hidden;">
            <canvas id="priceChart" style="display: block; width: 100%; height: 250px; background: #0f172a; border: 1px solid #475569; border-radius: 6px;"></canvas>
          </div>
        </div>

        <!-- Status e Logs -->
        <div class="status-section" style="background: #1e293b; border-radius: 8px; padding: 12px; margin: 8px 0; border: 1px solid #334155;">
          <div class="status-header" style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
            <div class="status-indicator" id="status-indicator" style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444;"></div>
            <h3 style="margin: 0; font-size: 0.9rem; font-weight: 600; color: #f1f5f9;">Status</h3>
          </div>
          <div id="status" style="color: #94a3b8; font-size: 0.8rem; min-height: 16px; line-height: 1.3;">⏸️ Bot Parado</div>
        </div>

        <!-- Logs de Operações -->
        <div class="logs-section" style="background: #1e293b; border-radius: 8px; padding: 12px; margin: 8px 0; border: 1px solid #334155;">
          <h3 style="margin: 0 0 8px 0; font-size: 0.9rem; font-weight: 600; color: #f1f5f9;">📋 Logs</h3>
          <div id="logs" style="max-height: 120px; overflow-y: auto; font-size: 0.75rem; color: #cbd5e1; line-height: 1.3;">
            <div style="padding: 2px 0; color: #94a3b8;">Aguardando início das operações...</div>
          </div>
        </div>
      </div>
    `;

    // Inicializar gráfico profissional
    setTimeout(() => {
      try {
        console.log('📊 Inicializando gráfico profissional...');
        initializeProfessionalChart();
        
        // Adicionar event listeners para controles do gráfico
        const chartTypeSelect = document.getElementById('chartType') as HTMLSelectElement;
        const chartTimeframeSelect = document.getElementById('chartTimeframe') as HTMLSelectElement;
        
        if (chartTypeSelect) {
          chartTypeSelect.value = chartConfig.type;
          chartTypeSelect.addEventListener('change', (e) => {
            changeChartType((e.target as HTMLSelectElement).value as 'candlestick' | 'line');
          });
          console.log('📈 Seletor de tipo de gráfico configurado');
        }
        
        if (chartTimeframeSelect) {
          chartTimeframeSelect.value = chartConfig.timeframe;
          chartTimeframeSelect.addEventListener('change', (e) => {
            changeChartTimeframe((e.target as HTMLSelectElement).value as '1m' | '5m' | '15m' | '1h' | '4h' | '1d');
          });
          console.log('⏰ Seletor de timeframe configurado');
        }
        
        console.log('✅ Gráfico profissional inicializado com sucesso!');
        
        // Carregar token automaticamente
        setTimeout(() => {
          const accountTypeSelect = document.getElementById('accountType') as HTMLSelectElement;
          if (accountTypeSelect) {
            accountTypeSelect.value = settings.selectedTokenType || 'demo';
            (window as any).loadTokenByAccountType();
            console.log('🔑 Token carregado automaticamente:', settings.selectedTokenType || 'demo');
          }
        }, 100);
        
      } catch (error) {
        console.error('❌ Erro ao inicializar gráfico:', error);
      }
    }, 200);

    console.log('🤖 Bot original inicializado com gráfico profissional');
    
    // Adicionar indicador visual de sucesso
    const successIndicator = document.createElement('div');
    successIndicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    `;
    successIndicator.textContent = '✅ Bot Inicializado';
    document.body.appendChild(successIndicator);
    
    // Remover indicador após 3 segundos
    setTimeout(() => {
      if (successIndicator.parentNode) {
        successIndicator.parentNode.removeChild(successIndicator);
      }
    }, 3000);
    
    isInitialized.current = true;
  };

  // ===== EFFECTS PRINCIPAIS =====
  useEffect(() => {
    const loadUserLicenses = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://mvb-bot-pro.vercel.app/api';
        const response = await fetch(`${API_BASE_URL}/data?action=licenses&user_id=${user.id}`);
        
        if (!response.ok) {
          throw new Error('Erro ao carregar licenças');
        }
        
        const data = await response.json();
        const licenses = data.licenses || [];
        setUserLicenses(licenses);
        
        const latestLicense = licenses.find(license => license.is_active);
        
        if (latestLicense) {
          const now = new Date();
          const isLicenseValid = new Date(latestLicense.expires_at) > now;
          
          if (isLicenseValid) {
            const activeLicense = latestLicense;
            const isFreeLicense = activeLicense.license_type === 'free';
            const minutesRemaining = isFreeLicense 
              ? activeLicense.days_remaining
              : Math.floor((new Date(activeLicense.expires_at).getTime() - Date.now()) / (1000 * 60));
            const daysRemaining = Math.ceil((new Date(activeLicense.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            
            const licenseInfo: LicenseInfo = {
              type: activeLicense.license_type,
              days: isFreeLicense ? Math.ceil(minutesRemaining / (60 * 24)) : daysRemaining,
              features: activeLicense.license_type === 'free' ? ['limited_features'] : ['all_features'],
              maxDevices: activeLicense.max_devices
            };
          
            setLicenseInfo(licenseInfo);
            setLicenseKey(activeLicense.license_key);
            setIsLicenseValid(true);
            
            const timeDisplay = isFreeLicense 
              ? `${minutesRemaining} minuto(s)` 
              : minutesRemaining < 60 
                ? `${minutesRemaining} minuto(s)` 
                : `${daysRemaining} dia(s)`;
            
            setLicenseStatus(`Licença válida! Expira em ${timeDisplay}.`);
          
            toast({
              title: "✅ Acesso liberado!",
              description: `Bem-vindo ao Zeus, ${user.name}! Licença expira em ${timeDisplay}.`,
            });
          } else {
            setIsLicenseValid(false);
            setLicenseStatus(`Licença expirada. Tipo: ${latestLicense.license_type}. Renove para continuar.`);
            
            toast({
              title: "⚠️ Licença Expirada",
              description: `Sua licença ${latestLicense.license_type} expirou. Renove para continuar usando o bot.`,
              variant: "destructive"
            });
          }
        } else {
          setIsLicenseValid(false);
          setLicenseStatus('Nenhuma licença encontrada. Por favor, solicite uma licença.');
          
          toast({
            title: "❌ Sem Licença",
            description: "Você não possui uma licença ativa. Solicite uma licença para usar o bot.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Erro ao carregar licenças:', error);
        setLicenseStatus('Erro ao carregar licenças do usuário.');
      } finally {
        setLoading(false);
      }
    };

    loadUserLicenses();
    
    const licenseCheckInterval = setInterval(() => {
      if (!loading) {
        loadUserLicenses();
      }
    }, 60000);
    
    return () => clearInterval(licenseCheckInterval);
  }, [isAuthenticated, user, toast]);

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user?.id]);

  useEffect(() => {
    const loadBotToken = async () => {
      try {
        const response = await fetch('/api/telegram-config');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.botToken) {
            setTelegramSettings(prev => ({
              ...prev,
              botToken: data.botToken
            }));
            setBotTokenLoaded(true);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar token do Telegram:', error);
      }
    };

    loadBotToken();
  }, []);

  useEffect(() => {
    const savedTelegramSettings = localStorage.getItem('telegram_settings');
    if (savedTelegramSettings) {
      const parsed = JSON.parse(savedTelegramSettings);
      setTelegramSettings(prev => ({
        ...prev,
        userTelegram: parsed.userTelegram || '',
        notificationsEnabled: parsed.notificationsEnabled || false
      }));
    }
  }, []);

  useEffect(() => {
    if (!isLicenseValid) {
      const stopBotButton = document.querySelector('button[onclick="stopBot()"]') as HTMLButtonElement;
      if (stopBotButton) {
        stopBotButton.click();
      }
      
      if ((window as any).stopBot) {
        (window as any).stopBot();
      }
      
      toast({
        title: "🔒 Licença Expirada",
        description: "O bot foi parado automaticamente. Renove sua licença para continuar.",
        variant: "destructive",
        duration: 5000,
      });
    }
    
    (window as any).isLicenseValid = isLicenseValid;
  }, [isLicenseValid, toast]);

  useEffect(() => {
    (window as any).showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
      try {
        if (toast) {
          toast({
            title: title,
            description: description,
            variant: variant,
            duration: 3000,
          });
          return;
        }
      } catch (error) {}

      try {
        if (variant === 'destructive') {
          sonnerToast.error(title, {
            description: description,
            duration: 3000,
          });
        } else {
          sonnerToast.success(title, {
            description: description,
            duration: 3000,
          });
        }
        return;
      } catch (error) {}

      alert(`${title}: ${description}`);
    };

    (window as any).testToast = () => {
      (window as any).showToast('Teste Toast', 'Se você está vendo isso, o sistema está funcionando!', 'default');
    };

    (window as any).sendTelegramNotification = sendTelegramNotification;

    // Exportar funções do gráfico para o bot usar
    (window as any).updateChartWithCandle = updateChartWithCandle;
    (window as any).processTickToCandle = processTickToCandle;
    (window as any).addTradeMarker = addTradeMarker;
    (window as any).updateEMAsOnChart = updateEMAsOnChart;
    (window as any).startMarketPreview = startMarketPreview;
    
    // Função para recarregar configurações
    (window as any).reloadSettings = async () => {
      console.log('🔄 Recarregando configurações...');
      await loadSettings();
      console.log('✅ Configurações recarregadas');
    };
    
    // Função para carregar token por tipo de conta
    (window as any).loadTokenByAccountType = () => {
      const accountTypeSelect = document.getElementById('accountType') as HTMLSelectElement;
      const tokenInput = document.getElementById('token') as HTMLInputElement;
      
      if (!accountTypeSelect || !tokenInput) {
        console.error('❌ Elementos não encontrados:', { accountTypeSelect, tokenInput });
        return;
      }
      
      const accountType = accountTypeSelect.value;
      console.log('🔍 Carregando token para:', accountType);
      console.log('📊 Settings atuais:', {
        selectedTokenType: settings.selectedTokenType,
        derivTokenDemo: settings.derivTokenDemo ? 'Configurado' : 'Não configurado',
        derivTokenReal: settings.derivTokenReal ? 'Configurado' : 'Não configurado'
      });
      
      const tokenValue = accountType === 'demo' ? settings.derivTokenDemo : settings.derivTokenReal;
      
      if (tokenValue && tokenValue.trim() !== '') {
        tokenInput.value = tokenValue;
        tokenInput.style.background = '#0f172a';
        tokenInput.style.color = '#e2e8f0';
        console.log('✅ Token carregado com sucesso:', accountType, 'Length:', tokenValue.length);
        (window as any).showToast('✅ Token Carregado', `Token ${accountType.toUpperCase()} carregado com sucesso!`);
      } else {
        tokenInput.value = 'Token não configurado';
        tokenInput.style.background = '#7f1d1d';
        tokenInput.style.color = '#fca5a5';
        console.log('⚠️ Token não encontrado para:', accountType);
        console.log('🔍 Token value:', tokenValue);
        (window as any).showToast('⚠️ Token Não Encontrado', `Configure o token ${accountType.toUpperCase()} na aba Configurações!`);
      }
    };
    
    // Exportar funções do bot para o escopo global
    (window as any).startBot = () => {
      console.log('🚀 Iniciando bot...');
      
      // Verificar se já está rodando
      if ((window as any).botRunning) {
        console.log('⚠️ Bot já está rodando!');
        return;
      }
      
      // Verificar configurações
      const symbol = (document.getElementById('symbol') as HTMLSelectElement)?.value;
      const token = (document.getElementById('token') as HTMLInputElement)?.value;
      
      if (!symbol) {
        console.error('❌ Símbolo não selecionado!');
        (window as any).showToast('❌ Erro', 'Selecione um símbolo para operar!');
        return;
      }
      
      if (!token) {
        console.error('❌ Token não configurado!');
        (window as any).showToast('❌ Erro', 'Configure o token da Deriv na aba Configurações!');
        return;
      }
      
      // Iniciar bot real
      (window as any).botRunning = true;
      (window as any).botStartTime = Date.now();
      
      // Atualizar status
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.innerHTML = '🟢 Bot Operando - Aguardando sinais...';
      }
      
      // Atualizar indicador
      const indicator = document.getElementById('status-indicator');
      if (indicator) {
        indicator.style.background = '#10b981';
      }
      
      // Iniciar preview do mercado
      startMarketPreview();
      
      console.log('✅ Bot iniciado com sucesso!');
      (window as any).showToast('🚀 Bot Iniciado', 'Sistema de trading ativado com sucesso!');
    };
    
    (window as any).stopBot = () => {
      console.log('⏸️ Parando bot...');
      
      // Parar bot
      (window as any).botRunning = false;
      
      // Parar WebSocket
      if ((window as any).marketPreviewWS) {
        (window as any).marketPreviewWS.close();
        (window as any).marketPreviewWS = null;
      }
      
      // Atualizar status
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.innerHTML = '⏸️ Bot Parado';
      }
      
      // Atualizar indicador
      const indicator = document.getElementById('status-indicator');
      if (indicator) {
        indicator.style.background = '#ef4444';
      }
      
      console.log('✅ Bot parado com sucesso!');
      (window as any).showToast('⏸️ Bot Parado', 'Sistema de trading parado com sucesso!');
    };

    return () => {
      delete (window as any).showToast;
      delete (window as any).testToast;
      delete (window as any).sendTelegramNotification;
      delete (window as any).updateChartWithCandle;
      delete (window as any).processTickToCandle;
      delete (window as any).addTradeMarker;
      delete (window as any).updateEMAsOnChart;
      delete (window as any).startBot;
      delete (window as any).stopBot;
    };
  }, [toast]);

  // Inicializar bot quando licença for válida
  useEffect(() => {
    if (isLicenseValid && botContainerRef.current && !isInitialized.current) {
      initializeOriginalBot();
    }
  }, [isLicenseValid]);

  // Re-inicializar bot quando voltar para aba trading
  useEffect(() => {
    if (activeTab === 'trading' && isLicenseValid) {
      console.log('🔄 Aba trading ativada - forçando re-inicialização...');
      
      // Forçar re-inicialização sempre
      setTimeout(() => {
        if (botContainerRef.current) {
          console.log('📦 Container encontrado, inicializando bot...');
          initializeOriginalBot();
          
          // Carregar token automaticamente após inicialização
          setTimeout(() => {
            const accountTypeSelect = document.getElementById('accountType') as HTMLSelectElement;
            if (accountTypeSelect) {
              accountTypeSelect.value = settings.selectedTokenType || 'demo';
              console.log('🔑 Tentando carregar token automaticamente...');
              console.log('📊 Settings disponíveis:', {
                selectedTokenType: settings.selectedTokenType,
                derivTokenDemo: settings.derivTokenDemo ? 'Configurado' : 'Não configurado',
                derivTokenReal: settings.derivTokenReal ? 'Configurado' : 'Não configurado'
              });
              (window as any).loadTokenByAccountType();
            }
          }, 500);
        } else {
          console.error('❌ Container do bot não encontrado!');
          // Mostrar fallback
          const fallback = document.getElementById('bot-fallback');
          if (fallback) {
            fallback.classList.remove('hidden');
            console.log('🔄 Mostrando fallback de re-inicialização');
          }
        }
      }, 200);
    }
  }, [activeTab, isLicenseValid]);

  // Atualizar gráfico quando configurações mudarem
  useEffect(() => {
    if (isLicenseValid && activeTab === 'trading') {
      const chart = (window as any).priceChartInstance;
      if (chart) {
        updateEMAsOnChart();
      }
    }
  }, [settings.emaFast, settings.emaSlow, isLicenseValid, activeTab]);

  // ===== RENDERIZAÇÃO =====
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  if (!isLicenseValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">Acesso Restrito</CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              {licenseStatus || 'Licença necessária para acessar o sistema'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="license-key" className="text-slate-300">
                Chave de Licença
              </Label>
              <Input
                id="license-key"
                type="text"
                placeholder="Digite sua chave de licença"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <Button 
              onClick={validateLicense} 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Key className="w-4 h-4 mr-2" />
              Validar Licença
            </Button>
            
            {userLicenses.length > 0 && (
              <div className="mt-6 p-4 bg-slate-700 rounded-lg">
                <h4 className="text-white font-semibold mb-2">Suas Licenças:</h4>
                <div className="space-y-2">
                  {userLicenses.map((license, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-slate-600 rounded">
                      <span className="text-slate-200 text-sm">{license.license_key}</span>
                      <Badge variant={license.is_active ? "default" : "secondary"}>
                        {license.is_active ? "Ativa" : "Expirada"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Zeus - Bot de Trading</h1>
              <p className="text-slate-400">Sistema automatizado profissional</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {licenseInfo && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                {licenseInfo.type.toUpperCase()} - {licenseInfo.days} dias
              </Badge>
            )}
            {user && (
              <div className="text-right">
                <p className="text-white font-medium">{user.name}</p>
                <p className="text-slate-400 text-sm">{user.email}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs Principal */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800 p-1 rounded-lg">
          <TabsTrigger 
            value="trading" 
            className="flex items-center space-x-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <Play className="w-4 h-4" />
            <span>Trading</span>
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="flex items-center space-x-2 data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="flex items-center space-x-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            <Settings className="w-4 h-4" />
            <span>Configurações</span>
          </TabsTrigger>
          <TabsTrigger 
            value="telegram" 
            className="flex items-center space-x-2 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
          >
            <Bell className="w-4 h-4" />
            <span>Telegram</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB TRADING */}
        <TabsContent value="trading" className="space-y-4">
          {/* Alertas de Licença */}
          {licenseInfo && licenseInfo.type === 'free' && (
            <Alert className="bg-amber-500/20 border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <AlertDescription className="text-amber-200">
                Licença FREE ativa. Atualize para PRO para recursos completos.
              </AlertDescription>
            </Alert>
          )}


          {/* Layout Responsivo Melhorado */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Coluna Esquerda - Estratégias e Configurações */}
            <div className="lg:w-1/3 space-y-4">
              {/* Estratégias Pré-configuradas */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Estratégias
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Selecione uma estratégia pré-configurada
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(STRATEGIES).map(([key, strategy]) => (
                    <Button
                      key={key}
                      variant={settings.selectedStrategy === key ? "default" : "outline"}
                      className={`w-full justify-start h-auto py-3 ${
                        settings.selectedStrategy === key 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                      }`}
                      onClick={() => applyStrategy(key)}
                    >
                      <div className="text-left">
                        <div className="font-semibold">{strategy.name}</div>
                        <div className="text-xs opacity-80">{strategy.description}</div>
                      </div>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Gestão de Capital */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Gestão de Capital
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="moneyManagement" className="text-slate-300">
                      Sistema de Gestão
                    </Label>
                    <Select 
                      value={settings.moneyManagement} 
                      onValueChange={(value) => updateSetting('moneyManagement', value)}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Selecione o sistema" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600 text-white">
                        {Object.entries(MONEY_MANAGEMENT).map(([key, system]) => (
                          <SelectItem key={key} value={key}>
                            <div>
                              <div className="font-medium">{system.name}</div>
                              <div className="text-xs text-slate-400">{system.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stake" className="text-slate-300">
                      Valor da Aposta: ${settings.stake.toFixed(2)}
                    </Label>
                    <Input
                      id="stake"
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={settings.stake}
                      onChange={(e) => updateSetting('stake', parseFloat(e.target.value))}
                      className="bg-slate-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="martingale" className="text-slate-300">
                      Multiplicador Martingale: {settings.martingale}x
                    </Label>
                    <Input
                      id="martingale"
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={settings.martingale}
                      onChange={(e) => updateSetting('martingale', parseFloat(e.target.value))}
                      className="bg-slate-700"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita - Bot Principal */}
            <div className="lg:w-2/3">
              <Card className="bg-slate-800 border-slate-700 h-full">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Painel de Controle do Bot
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Controle principal do sistema automatizado
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2">
                  <div ref={botContainerRef} id="bot-container" className="w-full">
                    {/* Loading placeholder */}
                    {!isLicenseValid && (
                      <div className="flex items-center justify-center h-48 bg-slate-700 rounded-lg">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                          <p className="text-slate-300 text-sm">Carregando sistema...</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Fallback se o bot não carregar */}
                    {isLicenseValid && (
                      <div id="bot-fallback" className="hidden">
                        <div className="bg-slate-700 rounded-lg p-4 text-center">
                          <p className="text-slate-300 mb-4">Bot não carregado automaticamente</p>
                          <button 
                            onClick={() => {
                              console.log('🔄 Tentando re-inicializar bot...');
                              initializeOriginalBot();
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            🔄 Re-inicializar Bot
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB ANALYTICS */}
        <TabsContent value="analytics">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Analytics & Performance
              </CardTitle>
              <CardDescription className="text-slate-400">
                Estatísticas detalhadas e histórico de trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex space-x-4 mb-6">
                <Button
                  variant={analyticsAccountFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setAnalyticsAccountFilter('all')}
                  className="bg-slate-700 border-slate-600 text-white"
                >
                  Todas as Contas
                </Button>
                <Button
                  variant={analyticsAccountFilter === 'demo' ? 'default' : 'outline'}
                  onClick={() => setAnalyticsAccountFilter('demo')}
                  className="bg-slate-700 border-slate-600 text-white"
                >
                  Conta Demo
                </Button>
                <Button
                  variant={analyticsAccountFilter === 'real' ? 'default' : 'outline'}
                  onClick={() => setAnalyticsAccountFilter('real')}
                  className="bg-slate-700 border-slate-600 text-white"
                >
                  Conta Real
                </Button>
              </div>

              {/* Métricas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white" id="analytics-total-trades">0</div>
                  <div className="text-slate-400 text-sm">Total de Trades</div>
                </div>
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400" id="analytics-win-rate">0%</div>
                  <div className="text-slate-400 text-sm">Win Rate</div>
                </div>
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400" id="analytics-profit">$0.00</div>
                  <div className="text-slate-400 text-sm">Lucro Total</div>
                </div>
              </div>

              {/* Gráfico de Performance */}
              <div className="bg-slate-700 rounded-lg p-4 mb-6">
                <h3 className="text-white font-semibold mb-4">Evolução do Lucro</h3>
                <div className="h-64">
                  <canvas id="performanceChart"></canvas>
                </div>
              </div>

              {/* Histórico de Trades */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-4">Histórico de Trades</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '2px solid #334155' }}>
                        <th className="text-left text-slate-400 font-semibold p-2 hidden sm:table-cell">Data/Hora</th>
                        <th className="text-left text-slate-400 font-semibold p-2">Ativo</th>
                        <th className="text-left text-slate-400 font-semibold p-2">Direção</th>
                        <th className="text-left text-slate-400 font-semibold p-2 hidden md:table-cell">Stake</th>
                        <th className="text-left text-slate-400 font-semibold p-2">Resultado</th>
                        <th className="text-left text-slate-400 font-semibold p-2">Lucro</th>
                      </tr>
                    </thead>
                    <tbody id="analytics-history">
                      {/* Trades serão inseridos aqui via JavaScript */}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB CONFIGURAÇÕES */}
        <TabsContent value="settings">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Configurações do Bot
              </CardTitle>
              <CardDescription className="text-slate-400">
                Configure os parâmetros do sistema de trading
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tokens Deriv */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">🔐 Tokens de Acesso</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="selectedTokenType" className="text-slate-300">
                      Tipo de Conta
                    </Label>
                    <Select 
                      value={settings.selectedTokenType} 
                      onValueChange={(value) => updateSetting('selectedTokenType', value)}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600 text-white">
                        <SelectItem value="demo">Conta Demo</SelectItem>
                        <SelectItem value="real">Conta Real</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="derivTokenDemo" className="text-slate-300">
                      Token Deriv (Demo)
                    </Label>
                    <Input
                      id="derivTokenDemo"
                      type="password"
                      placeholder="Cole seu token da conta demo"
                      value={settings.derivTokenDemo}
                      onChange={(e) => updateSetting('derivTokenDemo', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="derivTokenReal" className="text-slate-300">
                      Token Deriv (Real)
                    </Label>
                    <Input
                      id="derivTokenReal"
                      type="password"
                      placeholder="Cole seu token da conta real"
                      value={settings.derivTokenReal}
                      onChange={(e) => updateSetting('derivTokenReal', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                {/* Configurações de Trading */}
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">⚙️ Parâmetros de Trading</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stopWin" className="text-slate-300">
                        Stop Win: ${settings.stopWin}
                      </Label>
                      <Input
                        id="stopWin"
                        type="number"
                        value={settings.stopWin}
                        onChange={(e) => updateSetting('stopWin', parseFloat(e.target.value))}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stopLoss" className="text-slate-300">
                        Stop Loss: ${settings.stopLoss}
                      </Label>
                      <Input
                        id="stopLoss"
                        type="number"
                        value={settings.stopLoss}
                        onChange={(e) => updateSetting('stopLoss', parseFloat(e.target.value))}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confidence" className="text-slate-300">
                      Confiança Mínima: {settings.confidence}%
                    </Label>
                    <Input
                      id="confidence"
                      type="range"
                      min="50"
                      max="95"
                      value={settings.confidence}
                      onChange={(e) => updateSetting('confidence', parseInt(e.target.value))}
                      className="bg-slate-700"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="trailingStop"
                      checked={settings.trailingStop}
                      onChange={(e) => updateSetting('trailingStop', e.target.checked)}
                      className="rounded bg-slate-700 border-slate-600 text-blue-500"
                    />
                    <Label htmlFor="trailingStop" className="text-slate-300">
                      Trailing Stop Ativo
                    </Label>
                  </div>

                  {settings.trailingStop && (
                    <div className="space-y-2">
                      <Label htmlFor="trailingStopPercent" className="text-slate-300">
                        Trailing Stop: {settings.trailingStopPercent}%
                      </Label>
                      <Input
                        id="trailingStopPercent"
                        type="range"
                        min="5"
                        max="20"
                        value={settings.trailingStopPercent}
                        onChange={(e) => updateSetting('trailingStopPercent', parseInt(e.target.value))}
                        className="bg-slate-700"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Botão Salvar */}
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={saveSettings}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB TELEGRAM */}
        <TabsContent value="telegram">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notificações Telegram
              </CardTitle>
              <CardDescription className="text-slate-400">
                Configure as notificações automáticas no Telegram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-white font-semibold">🤖 Configurações do Bot</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="userTelegram" className="text-slate-300">
                      Seu Chat ID do Telegram
                    </Label>
                    <Input
                      id="userTelegram"
                      type="text"
                      placeholder="Ex: 123456789"
                      value={telegramSettings.userTelegram}
                      onChange={(e) => setTelegramSettings(prev => ({
                        ...prev,
                        userTelegram: e.target.value
                      }))}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <p className="text-xs text-slate-400">
                      Para obter seu Chat ID, converse com @userinfobot no Telegram
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="notificationsEnabled"
                      checked={telegramSettings.notificationsEnabled}
                      onChange={(e) => setTelegramSettings(prev => ({
                        ...prev,
                        notificationsEnabled: e.target.checked
                      }))}
                      className="rounded bg-slate-700 border-slate-600 text-blue-500"
                    />
                    <Label htmlFor="notificationsEnabled" className="text-slate-300">
                      Ativar notificações automáticas
                    </Label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-white font-semibold">📋 Informações</h3>
                  <div className="bg-slate-700 rounded-lg p-4">
                    <p className="text-slate-300 text-sm mb-3">
                      <strong>Recursos das notificações:</strong>
                    </p>
                    <ul className="text-slate-400 text-sm space-y-2">
                      <li>✅ Bot iniciado/parado</li>
                      <li>✅ Sinais detectados</li>
                      <li>✅ Resultados de trades</li>
                      <li>✅ Alertas importantes</li>
                      <li>✅ Estatísticas diárias</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex space-x-4 pt-4">
                <Button 
                  onClick={testTelegramNotification}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Testar Notificação
                </Button>
                
                <Button 
                  onClick={saveTelegramSettings}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Salvar Configurações
                </Button>
              </div>

              {botTokenLoaded && (
                <Alert className="bg-green-500/20 border-green-500/30">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <AlertDescription className="text-green-200">
                    Bot Token carregado com sucesso! Sistema de notificações pronto.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Toaster para notificações */}
      <ReactToaster />
    </div>
  );
}