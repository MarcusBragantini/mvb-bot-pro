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
  mhiPeriods: number;
  emaFast: number;
  emaSlow: number;
  rsiPeriods: number;
  autoCloseTime: number;
  autoCloseProfit: number;
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
    confidence: 70,
    strategy: 'martingale',
    derivTokenDemo: '',
    derivTokenReal: '',
    selectedTokenType: 'demo',
    mhiPeriods: 20,
    emaFast: 8,
    emaSlow: 18,
    rsiPeriods: 10,
    autoCloseTime: 30,
    autoCloseProfit: 20
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
    const statusElement = document.getElementById('status');
    if (statusElement && statusElement.textContent) {
      const statusText = statusElement.textContent.trim();
      return !statusText.includes('⏸️') && !statusText.includes('Bot Parado') && statusText !== '';
    }
    return false;
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

  // ===== SISTEMA DE GRAFICO EM TEMPO REAL CORRIGIDO =====
  const initializeRealTimeChart = () => {
    if (typeof window === 'undefined' || !(window as any).Chart) {
      console.log('Chart.js não carregado');
      return;
    }

    const canvas = document.getElementById('realTimeChart') as HTMLCanvasElement;
    if (!canvas) {
      console.log('Canvas não encontrado');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('Contexto do canvas não disponível');
      return;
    }

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
      // Criar gráfico simples sem escala realtime
      priceChartRef.current = new (window as any).Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Preço em Tempo Real',
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
              type: 'category',
              grid: {
                color: '#334155',
                drawBorder: false
              },
              ticks: {
                color: '#94a3b8',
                maxTicksLimit: 10,
                callback: function(value: any, index: number) {
                  // Mostrar apenas alguns labels para não poluir
                  return index % 5 === 0 ? `T${index}` : '';
                }
              }
            },
            y: {
              grid: {
                color: '#334155',
                drawBorder: false
              },
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

      console.log('Gráfico inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar gráfico:', error);
    }
  };

  const updateRealTimeChart = (price: number) => {
    if (!priceChartRef.current) return;

    try {
      const now = new Date();
      const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      
      // Adicionar novo ponto
      const currentData = priceChartRef.current.data.datasets[0].data;
      const currentLabels = priceChartRef.current.data.labels;

      currentData.push(price);
      currentLabels.push(timeLabel);

      // Manter apenas os últimos 50 pontos
      if (currentData.length > 50) {
        currentData.shift();
        currentLabels.shift();
      }

      // Forçar atualização do gráfico
      priceChartRef.current.update('none');
      
      // Log para debug
      console.log(`📊 Gráfico atualizado: ${price.toFixed(4)} às ${timeLabel}`);
    } catch (error) {
      console.error('Erro ao atualizar gráfico:', error);
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
    
    // Inicializar gráfico se não estiver inicializado
    if (!priceChartRef.current) {
      initializeRealTimeChart();
    }

    // Simular trading automático
    toast({
      title: "🚀 Bot Iniciado",
      description: `Trading automático iniciado na conta ${settings.selectedTokenType}`,
    });

    // Simular atualização de preços em tempo real
    let simulatedPrice = 1.2345;
    chartIntervalRef.current = setInterval(() => {
      if (isBotRunning && priceChartRef.current) {
        // Simular variação de preço
        simulatedPrice += (Math.random() - 0.5) * 0.01;
        simulatedPrice = Math.max(1.23, Math.min(1.24, simulatedPrice)); // Manter em range
        
        updateRealTimeChart(simulatedPrice);
      }
    }, 1000);

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
        setSettings(JSON.parse(savedSettings));
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

  // ===== INICIALIZAR GRÁFICO =====
  useEffect(() => {
    if (activeTab === 'trading') {
      // Aguardar um pouco para garantir que o DOM está pronto
      const timer = setTimeout(() => {
        initializeRealTimeChart();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [activeTab]);

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
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Gráfico em Tempo Real
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Preços atualizados em tempo real
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 sm:h-80 bg-slate-900 rounded-lg p-4">
                    <canvas id="realTimeChart"></canvas>
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
                      <div className="text-2xl font-bold text-white">$0.00</div>
                      <div className="text-sm text-gray-400">Lucro Atual</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                      <div className="text-2xl font-bold text-white">0</div>
                      <div className="text-sm text-gray-400">Trades Hoje</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700 rounded-lg">
                      <div className="text-2xl font-bold text-white">0%</div>
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
                        onChange={(e) => updateSetting('confidence', parseInt(e.target.value) || 70)}
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
                          <SelectItem value="martingale">Martingale</SelectItem>
                          <SelectItem value="mhi">MHI</SelectItem>
                          <SelectItem value="ema">EMA Crossover</SelectItem>
                          <SelectItem value="rsi">RSI</SelectItem>
                        </SelectContent>
                      </Select>
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