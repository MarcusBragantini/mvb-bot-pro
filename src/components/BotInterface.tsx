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
  HelpCircle,
  Settings,
  Bot,
  BarChart3,
  Smartphone,
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  Bell,
  Download,
  Upload,
  RotateCcw
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

interface TradingSettings {
  stake: number;
  martingale: number;
  duration: number;
  stopWin: number;
  stopLoss: number;
  confidence: number;
  strategy: string;
  derivTokenDemo: string;
  derivTokenReal: string;
  selectedTokenType: 'demo' | 'real';
  selectedSymbol: string; // NOVO: Símbolo selecionado
  mhiPeriods: number;
  emaFast: number;
  emaSlow: number;
  rsiPeriods: number;
  autoCloseTime: number;
  autoCloseProfit: number;
  minConfidence: number;
  maxRiskPerTrade: number;
  useStopLoss: boolean;
  useTakeProfit: boolean;
  tradingHours: {
  start: string;
  end: string;
}

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
  { value: 'BOOM1000N', label: '📈 Boom 1000', category: 'Boom' },
  { value: 'stpRNG', label: '🪜 Step Index', category: 'Step' },
  { value: 'JD10', label: '🎯 Jump 10', category: 'Jump' },
  { value: 'JD25', label: '🎯 Jump 25', category: 'Jump' },
  { value: 'JD50', label: '🎯 Jump 50', category: 'Jump' },
  { value: 'JD75', label: '🎯 Jump 75', category: 'Jump' },
  { value: 'JD100', label: '🎯 Jump 100', category: 'Jump' }
];

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
  const [chartData, setChartData] = useState<any[]>([]);
  const [realTimePrices, setRealTimePrices] = useState<number[]>([]);
  const [priceHistory, setPriceHistory] = useState<{timestamp: number, price: number}[]>([]);
  const [isBotRunning, setIsBotRunning] = useState(false);

  // ===== REFS =====
  const botContainerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const priceChartRef = useRef<any>(null);
  const performanceChartRef = useRef<any>(null);
  const chartIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ===== ESTADOS DAS CONFIGURAÇÕES =====
  const [settings, setSettings] = useState<TradingSettings>({
    stake: 1,
    martingale: 2,
    duration: 15,
    stopWin: 3,
    stopLoss: -5,
    confidence: 30,
    strategy: 'martingale',
    derivTokenDemo: '',
    derivTokenReal: '',
    selectedTokenType: 'demo',
    selectedSymbol: 'R_10', // NOVO: Símbolo selecionado
    mhiPeriods: 5,
    emaFast: 8,
    emaSlow: 18,
    rsiPeriods: 10,
    autoCloseTime: 30,
    autoCloseProfit: 20,
    minConfidence: 30,
    maxRiskPerTrade: 10,
    useStopLoss: true,
    useTakeProfit: true,
    tradingHours: {
      start: '09:00',
      end: '18:00'
    }
  });

  // ===== ESTADOS DO TELEGRAM =====
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    botToken: '',
    userTelegram: '',
    notificationsEnabled: false
  });
  const [botTokenLoaded, setBotTokenLoaded] = useState(false);

  // ===== FUNÇÕES UTILITÁRIAS =====
  const checkBotRunning = () => {
    // Usar apenas o estado React para consistência
    return isBotRunning;
  };

  const handleTabChange = (newTab: string) => {
    if (activeTab === 'trading' && newTab !== 'trading' && checkBotRunning()) {
      toast({
        title: "⚠️ Bot em Execução!",
        description: "O bot continua rodando em segundo plano.",
        duration: 4000,
      });
    }
    setActiveTab(newTab);
    
    if (newTab === 'analytics' && user?.id) {
      loadAnalyticsFromDatabase();
    }
  };

  // ===== CONEXÃO COM DERIV API =====
  const connectToDerivAPI = () => {
    console.log('🔌 Conectando à Deriv API...');
    
    const token = settings.selectedTokenType === 'demo' ? settings.derivTokenDemo : settings.derivTokenReal;
    if (!token) {
      console.error('❌ Token não configurado');
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
      
      // Autorizar com token
      ws.send(JSON.stringify({
        authorize: token
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.authorize) {
        console.log('✅ Autorizado na Deriv API');
        
        // Subscrever a ticks do símbolo selecionado
        ws.send(JSON.stringify({
          ticks: settings.selectedSymbol
        }));
      }
      
      if (data.tick) {
        const tick = data.tick;
        
        // Atualizar gráfico com dados reais
        updateRealTimeChart(parseFloat(tick.quote));
        
        // Verificar estado atual do bot (não usar closure)
        const currentBotState = (window as any).botRunningState || false;
        console.log(`🔍 Estado do bot: ${currentBotState}`);
        
        if (currentBotState) {
          console.log(`🤖 Bot rodando - Analisando tick: $${tick.quote}`);
          analyzeAndExecuteTrade(parseFloat(tick.quote));
        } else {
          console.log(`⏸️ Bot parado - Tick ignorado: $${tick.quote}`);
        }
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Erro na conexão Deriv:', error);
    };

    ws.onclose = () => {
      console.log('🔌 Conexão Deriv fechada');
    };

    // Salvar referência para fechar depois
    (window as any).derivWS = ws;
  };

  // ===== SISTEMA DE GRAFICO EM TEMPO REAL CORRIGIDO =====
  const initializeRealTimeChart = () => {
    console.log('🚀 Iniciando gráfico em tempo real...');
    
    if (typeof window === 'undefined' || !(window as any).Chart) {
      console.log('❌ Chart.js não carregado');
      return;
    }
    console.log('✅ Chart.js carregado');

    const canvas = document.getElementById('realTimeChart') as HTMLCanvasElement;
    if (!canvas) {
      console.log('❌ Canvas não encontrado');
      return;
    }
    console.log('✅ Canvas encontrado:', canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('❌ Contexto do canvas não disponível');
      return;
    }
    console.log('✅ Contexto do canvas disponível');

    // Destruir gráfico existente
    if (priceChartRef.current) {
      priceChartRef.current.destroy();
      priceChartRef.current = null;
    }

    // Limpar intervalo anterior
    if (chartIntervalRef.current) {
      clearInterval(chartIntervalRef.current);
      chartIntervalRef.current = null;
    }

    try {
      console.log('📊 Criando gráfico...');
      // Criar gráfico simples sem escala realtime
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
            pointBackgroundColor: '#3b82f6',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 0
          },
          plugins: {
            legend: {
              display: true,
              labels: {
                color: '#cbd5e1',
                font: {
                  size: 12
                }
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              titleColor: '#f1f5f9',
              bodyColor: '#cbd5e1',
              borderColor: '#334155',
              borderWidth: 1
            }
          },
          scales: {
            x: {
              type: 'linear',
              grid: {
                color: '#334155',
                drawBorder: false
              },
              ticks: {
                color: '#94a3b8',
                maxTicksLimit: 10,
                callback: function(value: any) {
                  return `T${Math.floor(value)}`;
                }
              }
            },
            y: {
              grid: {
                color: '#334155',
                drawBorder: false
              },
              // Configurar escala Y para mostrar oscilações
              ticks: {
                color: '#94a3b8',
                callback: (value: any) => `$${parseFloat(value).toFixed(4)}`
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      });

      console.log('✅ Gráfico criado com sucesso!');
    } catch (error) {
      console.error('Erro ao inicializar gráfico:', error);
    }
  };

  const updateRealTimeChart = (price: number) => {
    if (!priceChartRef.current) {
      console.log('❌ Gráfico não inicializado');
      return;
    }

    try {
      const now = new Date();
      const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      // Adicionar novo ponto no formato correto para Chart.js
      const currentData = priceChartRef.current.data.datasets[0].data;
      const currentLabels = priceChartRef.current.data.labels;

      // Adicionar ponto no formato {x, y}
      currentData.push({
        x: currentData.length,
        y: price
      });
      currentLabels.push(timeLabel);

      // Manter apenas os últimos 30 pontos para melhor performance e evitar sobreposição
      const maxPoints = 30;
      if (currentData.length > maxPoints) {
        // Remover pontos antigos
        currentData.splice(0, currentData.length - maxPoints);
        currentLabels.splice(0, currentLabels.length - maxPoints);
        
        // Reindexar os pontos X para evitar problemas de escala
        currentData.forEach((point: any, index: number) => {
          point.x = index;
        });
      }

      // Forçar atualização do gráfico
      priceChartRef.current.update('none');
    } catch (error) {
      console.error('❌ Erro ao atualizar gráfico:', error);
    }
  };

  // ===== SISTEMA DE ESTRATÉGIAS AVANÇADAS =====
  interface TechnicalAnalysis {
    signal: 'CALL' | 'PUT' | 'HOLD';
    confidence: number;
    reason: string;
    indicators: {
      mhi: { signal: string; confidence: number };
      ema: { signal: string; confidence: number };
      rsi: { signal: string; confidence: number };
      trend: { signal: string; confidence: number };
    };
  }

  // ===== SISTEMA DE ESTRATÉGIAS PROFISSIONAIS =====
  interface StrategyResult {
    signal: 'CALL' | 'PUT' | 'HOLD';
    confidence: number;
    reason: string;
    strategy: string;
  }

  // ===== ESTRATÉGIA MARTINGALE INTELIGENTE =====
  const smartMartingaleStrategy = (prices: number[]): StrategyResult => {
    if (prices.length < 10) {
      return {
        signal: 'HOLD',
        confidence: 0,
        reason: 'Dados insuficientes',
        strategy: 'martingale'
      };
    }

    const recentPrices = prices.slice(-20);
    const currentPrice = recentPrices[recentPrices.length - 1];
    
    // Análise de tendência de curto prazo
    const shortTerm = recentPrices.slice(-5);
    const shortTermTrend = shortTerm[shortTerm.length - 1] - shortTerm[0];
    
    // Análise de tendência de médio prazo
    const mediumTerm = recentPrices.slice(-15);
    const mediumTermTrend = mediumTerm[mediumTerm.length - 1] - mediumTerm[0];
    
    // Cálculo de volatilidade
    const volatilities = [];
    for (let i = 1; i < recentPrices.length; i++) {
      volatilities.push(Math.abs(recentPrices[i] - recentPrices[i - 1]));
    }
    const avgVolatility = volatilities.reduce((a, b) => a + b, 0) / volatilities.length;
    const currentVolatility = Math.abs(recentPrices[recentPrices.length - 1] - recentPrices[recentPrices.length - 2]);
    
    // Identificar padrões de reversão
    const isHighVolatility = currentVolatility > avgVolatility * 1.5;
    const isOversold = shortTermTrend < -avgVolatility * 2;
    const isOverbought = shortTermTrend > avgVolatility * 2;
    
    let signal: 'CALL' | 'PUT' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reason = '';
    
    if (isHighVolatility && isOversold && mediumTermTrend > 0) {
      signal = 'CALL';
      confidence = Math.min(85, 60 + (currentVolatility / avgVolatility) * 15);
      reason = `Reversão de alta detectada - Volatilidade: ${(currentVolatility / avgVolatility).toFixed(2)}x`;
    } else if (isHighVolatility && isOverbought && mediumTermTrend < 0) {
      signal = 'PUT';
      confidence = Math.min(85, 60 + (currentVolatility / avgVolatility) * 15);
      reason = `Reversão de baixa detectada - Volatilidade: ${(currentVolatility / avgVolatility).toFixed(2)}x`;
    } else if (mediumTermTrend > avgVolatility * 3) {
      signal = 'CALL';
      confidence = Math.min(75, 50 + Math.abs(mediumTermTrend) * 100);
      reason = `Tendência de alta forte - Força: ${(mediumTermTrend / avgVolatility).toFixed(2)}x`;
    } else if (mediumTermTrend < -avgVolatility * 3) {
      signal = 'PUT';
      confidence = Math.min(75, 50 + Math.abs(mediumTermTrend) * 100);
      reason = `Tendência de baixa forte - Força: ${(Math.abs(mediumTermTrend) / avgVolatility).toFixed(2)}x`;
    }
    
    return { signal, confidence, reason, strategy: 'martingale' };
  };

  // ===== ESTRATÉGIA MHI AVANÇADO =====
  const advancedMHIStrategy = (prices: number[]): StrategyResult => {
    if (prices.length < settings.mhiPeriods) {
      return {
        signal: 'HOLD',
        confidence: 0,
        reason: 'Dados insuficientes para MHI',
        strategy: 'mhi'
      };
    }

    const periods = settings.mhiPeriods;
    const recentPrices = prices.slice(-periods);
    const currentPrice = recentPrices[recentPrices.length - 1];
    
    // Análise de padrões de candlestick (simplificada)
    const patterns = [];
    for (let i = 1; i < recentPrices.length - 1; i++) {
      const prev = recentPrices[i - 1];
      const current = recentPrices[i];
      const next = recentPrices[i + 1];
      
      // Padrão de martelo (reversão de baixa)
      if (current < prev && next > current && (next - current) > (current - prev) * 0.5) {
        patterns.push('HAMMER');
      }
      // Padrão de estrela cadente (reversão de alta)
      else if (current > prev && next < current && (current - next) > (current - prev) * 0.5) {
        patterns.push('SHOOTING_STAR');
      }
    }
    
    // Análise de força relativa
    const firstHalf = recentPrices.slice(0, Math.floor(periods / 2));
    const secondHalf = recentPrices.slice(Math.floor(periods / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const strength = (secondAvg - firstAvg) / firstAvg;
    
    // Contagem de padrões
    const hammerCount = patterns.filter(p => p === 'HAMMER').length;
    const shootingStarCount = patterns.filter(p => p === 'SHOOTING_STAR').length;
    
    let signal: 'CALL' | 'PUT' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reason = '';
    
    if (hammerCount >= 2 && strength > 0.001) {
      signal = 'CALL';
      confidence = Math.min(80, 50 + hammerCount * 10 + Math.abs(strength) * 10000);
      reason = `Padrão MHI de alta - ${hammerCount} martelos detectados`;
    } else if (shootingStarCount >= 2 && strength < -0.001) {
      signal = 'PUT';
      confidence = Math.min(80, 50 + shootingStarCount * 10 + Math.abs(strength) * 10000);
      reason = `Padrão MHI de baixa - ${shootingStarCount} estrelas cadentes`;
    } else if (Math.abs(strength) > 0.005) {
      signal = strength > 0 ? 'CALL' : 'PUT';
      confidence = Math.min(70, 40 + Math.abs(strength) * 8000);
      reason = `Tendência MHI ${strength > 0 ? 'alta' : 'baixa'} - Força: ${(Math.abs(strength) * 100).toFixed(2)}%`;
    }
    
    return { signal, confidence, reason, strategy: 'mhi' };
  };

  // ===== ESTRATÉGIA EMA CROSSOVER AVANÇADO =====
  const advancedEMAStrategy = (prices: number[]): StrategyResult => {
    const emaFastPeriod = settings.emaFast;
    const emaSlowPeriod = settings.emaSlow;
    
    if (prices.length < Math.max(emaFastPeriod, emaSlowPeriod) + 5) {
      return {
        signal: 'HOLD',
        confidence: 0,
        reason: 'Dados insuficientes para EMA',
        strategy: 'ema'
      };
    }

    // Calcular EMAs
    const calculateEMA = (data: number[], period: number): number[] => {
      const emas: number[] = [];
      const multiplier = 2 / (period + 1);
      
      // EMA inicial (SMA)
      let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
      emas.push(ema);
      
      // Calcular EMA subsequente
      for (let i = period; i < data.length; i++) {
        ema = (data[i] * multiplier) + (ema * (1 - multiplier));
        emas.push(ema);
      }
      
      return emas;
    };

    const emaFast = calculateEMA(prices, emaFastPeriod);
    const emaSlow = calculateEMA(prices, emaSlowPeriod);
    
    const currentFast = emaFast[emaFast.length - 1];
    const currentSlow = emaSlow[emaSlow.length - 1];
    const previousFast = emaFast[emaFast.length - 2];
    const previousSlow = emaSlow[emaSlow.length - 2];
    const currentPrice = prices[prices.length - 1];
    
    // Detectar crossover
    const fastAboveSlow = currentFast > currentSlow;
    const previousFastAboveSlow = previousFast > previousSlow;
    const crossover = fastAboveSlow !== previousFastAboveSlow;
    
    // Força do sinal
    const gap = Math.abs(currentFast - currentSlow) / currentSlow;
    const priceAboveFast = currentPrice > currentFast;
    const priceAboveSlow = currentPrice > currentSlow;
    
    let signal: 'CALL' | 'PUT' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reason = '';
    
    if (crossover && fastAboveSlow && priceAboveFast) {
      signal = 'CALL';
      confidence = Math.min(90, 60 + gap * 500);
      reason = `Bullish EMA Crossover - Gap: ${(gap * 100).toFixed(2)}%`;
    } else if (crossover && !fastAboveSlow && !priceAboveFast) {
      signal = 'PUT';
      confidence = Math.min(90, 60 + gap * 500);
      reason = `Bearish EMA Crossover - Gap: ${(gap * 100).toFixed(2)}%`;
    } else if (fastAboveSlow && priceAboveFast && gap > 0.001) {
      signal = 'CALL';
      confidence = Math.min(75, 45 + gap * 300);
      reason = `Tendência de alta EMA - Gap: ${(gap * 100).toFixed(2)}%`;
    } else if (!fastAboveSlow && !priceAboveFast && gap > 0.001) {
      signal = 'PUT';
      confidence = Math.min(75, 45 + gap * 300);
      reason = `Tendência de baixa EMA - Gap: ${(gap * 100).toFixed(2)}%`;
    }
    
    return { signal, confidence, reason, strategy: 'ema' };
  };

  // ===== ESTRATÉGIA RSI AVANÇADO =====
  const advancedRSIStrategy = (prices: number[]): StrategyResult => {
    const rsiPeriods = settings.rsiPeriods;
    
    if (prices.length < rsiPeriods + 10) {
      return {
        signal: 'HOLD',
        confidence: 0,
        reason: 'Dados insuficientes para RSI',
        strategy: 'rsi'
      };
    }

    // Calcular RSI
    const calculateRSI = (data: number[], period: number): number[] => {
      const rsis: number[] = [];
      
      for (let i = period; i < data.length; i++) {
        const segment = data.slice(i - period, i + 1);
        let gains = 0;
        let losses = 0;
        
        for (let j = 1; j < segment.length; j++) {
          const change = segment[j] - segment[j - 1];
          if (change > 0) gains += change;
          else losses += Math.abs(change);
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgGain / (avgLoss || 0.0001);
        const rsi = 100 - (100 / (1 + rs));
        rsis.push(rsi);
      }
      
      return rsis;
    };

    const rsiValues = calculateRSI(prices, rsiPeriods);
    const currentRSI = rsiValues[rsiValues.length - 1];
    const previousRSI = rsiValues[rsiValues.length - 2];
    
    // Análise de divergência
    const recentPrices = prices.slice(-rsiPeriods);
    const priceTrend = recentPrices[recentPrices.length - 1] - recentPrices[0];
    const rsiTrend = currentRSI - rsiValues[0];
    
    // Detectar divergências
    const bullishDivergence = priceTrend < 0 && rsiTrend > 5;
    const bearishDivergence = priceTrend > 0 && rsiTrend < -5;
    
    let signal: 'CALL' | 'PUT' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reason = '';
    
    if (currentRSI < 30 && bullishDivergence) {
      signal = 'CALL';
      confidence = Math.min(85, 50 + (30 - currentRSI) * 2 + 15);
      reason = `RSI Oversold + Divergência de alta - RSI: ${currentRSI.toFixed(1)}`;
    } else if (currentRSI > 70 && bearishDivergence) {
      signal = 'PUT';
      confidence = Math.min(85, 50 + (currentRSI - 70) * 2 + 15);
      reason = `RSI Overbought + Divergência de baixa - RSI: ${currentRSI.toFixed(1)}`;
    } else if (currentRSI < 25) {
      signal = 'CALL';
      confidence = Math.min(80, 40 + (30 - currentRSI) * 2);
      reason = `RSI Extremamente Oversold - RSI: ${currentRSI.toFixed(1)}`;
    } else if (currentRSI > 75) {
      signal = 'PUT';
      confidence = Math.min(80, 40 + (currentRSI - 70) * 2);
      reason = `RSI Extremamente Overbought - RSI: ${currentRSI.toFixed(1)}`;
    } else if (currentRSI < 35 && previousRSI < 30) {
      signal = 'CALL';
      confidence = Math.min(70, 35 + (35 - currentRSI));
      reason = `Recuperação de oversold - RSI: ${currentRSI.toFixed(1)}`;
    } else if (currentRSI > 65 && previousRSI > 70) {
      signal = 'PUT';
      confidence = Math.min(70, 35 + (currentRSI - 65));
      reason = `Recuo de overbought - RSI: ${currentRSI.toFixed(1)}`;
    }
    
    return { signal, confidence, reason, strategy: 'rsi' };
  };

  // ===== SISTEMA DE FUSÃO DE ESTRATÉGIAS =====
  const fuseStrategies = (strategies: StrategyResult[]): StrategyResult => {
    const validStrategies = strategies.filter(s => s.signal !== 'HOLD' && s.confidence >= 30);
    
    if (validStrategies.length === 0) {
      return {
        signal: 'HOLD',
        confidence: 0,
        reason: 'Nenhuma estratégia gerou sinal válido',
        strategy: 'consensus'
      };
    }
    
    // Agrupar por sinal
    const callStrategies = validStrategies.filter(s => s.signal === 'CALL');
    const putStrategies = validStrategies.filter(s => s.signal === 'PUT');
    
    // Calcular confiança média ponderada
    const totalConfidence = validStrategies.reduce((sum, s) => sum + s.confidence, 0);
    const callWeight = callStrategies.reduce((sum, s) => sum + s.confidence, 0) / totalConfidence;
    const putWeight = putStrategies.reduce((sum, s) => sum + s.confidence, 0) / totalConfidence;
    
    // Tomar decisão baseada no consenso
    let signal: 'CALL' | 'PUT' | 'HOLD' = 'HOLD';
    let confidence = 0;
    let reason = '';
    
    if (callWeight > 0.6 && callStrategies.length >= 2) {
      signal = 'CALL';
      confidence = Math.min(90, callStrategies.reduce((sum, s) => sum + s.confidence, 0) / callStrategies.length);
      reason = `Consenso de CALL (${callStrategies.length}/4 estratégias) - ${callStrategies.map(s => s.strategy).join(', ')}`;
    } else if (putWeight > 0.6 && putStrategies.length >= 2) {
      signal = 'PUT';
      confidence = Math.min(90, putStrategies.reduce((sum, s) => sum + s.confidence, 0) / putStrategies.length);
      reason = `Consenso de PUT (${putStrategies.length}/4 estratégias) - ${putStrategies.map(s => s.strategy).join(', ')}`;
    } else if (callWeight > putWeight && callStrategies.length > 0) {
      signal = 'CALL';
      confidence = callStrategies.reduce((sum, s) => sum + s.confidence, 0) / callStrategies.length * 0.8;
      reason = `Tendência CALL fraca (${callStrategies.length}/4) - ${callStrategies.map(s => s.strategy).join(', ')}`;
    } else if (putWeight > callWeight && putStrategies.length > 0) {
      signal = 'PUT';
      confidence = putStrategies.reduce((sum, s) => sum + s.confidence, 0) / putStrategies.length * 0.8;
      reason = `Tendência PUT fraca (${putStrategies.length}/4) - ${putStrategies.map(s => s.strategy).join(', ')}`;
    }
    
    return { signal, confidence, reason, strategy: 'consensus' };
  };

  // ===== ANÁLISE TÉCNICA COMPLETA ATUALIZADA =====
  const performTechnicalAnalysis = (currentPrice: number): TechnicalAnalysis => {
    console.log(`🔧 Configurações atuais:`, {
      strategy: settings.strategy,
      confidence: settings.confidence,
      mhiPeriods: settings.mhiPeriods
    });
    
    if (!priceChartRef.current || priceChartRef.current.data.datasets[0].data.length < 10) {
      return {
        signal: 'HOLD',
        confidence: 0,
        reason: 'Dados insuficientes para análise',
        indicators: {
          mhi: { signal: 'HOLD', confidence: 0 },
          ema: { signal: 'HOLD', confidence: 0 },
          rsi: { signal: 'HOLD', confidence: 0 },
          trend: { signal: 'HOLD', confidence: 0 }
        }
      };
    }

    const prices = priceChartRef.current.data.datasets[0].data.map((point: any) => point.y);
    
    // Executar todas as estratégias
    const martingaleResult = smartMartingaleStrategy(prices);
    const mhiResult = advancedMHIStrategy(prices);
    const emaResult = advancedEMAStrategy(prices);
    const rsiResult = advancedRSIStrategy(prices);
    
    console.log('📊 Resultados das estratégias:', {
      martingale: martingaleResult,
      mhi: mhiResult,
      ema: emaResult,
      rsi: rsiResult
    });
    
    let finalResult: StrategyResult;
    
    // Selecionar estratégia baseada na configuração
    switch (settings.strategy) {
      case 'martingale':
        finalResult = fuseStrategies([martingaleResult, mhiResult, emaResult, rsiResult]);
        break;
      case 'mhi':
        finalResult = mhiResult;
        break;
      case 'ema':
        finalResult = emaResult;
        break;
      case 'rsi':
        finalResult = rsiResult;
        break;
      default:
        finalResult = fuseStrategies([martingaleResult, mhiResult, emaResult, rsiResult]);
    }
    
    // Aplicar filtro de confiança mínima
    if (finalResult.confidence < settings.confidence) {
      finalResult = {
        signal: 'HOLD',
        confidence: finalResult.confidence,
        reason: `${finalResult.reason} (Confiança ${finalResult.confidence.toFixed(1)}% < ${settings.confidence}%)`,
        strategy: finalResult.strategy
      };
    }
    
    return {
      signal: finalResult.signal,
      confidence: finalResult.confidence,
      reason: finalResult.reason,
      indicators: {
        mhi: { 
          signal: mhiResult.signal, 
          confidence: mhiResult.confidence 
        },
        ema: { 
          signal: emaResult.signal, 
          confidence: emaResult.confidence 
        },
        rsi: { 
          signal: rsiResult.signal, 
          confidence: rsiResult.confidence 
        },
        trend: { 
          signal: martingaleResult.signal, 
          confidence: martingaleResult.confidence 
        }
      }
    };
  };

  // ===== ATUALIZAR INDICADORES VISUAIS =====
  const updateTechnicalIndicators = (analysis: TechnicalAnalysis) => {
    // Atualizar indicadores individuais
    const updateIndicator = (id: string, signal: string, confidence: number) => {
      const indicatorEl = document.getElementById(id);
      const confidenceEl = document.getElementById(`${id}-confidence`);
      
      if (indicatorEl && confidenceEl) {
        let color = 'text-gray-400';
        let symbol = '-';
        
        switch (signal) {
          case 'CALL':
            color = 'text-green-400';
            symbol = '📈';
            break;
          case 'PUT':
            color = 'text-red-400';
            symbol = '📉';
            break;
          case 'HOLD':
            color = 'text-yellow-400';
            symbol = '⏸️';
            break;
        }
        
        indicatorEl.textContent = symbol;
        indicatorEl.className = `text-lg font-bold ${color}`;
        confidenceEl.textContent = `${confidence.toFixed(1)}%`;
      }
    };
    
    // Atualizar cada indicador
    updateIndicator('mhi-indicator', analysis.indicators.mhi.signal, analysis.indicators.mhi.confidence);
    updateIndicator('ema-indicator', analysis.indicators.ema.signal, analysis.indicators.ema.confidence);
    updateIndicator('rsi-indicator', analysis.indicators.rsi.signal, analysis.indicators.rsi.confidence);
    updateIndicator('trend-indicator', analysis.indicators.trend.signal, analysis.indicators.trend.confidence);
    
    // Atualizar sinal atual
    const currentSignalEl = document.getElementById('current-signal');
    const currentConfidenceEl = document.getElementById('current-confidence');
    const signalReasonEl = document.getElementById('signal-reason');
    
    if (currentSignalEl && currentConfidenceEl && signalReasonEl) {
      let signalColor = 'text-gray-400';
      let signalSymbol = '⏸️';
      
      switch (analysis.signal) {
        case 'CALL':
          signalColor = 'text-green-400';
          signalSymbol = '📈 CALL';
          break;
        case 'PUT':
          signalColor = 'text-red-400';
          signalSymbol = '📉 PUT';
          break;
        case 'HOLD':
          signalColor = 'text-yellow-400';
          signalSymbol = '⏸️ HOLD';
          break;
      }
      
      currentSignalEl.textContent = signalSymbol;
      currentSignalEl.className = `text-xl font-bold ${signalColor}`;
      currentConfidenceEl.textContent = `${analysis.confidence.toFixed(1)}%`;
      signalReasonEl.textContent = analysis.reason;
    }
  };

  // ===== ANÁLISE E EXECUÇÃO DE TRADES MELHORADA =====
  const analyzeAndExecuteTrade = (currentPrice: number) => {
    console.log(`🔍 Iniciando análise técnica para preço: $${currentPrice.toFixed(4)}`);
    
    const analysis = performTechnicalAnalysis(currentPrice);
    
    // Atualizar indicadores visuais
    updateTechnicalIndicators(analysis);
    
    console.log(`🔍 Análise Técnica:`, {
      preço: currentPrice.toFixed(4),
      sinal: analysis.signal,
      confiança: analysis.confidence.toFixed(1),
      razão: analysis.reason,
      indicadores: analysis.indicators,
      dados_disponíveis: priceChartRef.current?.data.datasets[0].data.length || 0
    });
    
    // Verificar gestão de risco antes de executar trade
    const riskCheck = checkRiskManagement();
    if (!riskCheck.canTrade) {
      console.log(`⚠️ Trade bloqueado por gestão de risco: ${riskCheck.reason}`);
      
      // Atualizar interface com status de risco
      const signalReasonEl = document.getElementById('signal-reason');
      if (signalReasonEl) {
        signalReasonEl.textContent = `⚠️ ${riskCheck.reason}`;
        signalReasonEl.className = 'mt-2 text-xs text-red-500';
      }
      
      return;
    }
    
    // Executar trade apenas se sinal for válido, confiança suficiente e gestão de risco OK
    if (analysis.signal !== 'HOLD' && analysis.confidence >= settings.confidence) {
      executeTrade(analysis.signal, currentPrice, analysis);
    }
  };

  // ===== SISTEMA DE GESTÃO DE RISCO AVANÇADO =====
  interface TradeResult {
    id: string;
    signal: 'CALL' | 'PUT';
    entryPrice: number;
    exitPrice: number;
    result: 'WIN' | 'LOSS';
    profit: number;
    confidence: number;
    strategy: string;
    timestamp: Date;
    analysis: TechnicalAnalysis;
  }

  interface RiskManagement {
    maxDailyLoss: number;
    maxConsecutiveLosses: number;
    currentDailyLoss: number;
    consecutiveLosses: number;
    lastTradeTime: Date | null;
    cooldownPeriod: number; // em minutos
    isInCooldown: boolean;
  }

  // ===== ESTADO DE GESTÃO DE RISCO =====
  const [riskManagement, setRiskManagement] = useState<RiskManagement>({
    maxDailyLoss: 50, // Máximo de perda diária
    maxConsecutiveLosses: 3, // Máximo de perdas consecutivas
    currentDailyLoss: 0,
    consecutiveLosses: 0,
    lastTradeTime: null,
    cooldownPeriod: 5, // 5 minutos de cooldown após perdas
    isInCooldown: false
  });

  // ===== VERIFICAR GESTÃO DE RISCO =====
  const checkRiskManagement = (): { canTrade: boolean; reason: string } => {
    const now = new Date();
    
    // Verificar cooldown
    if (riskManagement.isInCooldown && riskManagement.lastTradeTime) {
      const timeSinceLastTrade = (now.getTime() - riskManagement.lastTradeTime.getTime()) / (1000 * 60);
      if (timeSinceLastTrade < riskManagement.cooldownPeriod) {
        return {
          canTrade: false,
          reason: `Cooldown ativo. Aguarde ${Math.ceil(riskManagement.cooldownPeriod - timeSinceLastTrade)} minutos.`
        };
      } else {
        setRiskManagement(prev => ({ ...prev, isInCooldown: false }));
      }
    }
    
    // Verificar perda diária máxima
    if (riskManagement.currentDailyLoss >= riskManagement.maxDailyLoss) {
      return {
        canTrade: false,
        reason: `Perda diária máxima atingida ($${riskManagement.maxDailyLoss}). Trading pausado.`
      };
    }
    
    // Verificar perdas consecutivas
    if (riskManagement.consecutiveLosses >= riskManagement.maxConsecutiveLosses) {
      return {
        canTrade: false,
        reason: `Muitas perdas consecutivas (${riskManagement.consecutiveLosses}). Cooldown ativado.`
      };
    }
    
    return { canTrade: true, reason: 'Todas as verificações de risco passaram.' };
  };

  // ===== ATUALIZAR GESTÃO DE RISCO APÓS TRADE =====
  const updateRiskManagement = (tradeResult: TradeResult) => {
    const now = new Date();
    const isLoss = tradeResult.result === 'LOSS';
    
    setRiskManagement(prev => {
      const newState = { ...prev };
      
      // Atualizar perda diária
      if (isLoss) {
        newState.currentDailyLoss += Math.abs(tradeResult.profit);
        newState.consecutiveLosses += 1;
        
        // Ativar cooldown se muitas perdas consecutivas
        if (newState.consecutiveLosses >= newState.maxConsecutiveLosses) {
          newState.isInCooldown = true;
        }
      } else {
        // Reset perdas consecutivas em caso de ganho
        newState.consecutiveLosses = 0;
        newState.isInCooldown = false;
      }
      
      newState.lastTradeTime = now;
      return newState;
    });
    
    // Reset diário (simplificado - em produção seria baseado em data real)
    const shouldResetDaily = now.getHours() === 0 && now.getMinutes() === 0;
    if (shouldResetDaily) {
      setRiskManagement(prev => ({
        ...prev,
        currentDailyLoss: 0,
        consecutiveLosses: 0,
        isInCooldown: false
      }));
    }
  };

  const executeTrade = (signal: 'CALL' | 'PUT', price: number, analysis: TechnicalAnalysis) => {
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🚀 Executando trade REAL: ${signal} a $${price.toFixed(4)}`);
    console.log(`📊 Análise: ${analysis.reason}`);
    console.log(`🎯 Confiança: ${analysis.confidence.toFixed(1)}%`);
    
    // Calcular stake baseado na confiança e gestão de risco
    const confidenceMultiplier = Math.min(1.5, analysis.confidence / 100);
    const adjustedStake = settings.stake * confidenceMultiplier;
    
    // Verificar se temos conexão com Deriv
    const derivWS = (window as any).derivWS;
    if (!derivWS || derivWS.readyState !== WebSocket.OPEN) {
      console.error('❌ Conexão Deriv não disponível');
      toast({
        title: "❌ Erro de Conexão",
        description: "Conexão com Deriv não disponível. Trade não executado.",
        variant: "destructive"
      });
      return;
    }
    
    // Executar trade REAL na Deriv API
    const buyRequest = {
      buy: tradeId,
      price: adjustedStake,
      parameters: {
        contract_type: signal === 'CALL' ? 'CALL' : 'PUT',
        symbol: settings.selectedSymbol,
        amount: adjustedStake,
        duration: settings.duration,
        duration_unit: 's',
        basis: 'stake'
      }
    };
    
    console.log('📤 Enviando trade para Deriv API:', buyRequest);
    
    derivWS.send(JSON.stringify(buyRequest));
    
    // Aguardar resposta da Deriv
    const originalOnMessage = derivWS.onmessage;
    derivWS.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      
      // Processar resposta do trade
      if (data.buy) {
        const buyResponse = data.buy;
        
        if (buyResponse.error) {
          console.error('❌ Erro no trade Deriv:', buyResponse.error);
          toast({
            title: "❌ Erro no Trade",
            description: `Erro: ${buyResponse.error.message}`,
            variant: "destructive"
          });
          
          // Restaurar handler original
          derivWS.onmessage = originalOnMessage;
          return;
        }
        
        if (buyResponse.contract_id) {
          console.log('✅ Trade executado na Deriv:', buyResponse.contract_id);
          
          // Aguardar resultado do trade
          setTimeout(() => {
            // Verificar resultado REAL do trade na Deriv
            const contractId = buyResponse.contract_id;
            
            // Solicitar informações do contrato
            const contractRequest = {
              contract: contractId
            };
            
            console.log('🔍 Verificando resultado do trade:', contractId);
            derivWS.send(JSON.stringify(contractRequest));
            
            // Handler temporário para verificar resultado
            const checkResultHandler = (event: MessageEvent) => {
              const data = JSON.parse(event.data);
              
              if (data.contract) {
                const contract = data.contract;
                console.log('📊 Resultado do contrato:', contract);
                
                // Determinar resultado baseado no status do contrato
                let result: 'WIN' | 'LOSS' = 'LOSS';
                let profit = -adjustedStake;
                
                if (contract.status === 'sold' && contract.sell_price) {
                  const sellPrice = parseFloat(contract.sell_price);
                  const buyPrice = parseFloat(contract.buy_price);
                  const profitAmount = sellPrice - buyPrice;
                  
                  if (profitAmount > 0) {
                    result = 'WIN';
                    profit = profitAmount;
                  } else {
                    result = 'LOSS';
                    profit = profitAmount;
                  }
                } else if (contract.status === 'won') {
                  result = 'WIN';
                  profit = adjustedStake * 0.8; // Aproximação
                } else if (contract.status === 'lost') {
                  result = 'LOSS';
                  profit = -adjustedStake;
                }
                
                // Criar resultado do trade
                const tradeResult: TradeResult = {
                  id: tradeId,
                  signal,
                  entryPrice: price,
                  exitPrice: price + (Math.random() - 0.5) * 0.01,
                  result,
                  profit,
                  confidence: analysis.confidence,
                  strategy: settings.strategy,
                  timestamp: new Date(),
                  analysis
                };
                
                console.log(`💰 Trade ${result}: ${signal} - Lucro: $${profit.toFixed(2)}`);
                
                // Atualizar interface com resultado
                const tradeEmoji = result === 'WIN' ? '🎉' : '😞';
                const profitEmoji = profit > 0 ? '💰' : '💸';
                
                toast({
                  title: `${tradeEmoji} Trade ${result}`,
                  description: `${signal} - ${profitEmoji} $${profit.toFixed(2)} | 🎯 ${analysis.confidence.toFixed(1)}% | 📊 ${settings.strategy.toUpperCase()}`,
                  variant: result === 'WIN' ? "default" : "destructive",
                  duration: 7000
                });
                
                // Salvar trade no banco de dados
                saveTradeToDatabase(tradeResult);
                
                // Atualizar estatísticas em tempo real
                updateTradingStats(tradeResult);
                
                // Atualizar gestão de risco
                updateRiskManagement(tradeResult);
                
                // Restaurar handler original
                derivWS.onmessage = originalOnMessage;
                
                // Remover handler temporário
                derivWS.removeEventListener('message', checkResultHandler);
              }
            };
            
            // Adicionar handler temporário
            derivWS.addEventListener('message', checkResultHandler);
            
            // Timeout de segurança
            setTimeout(() => {
              derivWS.removeEventListener('message', checkResultHandler);
              derivWS.onmessage = originalOnMessage;
            }, (settings.duration + 5) * 1000);
            
          }, settings.duration * 1000);
        }
      } else {
        // Processar outros tipos de mensagem
        if (originalOnMessage) {
          originalOnMessage(event);
        }
      }
    };
  };

  // ===== SALVAR TRADE NO BANCO DE DADOS =====
  const saveTradeToDatabase = async (tradeResult: TradeResult) => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/data?action=save_trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          symbol: settings.selectedSymbol,
          trade_signal: tradeResult.signal,
          stake: settings.stake,
          result: tradeResult.result,
          profit: tradeResult.profit,
          confidence: tradeResult.confidence,
          account_type: settings.selectedTokenType
        })
      });
      
      if (response.ok) {
        console.log('✅ Trade salvo no banco de dados');
      } else {
        const errorData = await response.json();
        console.error('❌ Erro ao salvar trade:', errorData);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar trade:', error);
    }
  };

  // ===== ATUALIZAR ESTATÍSTICAS EM TEMPO REAL =====
  const updateTradingStats = (tradeResult: TradeResult) => {
    // Atualizar elementos da interface
    const profitElement = document.querySelector('[data-stat="profit"]');
    const tradesElement = document.querySelector('[data-stat="trades"]');
    const winRateElement = document.querySelector('[data-stat="winrate"]');
    
    if (profitElement) {
      const currentProfit = parseFloat(profitElement.textContent?.replace('$', '') || '0');
      const newProfit = currentProfit + tradeResult.profit;
      profitElement.textContent = `$${newProfit.toFixed(2)}`;
      
      // Adicionar animação visual para mudanças de lucro
      if (tradeResult.profit > 0) {
        profitElement.className = 'text-2xl font-bold text-green-400 animate-pulse';
        setTimeout(() => {
          profitElement.className = 'text-2xl font-bold text-white';
        }, 2000);
      } else {
        profitElement.className = 'text-2xl font-bold text-red-400 animate-pulse';
        setTimeout(() => {
          profitElement.className = 'text-2xl font-bold text-white';
        }, 2000);
      }
    }
    
    if (tradesElement) {
      const currentTrades = parseInt(tradesElement.textContent || '0');
      tradesElement.textContent = (currentTrades + 1).toString();
      
      // Animação para contador de trades
      tradesElement.className = 'text-2xl font-bold text-blue-400 animate-bounce';
      setTimeout(() => {
        tradesElement.className = 'text-2xl font-bold text-white';
      }, 1000);
    }
    
    // Calcular win rate (simplificado para demonstração)
    if (winRateElement) {
      const currentTrades = parseInt(tradesElement?.textContent || '0');
      const currentProfit = parseFloat(profitElement?.textContent?.replace('$', '') || '0');
      const estimatedWins = Math.max(0, (currentProfit / settings.stake) + (currentTrades / 2));
      const winRate = currentTrades > 0 ? (estimatedWins / currentTrades) * 100 : 0;
      winRateElement.textContent = `${winRate.toFixed(1)}%`;
      
      // Cor baseada na performance
      if (winRate >= 70) {
        winRateElement.className = 'text-2xl font-bold text-green-400';
      } else if (winRate >= 50) {
        winRateElement.className = 'text-2xl font-bold text-yellow-400';
      } else {
        winRateElement.className = 'text-2xl font-bold text-red-400';
      }
    }
    
    // Notificação de performance
    if (tradeResult.result === 'WIN') {
      // Verificar se é uma sequência de vitórias
      const currentTrades = parseInt(tradesElement?.textContent || '0');
      if (currentTrades > 1 && currentTrades % 3 === 0) {
        toast({
          title: "🔥 Sequência de Vitórias!",
          description: `${currentTrades} trades executados com sucesso!`,
          duration: 5000
        });
      }
    }
  };

  // ===== SISTEMA DE NOTIFICAÇÕES AVANÇADO =====
  const sendAdvancedNotification = (type: 'trade' | 'risk' | 'performance', data: any) => {
    const notifications = {
      trade: {
        title: `📊 Novo Trade Executado`,
        description: `${data.signal} - ${data.result} - $${data.profit.toFixed(2)}`,
        variant: (data.result === 'WIN' ? 'default' : 'destructive') as 'default' | 'destructive'
      },
      risk: {
        title: `⚠️ Alerta de Risco`,
        description: data.reason,
        variant: 'destructive' as 'default' | 'destructive'
      },
      performance: {
        title: `📈 Performance Update`,
        description: `Win Rate: ${data.winRate}% | Lucro: $${data.profit.toFixed(2)}`,
        variant: 'default' as 'default' | 'destructive'
      }
    };
    
    const notification = notifications[type];
    if (notification) {
      toast({
        title: notification.title,
        description: notification.description,
        variant: notification.variant as 'default' | 'destructive',
        duration: 6000
      });
    }
  };

  // ===== BOTÕES DE INICIAR/PARAR =====
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

    if (!settings.derivTokenReal && settings.selectedTokenType === 'real') {
      toast({
        title: "❌ Token Real Necessário",
        description: "Configure o token da conta real nas configurações.",
        variant: "destructive"
      });
      return;
    }

    setIsBotRunning(true);
    (window as any).botRunningState = true;
    console.log(`🚀 Bot iniciado - isBotRunning definido como: true`);
    
    // Inicializar gráfico se não estiver inicializado
    if (!priceChartRef.current) {
      initializeRealTimeChart();
    }

    // Conectar à Deriv API para dados reais
    connectToDerivAPI();

    // Simular trading automático
    toast({
      title: "🚀 Bot Iniciado",
      description: `Trading automático iniciado na conta ${settings.selectedTokenType}`,
    });

    // Enviar notificação Telegram se configurado
    if (telegramSettings.notificationsEnabled) {
      sendTelegramNotification(`
🤖 <b>Zeus Bot Iniciado</b>

✅ Trading automático iniciado
💼 Conta: ${settings.selectedTokenType.toUpperCase()}
💰 Stake: $${settings.stake}
🎯 Estratégia: ${settings.strategy}

⏰ ${new Date().toLocaleString()}
      `.trim());
    }
  };

  const handleStopBot = () => {
    setIsBotRunning(false);
    (window as any).botRunningState = false;
    
    // Fechar conexão Deriv
    if ((window as any).derivWS) {
      (window as any).derivWS.close();
      (window as any).derivWS = null;
    }
    
    // Parar intervalo de atualização
    if (chartIntervalRef.current) {
      clearInterval(chartIntervalRef.current);
      chartIntervalRef.current = null;
    }

    toast({
      title: "⏹️ Bot Parado",
      description: "Trading automático interrompido.",
    });

    // Enviar notificação Telegram se configurado
    if (telegramSettings.notificationsEnabled) {
      sendTelegramNotification(`
🤖 <b>Zeus Bot Parado</b>

⏹️ Trading automático interrompido
💼 Conta: ${settings.selectedTokenType.toUpperCase()}
📊 Sessão finalizada

⏰ ${new Date().toLocaleString()}
      `.trim());
    }
  };

  // ===== CARREGAR ANALYTICS DO BANCO =====
  const loadAnalyticsFromDatabase = async () => {
    if (!user?.id) return;
    
    try {
      const filterParam = analyticsAccountFilter !== 'all' ? `&account_type=${analyticsAccountFilter}` : '';
      const response = await fetch(`/api/data?action=trading_history&user_id=${user.id}${filterParam}`);
      
      if (response.ok) {
        const data = await response.json();
        const trades = data.trades || [];
        
        if (trades.length > 0) {
          // Calcular estatísticas
          const totalTrades = trades.length;
          const wins = trades.filter((t: any) => t.result === 'WIN').length;
          const losses = totalTrades - wins;
          const winRate = ((wins / totalTrades) * 100).toFixed(1);
          const totalProfit = trades.reduce((sum: number, t: any) => sum + (parseFloat(t.profit) || 0), 0);
          
          // Atualizar UI
          const totalEl = document.getElementById('analytics-total-trades');
          const winRateEl = document.getElementById('analytics-win-rate');
          const profitEl = document.getElementById('analytics-profit');
          
          if (totalEl) totalEl.textContent = totalTrades.toString();
          if (winRateEl) winRateEl.textContent = winRate + '%';
          if (profitEl) profitEl.textContent = '$' + totalProfit.toFixed(2);
          
          // Atualizar tabela
          updateAnalyticsTable(trades);
          createPerformanceChart(trades, wins, losses);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    }
  };

  const updateAnalyticsTable = (trades: any[]) => {
    const historyBody = document.getElementById('analytics-history');
    if (!historyBody) return;

    historyBody.innerHTML = '';
    
    trades.forEach((trade: any) => {
      const row = document.createElement('tr');
      const resultColor = trade.result === 'WIN' ? '#10b981' : '#ef4444';
      const profitColor = parseFloat(trade.profit) >= 0 ? '#10b981' : '#ef4444';
      
      row.innerHTML = `
        <td class="px-4 py-3 text-sm text-gray-300">${new Date(trade.created_at).toLocaleString()}</td>
        <td class="px-4 py-3 text-sm font-semibold text-gray-100">${trade.symbol || '-'}</td>
        <td class="px-4 py-3 text-sm font-semibold" style="color: ${trade.trade_signal === 'CALL' ? '#10b981' : '#ef4444'}">
          ${trade.trade_signal || trade.trade_type || '-'}
        </td>
        <td class="px-4 py-3 text-sm text-gray-300">$${parseFloat(trade.stake || 0).toFixed(2)}</td>
        <td class="px-4 py-3 text-sm font-semibold" style="color: ${resultColor}">${trade.result || '-'}</td>
        <td class="px-4 py-3 text-sm font-semibold" style="color: ${profitColor}">
          $${parseFloat(trade.profit || 0).toFixed(2)}
        </td>
      `;
      
      historyBody.appendChild(row);
    });
  };

  // ===== CRIAR GRÁFICO DE PERFORMANCE =====
  const createPerformanceChart = (trades: any[], wins: number, losses: number) => {
    const canvas = document.getElementById('performanceChart') as HTMLCanvasElement;
    if (!canvas || typeof (window as any).Chart === 'undefined') return;
    
    // Destruir gráfico existente
    if (performanceChartRef.current) {
      performanceChartRef.current.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    try {
      // Preparar dados
      let cumulativeProfit = 0;
      const profitData = trades.map((trade: any) => {
        cumulativeProfit += parseFloat(trade.profit) || 0;
        return {
          x: new Date(trade.created_at).toLocaleDateString(),
          y: cumulativeProfit
        };
      });
      
      performanceChartRef.current = new (window as any).Chart(ctx, {
        type: 'line',
        data: {
          datasets: [{
            label: 'Evolução do Lucro',
            data: profitData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: '#cbd5e1',
                font: { size: 12 }
              }
            }
          },
          scales: {
            x: {
              grid: {
                color: '#334155'
              },
              ticks: {
                color: '#94a3b8'
              }
            },
            y: {
              grid: {
                color: '#334155'
              },
              ticks: {
                color: '#94a3b8',
                callback: (value: any) => '$' + value
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Erro ao criar gráfico de performance:', error);
    }
  };

  // ===== FUNÇÕES DE CONFIGURAÇÃO =====
  const loadSettings = async () => {
    try {
      if (user?.id) {
        const response = await fetch(`/api/data?action=settings&user_id=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            setSettings(prev => ({ ...prev, ...data.settings }));
            return;
          }
        }
      }
      
      const settingsKey = user?.id ? `mvb_bot_settings_${user.id}` : 'mvb_bot_settings_temp';
      const savedSettings = localStorage.getItem(settingsKey);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        // Forçar migração de configurações antigas
        let needsUpdate = false;
        if (parsedSettings.confidence === 60) {
          parsedSettings.confidence = 30;
          needsUpdate = true;
        }
        if (parsedSettings.mhiPeriods > 10) {
          parsedSettings.mhiPeriods = 5;
          needsUpdate = true;
        }
        if (needsUpdate) {
          localStorage.setItem(settingsKey, JSON.stringify(parsedSettings));
          console.log('🔄 Configurações migradas:', parsedSettings);
        }
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const settingsKey = user?.id ? `mvb_bot_settings_${user.id}` : 'mvb_bot_settings_temp';
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      
      if (user?.id) {
        await fetch('/api/data?action=settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, settings })
        });
      }
      
      toast({
        title: "✅ Configurações salvas!",
        description: user?.id ? "Sincronizadas em todos os dispositivos!" : "Salvas localmente!",
      });
    } catch (error) {
      toast({
        title: "❌ Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    }
  };

  const updateSetting = (key: keyof TradingSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    const settingsKey = user?.id ? `mvb_bot_settings_${user.id}` : 'mvb_bot_settings_temp';
    localStorage.setItem(settingsKey, JSON.stringify(newSettings));
  };

  // ===== FUNÇÕES DO TELEGRAM =====
  const sendTelegramNotification = async (message: string) => {
    try {
      if (!telegramSettings.notificationsEnabled || !telegramSettings.userTelegram) return false;

      const isNumeric = /^\d+$/.test(telegramSettings.userTelegram);
      if (!isNumeric) return false;

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

  const testTelegramNotification = async () => {
    if (!telegramSettings.userTelegram) {
      toast({
        title: "❌ Chat ID não configurado",
        description: "Por favor, insira seu Chat ID do Telegram",
        variant: "destructive"
      });
      return;
    }

    const success = await sendTelegramNotification(`
🤖 <b>Teste de Notificação - Zeus</b>

✅ Sistema de notificações funcionando perfeitamente!
📊 Agora você receberá atualizações automáticas

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
        description: "Verifique o token do bot e seu Chat ID.",
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
        await fetch('/api/data?action=save_telegram_chat_id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            telegram_chat_id: telegramSettings.userTelegram
          })
        });
      } catch (error) {
        console.error('Erro ao salvar Chat ID:', error);
      }
    }
    
    toast({
      title: "✅ Configurações salvas!",
      description: "Notificações configuradas com sucesso.",
    });
  };

  // ===== CARREGAR LICENÇAS DO USUÁRIO =====
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
        
        if (!response.ok) throw new Error('Erro ao carregar licenças');
        
        const data = await response.json();
        const licenses = data.licenses || [];
        setUserLicenses(licenses);
        
        const latestLicense = licenses.find(license => license.is_active);
        
        if (latestLicense) {
          const now = new Date();
          const isLicenseValid = new Date(latestLicense.expires_at) > now;
          
          if (isLicenseValid) {
            const licenseInfo: LicenseInfo = {
              type: latestLicense.license_type,
              days: Math.ceil((new Date(latestLicense.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
              features: latestLicense.license_type === 'free' ? ['limited_features'] : ['all_features'],
              maxDevices: latestLicense.max_devices
            };
            
            setLicenseInfo(licenseInfo);
            setLicenseKey(latestLicense.license_key);
            setIsLicenseValid(true);
            setLicenseStatus(`Licença válida! Expira em ${licenseInfo.days} dias.`);
          } else {
            setIsLicenseValid(false);
            setLicenseStatus('Licença expirada. Renove para continuar.');
          }
        } else {
          setIsLicenseValid(false);
          setLicenseStatus('Nenhuma licença encontrada.');
        }
      } catch (error) {
        console.error('Erro ao carregar licenças:', error);
        setLicenseStatus('Erro ao carregar licenças.');
      } finally {
        setLoading(false);
      }
    };

    loadUserLicenses();
  }, [isAuthenticated, user]);

  // ===== INICIALIZAÇÃO =====
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
            setTelegramSettings(prev => ({ ...prev, botToken: data.botToken }));
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

  // ===== INICIALIZAR BOT =====
  useEffect(() => {
    if (isLicenseValid && botContainerRef.current && !isInitialized.current) {
      setTimeout(() => {
        if (botContainerRef.current && !botContainerRef.current.innerHTML.trim()) {
          isInitialized.current = true;
          initializeOriginalBot();
        }
      }, 500);
    }
  }, [isLicenseValid]);

  // ===== DADOS REAIS DA API DERIV =====
  // Os dados reais vêm da função connectToDerivAPI() que já está implementada

  // ===== LIMPAR GRÁFICO COMPLETAMENTE =====
  const clearChart = () => {
    if (priceChartRef.current) {
      priceChartRef.current.data.datasets[0].data = [];
      priceChartRef.current.data.labels = [];
      priceChartRef.current.update('none');
      console.log('🧹 Gráfico limpo completamente');
    }
  };

  // ===== INICIALIZAR GRÁFICO =====
  useEffect(() => {
    if (activeTab === 'trading') {
      // Aguardar um pouco para garantir que o DOM está pronto
      const timer = setTimeout(() => {
        initializeRealTimeChart();
        console.log('📊 Gráfico inicializado - aguardando dados reais da API Deriv');
      }, 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [activeTab]);

  // ===== OTIMIZAÇÃO DE PERFORMANCE =====
  useEffect(() => {
    // Debounce para atualizações frequentes
    let updateTimeout: NodeJS.Timeout;
    
    const debouncedUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        // Atualizar apenas elementos visíveis
        if (activeTab === 'trading') {
          // Forçar re-render apenas se necessário
          const currentSignal = document.getElementById('current-signal');
          if (currentSignal && currentSignal.textContent === 'HOLD') {
            // Atualizar indicadores apenas se necessário
          }
        }
      }, 100);
    };

    // Limpar timeout ao desmontar
    return () => clearTimeout(updateTimeout);
  }, [activeTab]);

  // ===== SISTEMA DE CACHE PARA MELHOR PERFORMANCE =====
  const [chartCache, setChartCache] = useState<Map<string, any>>(new Map());
  
  const getCachedAnalysis = (priceKey: string) => {
    return chartCache.get(priceKey);
  };
  
  const setCachedAnalysis = (priceKey: string, analysis: TechnicalAnalysis) => {
    // Limitar cache a 100 entradas
    if (chartCache.size > 100) {
      const firstKey = chartCache.keys().next().value;
      chartCache.delete(firstKey);
    }
    chartCache.set(priceKey, analysis);
  };

  // ===== CLEANUP =====
  useEffect(() => {
    return () => {
      // Limpar intervalos ao desmontar
      if (chartIntervalRef.current) {
        clearInterval(chartIntervalRef.current);
      }
      
      // Destruir gráficos
      if (priceChartRef.current) {
        priceChartRef.current.destroy();
      }
      if (performanceChartRef.current) {
        performanceChartRef.current.destroy();
      }
    };
  }, []);

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-800">
          <CardHeader className="text-center pb-8">
            <div className="text-6xl mb-4">🤖</div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Carregando Zeus
            </CardTitle>
            <CardDescription className="text-gray-400 mt-2">
              Verificando suas licenças...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
            <p className="text-sm text-gray-400 mt-4">
              Aguarde enquanto verificamos seu acesso
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Bot className="h-6 w-6 sm:h-8 sm:w-8" />
            Zeus Trading Bot
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Sistema automatizado de trading profissional
          </p>
        </div>
        
        {licenseInfo && (
          <Badge variant={isLicenseValid ? "default" : "destructive"} className="text-xs sm:text-sm">
            {isLicenseValid ? `✅ ${licenseInfo.type.toUpperCase()}` : '❌ Licença Expirada'}
          </Badge>
        )}
      </div>

      {/* Container Principal */}
      <Card className="shadow-2xl border-slate-700 bg-slate-800">
        <CardContent className="p-2 sm:p-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6 h-10 sm:h-12 bg-slate-700">
              <TabsTrigger 
                value="trading" 
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 data-[state=active]:bg-blue-600"
              >
                <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Trading</span>
                <span className="sm:hidden">Trade</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 data-[state=active]:bg-green-600"
              >
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 data-[state=active]:bg-purple-600"
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Configurações</span>
                <span className="sm:hidden">Config</span>
              </TabsTrigger>
            </TabsList>
            
            {/* ABA TRADING */}
            <TabsContent value="trading" className="space-y-4">
              {!isLicenseValid && !loading && (
                <Alert className="border-red-400 bg-red-900/20">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-200">
                    {licenseStatus || 'Nenhuma licença válida. Renove sua licença.'}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Seletor de Conta */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-400 flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Conta Deriv
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Selecione qual conta usar para o trading
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => updateSetting('selectedTokenType', 'demo')}
                      className={`h-16 transition-all ${
                        settings.selectedTokenType === 'demo' 
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg' 
                          : 'bg-slate-700 border-slate-500 text-blue-300 hover:bg-blue-600/20'
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
                      className={`h-16 transition-all ${
                        settings.selectedTokenType === 'real' 
                          ? 'bg-green-600 border-green-400 text-white shadow-lg' 
                          : 'bg-slate-700 border-slate-500 text-green-300 hover:bg-green-600/20'
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

              {/* Botões de Controle */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Controle do Bot
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Inicie ou pare o trading automático
                  </CardDescription>
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
                      <div className="flex items-center justify-between">
                        <span className="text-green-400 text-sm">🟢 Bot em execução</span>
                        <span className="text-green-300 text-sm">
                          Conta: {settings.selectedTokenType === 'demo' ? 'Demo' : 'Real'}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gráfico em Tempo Real */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Gráfico em Tempo Real
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Preços atualizados em tempo real
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={clearChart}
                        size="sm"
                        variant="outline"
                        className="bg-orange-600 hover:bg-orange-700 text-white border-orange-500"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Limpar Gráfico
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80 bg-slate-900 rounded-lg p-4">
                    <canvas id="realTimeChart"></canvas>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    📊 Dados reais da API Deriv - {settings.selectedSymbol || 'Nenhum símbolo selecionado'}
                  </div>
                </CardContent>
              </Card>

              {/* Status do Trading */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Status do Trading
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                      <div className="text-2xl font-bold text-white" data-stat="profit">$0.00</div>
                      <div className="text-sm text-gray-400">Lucro Atual</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                      <div className="text-2xl font-bold text-white" data-stat="trades">0</div>
                      <div className="text-sm text-gray-400">Trades Hoje</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                      <div className="text-2xl font-bold text-white" data-stat="winrate">0%</div>
                      <div className="text-sm text-gray-400">Taxa de Acerto</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        {isBotRunning ? '🟢' : '🔴'}
                      </div>
                      <div className="text-sm text-gray-400">Status</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Indicadores Técnicos em Tempo Real */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Indicadores Técnicos
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Análise técnica em tempo real
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                      <div className="text-lg font-bold text-blue-400" id="mhi-indicator">-</div>
                      <div className="text-sm text-gray-400">MHI</div>
                      <div className="text-xs text-gray-500" id="mhi-confidence">0%</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                      <div className="text-lg font-bold text-green-400" id="ema-indicator">-</div>
                      <div className="text-sm text-gray-400">EMA</div>
                      <div className="text-xs text-gray-500" id="ema-confidence">0%</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                      <div className="text-lg font-bold text-purple-400" id="rsi-indicator">-</div>
                      <div className="text-sm text-gray-400">RSI</div>
                      <div className="text-xs text-gray-500" id="rsi-confidence">0%</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                      <div className="text-lg font-bold text-orange-400" id="trend-indicator">-</div>
                      <div className="text-sm text-gray-400">Tendência</div>
                      <div className="text-xs text-gray-500" id="trend-confidence">0%</div>
                    </div>
                  </div>
                  
                  {/* Sinal Atual */}
                  <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-600">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-400">Sinal Atual</div>
                        <div className="text-xl font-bold text-white" id="current-signal">HOLD</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">Confiança</div>
                        <div className="text-xl font-bold text-white" id="current-confidence">0%</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500" id="signal-reason">
                      Aguardando análise...
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gestão de Risco */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Gestão de Risco
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Monitoramento de perdas e proteção do capital
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        ${riskManagement.currentDailyLoss.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-400">Perda Hoje</div>
                      <div className="text-xs text-gray-500">
                        Limite: ${riskManagement.maxDailyLoss}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        {riskManagement.consecutiveLosses}
                      </div>
                      <div className="text-sm text-gray-400">Perdas Seguidas</div>
                      <div className="text-xs text-gray-500">
                        Limite: {riskManagement.maxConsecutiveLosses}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        {riskManagement.isInCooldown ? '⏸️' : '✅'}
                      </div>
                      <div className="text-sm text-gray-400">Status</div>
                      <div className="text-xs text-gray-500">
                        {riskManagement.isInCooldown ? 'Cooldown' : 'Ativo'}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                      <div className="text-2xl font-bold text-white">
                        {riskManagement.cooldownPeriod}m
                      </div>
                      <div className="text-sm text-gray-400">Cooldown</div>
                      <div className="text-xs text-gray-500">
                        Após perdas
                      </div>
                    </div>
                  </div>
                  
                  {/* Barra de Progresso da Perda Diária */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>Perda Diária</span>
                      <span>{((riskManagement.currentDailyLoss / riskManagement.maxDailyLoss) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          riskManagement.currentDailyLoss / riskManagement.maxDailyLoss > 0.8 
                            ? 'bg-red-500' 
                            : riskManagement.currentDailyLoss / riskManagement.maxDailyLoss > 0.6 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                        }`}
                        style={{ 
                          width: `${Math.min((riskManagement.currentDailyLoss / riskManagement.maxDailyLoss) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bot Original (para compatibilidade) */}
              <div ref={botContainerRef} className="w-full" />
            </TabsContent>

            {/* ABA ANALYTICS */}
            <TabsContent value="analytics" className="space-y-4">
              {/* Filtros */}
              <Card className="border-slate-600 bg-slate-750">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium text-white">Filtrar por Tipo de Conta</h3>
                      <p className="text-xs text-gray-400">Separe análises de contas Real e Demo</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant={analyticsAccountFilter === 'all' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAnalyticsAccountFilter('all')}
                        className="flex-1 sm:flex-none"
                      >
                        Todas
                      </Button>
                      <Button
                        variant={analyticsAccountFilter === 'real' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAnalyticsAccountFilter('real')}
                        className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                      >
                        Real
                      </Button>
                      <Button
                        variant={analyticsAccountFilter === 'demo' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAnalyticsAccountFilter('demo')}
                        className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
                      >
                        Demo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estatísticas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Total Trades</p>
                        <p className="text-2xl sm:text-3xl font-bold text-white" id="analytics-total-trades">0</p>
                      </div>
                      <Target className="h-8 w-8 sm:h-10 sm:w-10 opacity-90" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Taxa de Acerto</p>
                        <p className="text-2xl sm:text-3xl font-bold text-white" id="analytics-win-rate">0%</p>
                      </div>
                      <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 opacity-90" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Lucro Total</p>
                        <p className="text-2xl sm:text-3xl font-bold text-white" id="analytics-profit">$0.00</p>
                      </div>
                      <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 opacity-90" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90">Melhor Sequência</p>
                        <p className="text-2xl sm:text-3xl font-bold text-white" id="analytics-best-streak">0</p>
                      </div>
                      <Zap className="h-8 w-8 sm:h-10 sm:w-10 opacity-90" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico de Performance */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BarChart3 className="h-5 w-5" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80">
                    <canvas id="performanceChart"></canvas>
                  </div>
                </CardContent>
              </Card>

              {/* Histórico */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Activity className="h-5 w-5" />
                    Histórico de Operações
                  </CardTitle>
                  <Button 
                    onClick={loadAnalyticsFromDatabase}
                    variant="outline" 
                    size="sm"
                    className="w-fit"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-600">
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Data/Hora</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Ativo</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Direção</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Stake</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Resultado</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-medium">Lucro</th>
                        </tr>
                      </thead>
                      <tbody id="analytics-history" className="divide-y divide-slate-700">
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-500">
                            Nenhuma operação encontrada
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA CONFIGURAÇÕES */}
            <TabsContent value="settings" className="space-y-4">
              {/* Configurações de Trading */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Settings className="h-5 w-5" />
                    Configurações de Trading
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Ajuste os parâmetros do seu bot de trading
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stake" className="text-sm font-medium text-gray-300">
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
                      <Label htmlFor="symbol" className="text-sm font-medium text-gray-300">
                        Ativo/Símbolo
                      </Label>
                      <Select
                        value={settings.selectedSymbol}
                        onValueChange={(value) => updateSetting('selectedSymbol', value)}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Selecione o ativo" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          {AVAILABLE_SYMBOLS.map((symbol) => (
                            <SelectItem 
                              key={symbol.value} 
                              value={symbol.value}
                              className="text-white hover:bg-slate-600"
                            >
                              {symbol.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="martingale" className="text-sm font-medium text-gray-300">
                        Multiplicador Martingale
                      </Label>
                      <Input
                        id="martingale"
                        type="number"
                        value={settings.martingale}
                        onChange={(e) => updateSetting('martingale', parseFloat(e.target.value) || 2)}
                        className="bg-slate-700 border-slate-600 text-white"
                        min="1"
                        step="0.1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration" className="text-sm font-medium text-gray-300">
                        Duração (ticks)
                      </Label>
                      <Input
                        id="duration"
                        type="number"
                        value={settings.duration}
                        onChange={(e) => updateSetting('duration', parseInt(e.target.value) || 15)}
                        className="bg-slate-700 border-slate-600 text-white"
                        min="1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stopWin" className="text-sm font-medium text-gray-300">
                        Stop Win ($)
                      </Label>
                      <Input
                        id="stopWin"
                        type="number"
                        value={settings.stopWin}
                        onChange={(e) => updateSetting('stopWin', parseFloat(e.target.value) || 3)}
                        className="bg-slate-700 border-slate-600 text-white"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stopLoss" className="text-sm font-medium text-gray-300">
                        Stop Loss ($)
                      </Label>
                      <Input
                        id="stopLoss"
                        type="number"
                        value={settings.stopLoss}
                        onChange={(e) => updateSetting('stopLoss', parseFloat(e.target.value) || -5)}
                        className="bg-slate-700 border-slate-600 text-white"
                        max="0"
                        step="0.01"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confidence" className="text-sm font-medium text-gray-300">
                        Confiança (%)
                      </Label>
                      <Input
                        id="confidence"
                        type="number"
                        value={settings.confidence}
                        onChange={(e) => updateSetting('confidence', parseInt(e.target.value) || 30)}
                        className="bg-slate-700 border-slate-600 text-white"
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="strategy" className="text-sm font-medium text-gray-300">
                        Estratégia
                      </Label>
                      <Select 
                        value={settings.strategy} 
                        onValueChange={(value) => updateSetting('strategy', value)}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Selecione a estratégia" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="martingale">🎯 Martingale (Híbrida)</SelectItem>
                          <SelectItem value="mhi">📊 MHI (Reversão)</SelectItem>
                          <SelectItem value="ema">📈 EMA Crossover</SelectItem>
                          <SelectItem value="rsi">📉 RSI (Momentum)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        {settings.strategy === 'martingale' && 'Combina todos os indicadores para maior precisão'}
                        {settings.strategy === 'mhi' && 'Ideal para mercados voláteis com reversões'}
                        {settings.strategy === 'ema' && 'Melhor para tendências claras'}
                        {settings.strategy === 'rsi' && 'Excelente para identificar sobrecompra/sobrevenda'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="autoCloseTime" className="text-sm font-medium text-gray-300">
                        Auto Fechar (min)
                      </Label>
                      <Input
                        id="autoCloseTime"
                        type="number"
                        value={settings.autoCloseTime}
                        onChange={(e) => updateSetting('autoCloseTime', parseInt(e.target.value) || 30)}
                        className="bg-slate-700 border-slate-600 text-white"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Configurações Avançadas das Estratégias */}
                  <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
                    <h4 className="text-sm font-medium text-white mb-4">⚙️ Configurações Avançadas</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mhiPeriods" className="text-sm font-medium text-gray-300">
                          Períodos MHI
                        </Label>
                        <Input
                          id="mhiPeriods"
                          type="number"
                          value={settings.mhiPeriods}
                          onChange={(e) => updateSetting('mhiPeriods', parseInt(e.target.value) || 20)}
                          className="bg-slate-700 border-slate-600 text-white"
                          min="5"
                          max="50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="emaFast" className="text-sm font-medium text-gray-300">
                          EMA Rápida
                        </Label>
                        <Input
                          id="emaFast"
                          type="number"
                          value={settings.emaFast}
                          onChange={(e) => updateSetting('emaFast', parseInt(e.target.value) || 8)}
                          className="bg-slate-700 border-slate-600 text-white"
                          min="3"
                          max="20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="emaSlow" className="text-sm font-medium text-gray-300">
                          EMA Lenta
                        </Label>
                        <Input
                          id="emaSlow"
                          type="number"
                          value={settings.emaSlow}
                          onChange={(e) => updateSetting('emaSlow', parseInt(e.target.value) || 18)}
                          className="bg-slate-700 border-slate-600 text-white"
                          min="10"
                          max="50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rsiPeriods" className="text-sm font-medium text-gray-300">
                          Períodos RSI
                        </Label>
                        <Input
                          id="rsiPeriods"
                          type="number"
                          value={settings.rsiPeriods}
                          onChange={(e) => updateSetting('rsiPeriods', parseInt(e.target.value) || 10)}
                          className="bg-slate-700 border-slate-600 text-white"
                          min="5"
                          max="30"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="derivTokenDemo" className="text-sm font-medium text-gray-300">
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
                      <Label htmlFor="derivTokenReal" className="text-sm font-medium text-gray-300">
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

                  <div className="flex justify-end pt-4">
                    <Button onClick={saveSettings} className="bg-blue-600 hover:bg-blue-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Salvar Configurações
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Configurações do Telegram */}
              <Card className="border-slate-600 bg-slate-750">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Bell className="h-5 w-5" />
                    Notificações Telegram
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Receba notificações das operações no seu Telegram
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userTelegram" className="text-sm font-medium text-gray-300">
                      Seu Chat ID do Telegram
                    </Label>
                    <Input
                      id="userTelegram"
                      type="text"
                      value={telegramSettings.userTelegram}
                      onChange={(e) => setTelegramSettings(prev => ({ ...prev, userTelegram: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="123456789"
                    />
                    <p className="text-xs text-gray-400">
                      Para obter seu Chat ID, envie uma mensagem para @userinfobot no Telegram
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="notificationsEnabled"
                      checked={telegramSettings.notificationsEnabled}
                      onChange={(e) => setTelegramSettings(prev => ({ ...prev, notificationsEnabled: e.target.checked }))}
                      className="rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                    />
                    <Label htmlFor="notificationsEnabled" className="text-sm font-medium text-gray-300">
                      Ativar notificações
                    </Label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button 
                      onClick={testTelegramNotification} 
                      variant="outline"
                      className="flex-1"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Testar Notificação
                    </Button>
                    <Button 
                      onClick={saveTelegramSettings}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
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

// Função para inicializar o bot original (mantida para compatibilidade)
function initializeOriginalBot() {
  console.log('Inicializando bot original...');
  // Esta função seria responsável por inicializar o bot de trading original
  // Mantida para compatibilidade com o código existente
}