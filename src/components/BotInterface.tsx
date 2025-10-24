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
  Bell
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

// ===== INTERFACES DO GRÁFICO PROFISSIONAL =====
interface CandleData {
  x: number;
  o: number;
  h: number;
  l: number;
  c: number;
  t: number;
}

interface ChartConfig {
  type: 'candlestick' | 'line';
  timeframe: '1m' | '5m' | '15m' | '1h';
  showEMAs: boolean;
  showVolume: boolean;
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

  // Função para verificar se bot está rodando
  const isBotRunning = () => {
    const statusElement = document.getElementById('status');
    if (statusElement && statusElement.textContent) {
      const statusText = statusElement.textContent.trim();
      return !statusText.includes('⏸️') && !statusText.includes('Bot Parado') && statusText !== '';
    }
    return false;
  };

  // Handler para mudança de aba com verificação
  const handleTabChange = (newTab: string) => {
    if (activeTab === 'trading' && newTab !== 'trading' && isBotRunning()) {
      toast({
        title: "⚠️ Bot em Execução!",
        description: "O bot continua rodando em segundo plano. Recomendamos não recarregar a página.",
        duration: 4000,
      });
    }
    setActiveTab(newTab);
    
    // Carregar dados do banco ao abrir aba Analytics
    if (newTab === 'analytics' && user?.id) {
      loadAnalyticsFromDatabase();
    }
  };
  
  // ===== DETECTAR SESSÃO ATIVA DO TELEGRAM E AUTO-INICIAR =====
  useEffect(() => {
    const checkAndStartSession = async () => {
      if (!user?.id || !isLicenseValid) return;
      
      try {
        const response = await fetch(`/api/data?action=check_active_session&user_id=${user.id}`);
        const data = await response.json();
        
        if (data.has_active_session && data.session.source === 'telegram') {
          console.log('🤖 Sessão ativa do Telegram detectada:', data.session);
          
          // Aplicar configurações da sessão do Telegram
          const session = data.session;
          updateSetting('stake', parseFloat(session.stake));
          updateSetting('martingale', parseFloat(session.martingale));
          updateSetting('duration', parseInt(session.duration));
          updateSetting('stopWin', parseFloat(session.stop_win));
          updateSetting('stopLoss', parseFloat(session.stop_loss));
          updateSetting('confidence', parseInt(session.confidence));
          updateSetting('selectedTokenType', session.account_type);
          
          toast({
            title: "🤖 Sessão do Telegram Detectada!",
            description: `Auto-iniciando bot com suas configurações: ${session.symbol}, $${session.stake}`,
          });
          
          // Auto-iniciar bot após 3 segundos (dar tempo para aplicar configs)
          setTimeout(() => {
            // Simular clique no botão de iniciar
            const botElement = document.getElementById('bot-container');
            if (botElement) {
              const startButton = document.getElementById('startBtn') as HTMLButtonElement;
              if (startButton && !startButton.disabled) {
                console.log('🚀 Auto-iniciando bot com configurações do Telegram...');
                startButton.click();
              }
            }
          }, 3000);
        }
      } catch (error) {
        console.error('❌ Erro ao verificar sessão ativa:', error);
      }
    };
    
    checkAndStartSession();
  }, [user?.id, isLicenseValid]);
  
  // ===== CARREGAR ANALYTICS AO MONTAR O COMPONENTE =====
  useEffect(() => {
    if (activeTab === 'analytics' && user?.id) {
      console.log('🔄 Carregando analytics do banco...');
      loadAnalyticsFromDatabase();
    }
  }, [activeTab, user?.id, analyticsAccountFilter]);
  
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
      console.log('📡 Resposta da API:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Dados recebidos:', data);
        const trades = data.trades || [];
        console.log('📊 Total de trades:', trades.length);
        
        if (trades.length > 0) {
          // Calcular estatísticas do banco
          const totalTrades = trades.length;
          const wins = trades.filter((t: any) => t.result === 'WIN').length;
          const losses = totalTrades - wins;
          const winRate = ((wins / totalTrades) * 100).toFixed(1);
          const totalProfit = trades.reduce((sum: number, t: any) => sum + (parseFloat(t.profit) || 0), 0);
          
          // Atualizar cards
          const totalEl = document.getElementById('analytics-total-trades');
          const winRateEl = document.getElementById('analytics-win-rate');
          const profitEl = document.getElementById('analytics-profit');
          
          if (totalEl) totalEl.textContent = totalTrades.toString();
          if (winRateEl) winRateEl.textContent = winRate + '%';
          if (profitEl) profitEl.textContent = '$' + totalProfit.toFixed(2);
          
          // Atualizar tabela
          const historyBody = document.getElementById('analytics-history');
          if (historyBody) {
            historyBody.innerHTML = '';
            
            trades.forEach((trade: any) => {
              const row = document.createElement('tr');
              row.style.borderBottom = '1px solid #334155';
              
              // DEBUG: Mostrar dados recebidos
              console.log('📊 Trade recebido COMPLETO:', trade);
              console.log('📊 Campos específicos:', {
                'symbol': trade.symbol,
                'trade_signal': trade.trade_signal,
                'trade_type': trade.trade_type,
                'result': trade.result,
                'profit': trade.profit,
                'stake': trade.stake
              });
              
              // DEBUG: Verificar se os campos estão vazios
              console.log('🔍 Verificação de campos:', {
                'symbol vazio?': !trade.symbol,
                'trade_signal vazio?': !trade.trade_signal,
                'trade_type vazio?': !trade.trade_type,
                'result vazio?': !trade.result
              });
              
              // Fallbacks para campos que podem estar vazios
              const tradeResult = trade.result || (parseFloat(trade.profit) >= 0 ? 'WIN' : 'LOSS');
              const tradeSignal = trade.trade_signal || trade.trade_type || '-';
              const tradeSymbol = trade.symbol || '-';
              const tradeStake = parseFloat(trade.stake) || 0;
              const tradeProfit = parseFloat(trade.profit) || 0;
              
              // DEBUG: Mostrar valores finais
              console.log('🎯 Valores finais:', {
                tradeSymbol,
                tradeSignal,
                tradeResult,
                tradeStake,
                tradeProfit
              });
              
              const resultColor = tradeResult === 'WIN' ? '#10b981' : '#ef4444';
              const profitColor = tradeProfit >= 0 ? '#10b981' : '#ef4444';
              const signalColor = tradeSignal === 'CALL' ? '#10b981' : '#ef4444';
              
              row.innerHTML = `
                <td class="hidden sm:table-cell" style="padding: 12px 8px; fontSize: 0.8rem; color: #f1f5f9;">${new Date(trade.created_at).toLocaleString()}</td>
                <td style="padding: 12px 8px; fontSize: 0.8rem; fontWeight: 600; color: #f1f5f9;">${tradeSymbol}</td>
                <td style="padding: 12px 8px; fontSize: 0.8rem; color: ${signalColor}; fontWeight: 600;">${tradeSignal}</td>
                <td class="hidden md:table-cell" style="padding: 12px 8px; fontSize: 0.8rem; color: #f1f5f9;">$${tradeStake.toFixed(2)}</td>
                <td style="padding: 12px 8px; fontSize: 0.8rem; color: ${resultColor}; fontWeight: 600;">${tradeResult}</td>
                <td style="padding: 12px 8px; fontSize: 0.8rem; color: ${profitColor}; fontWeight: 600;">$${tradeProfit.toFixed(2)}</td>
              `;
              
              historyBody.appendChild(row);
            });
          }
          
          // Criar gráfico de performance
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
    
    // Destruir gráfico existente
    const existingChart = (window as any).performanceChartInstance;
    if (existingChart) {
      existingChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Preparar dados de evolução do lucro
    let cumulativeProfit = 0;
    const profitData = trades.reverse().map((trade: any) => {
      cumulativeProfit += parseFloat(trade.profit) || 0;
      return {
        x: new Date(trade.created_at),
        y: cumulativeProfit
      };
    });
    
    // Criar gráfico
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
    
    // Salvar referência para destruir depois
    (window as any).performanceChartInstance = chart;
  };
  
  // ===== ESTADOS DAS CONFIGURAÇÕES =====
  const [settings, setSettings] = useState({
    stake: 1,
    martingale: 2,
    duration: 15,
    stopWin: 3,
    stopLoss: -5,
    confidence: 70,
    strategy: 'martingale',
    derivTokenDemo: '',
    derivTokenReal: '',
    selectedTokenType: 'demo', // 'demo' ou 'real'
    // ✅ CORREÇÃO: Adicionar parâmetros técnicos faltantes
    mhiPeriods: 20,
    emaFast: 8,
    emaSlow: 18,
    rsiPeriods: 10,
    // ✅ NOVO: Tempo de fechamento automático ajustável
    autoCloseTime: 30, // segundos
    // ✅ NOVO: Percentual de lucro para fechamento automático
    autoCloseProfit: 20 // percentual (scalp 20%)
  });

  // ===== ESTADOS DO TELEGRAM =====
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    botToken: '',
    userTelegram: '',
    notificationsEnabled: false
  });
  const [botTokenLoaded, setBotTokenLoaded] = useState(false);
  
  // ===== REFS PARA INTEGRAÇÃO COM CÓDIGO ORIGINAL =====
  const botContainerRef = useRef<HTMLDivElement>(null);
  
  // ===== ESTADO DO GRÁFICO PROFISSIONAL =====
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'candlestick',
    timeframe: '1m',
    showEMAs: true,
    showVolume: false
  });
  const isInitialized = useRef(false);

  // ===== FUNÇÕES DE CONFIGURAÇÃO =====
  const loadSettings = async () => {
    try {
      // SEMPRE tentar carregar do servidor primeiro (fonte da verdade)
      if (user?.id) {
        try {
          const response = await fetch(`/api/data?action=settings&user_id=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.settings) {
              setSettings(prev => ({ ...prev, ...data.settings }));
              // Configurações carregadas do servidor
              return; // Sucesso, não precisa carregar do localStorage
            }
          }
        } catch (serverError) {
          console.error('⚠️ Erro ao carregar do servidor:', serverError);
        }
      }
      
      // Fallback: carregar do localStorage apenas se servidor falhar
      const settingsKey = user?.id ? `mvb_bot_settings_${user.id}` : 'mvb_bot_settings_temp';
      const savedSettings = localStorage.getItem(settingsKey);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        // Configurações carregadas do localStorage
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
    }
  };

  const saveSettings = async () => {
    try {
      // Usar chave específica do usuário para evitar compartilhamento
      const settingsKey = user?.id ? `mvb_bot_settings_${user.id}` : 'mvb_bot_settings_temp';
      
      // Sempre salvar no localStorage primeiro (backup)
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      // Configurações salvas localmente
      
      // Tentar salvar no servidor (sincronização)
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
            // Configurações sincronizadas no servidor
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

  const updateSetting = (key: string, value: any) => {
    const newSettings = {
      ...settings,
      [key]: value
    };
    setSettings(newSettings);
    
    // Salvar imediatamente no localStorage com chave do usuário
    const settingsKey = user?.id ? `mvb_bot_settings_${user.id}` : 'mvb_bot_settings_temp';
    localStorage.setItem(settingsKey, JSON.stringify(newSettings));
    
    // Debug para selectedTokenType
    if (key === 'selectedTokenType') {
      console.log('🔄 Tipo de conta alterado:', value);
      console.log('📊 Settings atualizados:', newSettings);
    }
  };

  // ===== FUNÇÕES DO TELEGRAM =====
  const sendTelegramNotification = async (message: string) => {
    try {
      if (!telegramSettings.notificationsEnabled || !telegramSettings.userTelegram) {
        return;
      }

      // Token do bot configurado
      const botToken = telegramSettings.botToken;
      
      if (!botToken) {
        return;
      }

      // ⚠️ IMPORTANTE: Telegram API não aceita @username diretamente
      // É necessário usar Chat ID numérico
      const chatId = telegramSettings.userTelegram;
      
      // Verificar se é um número (Chat ID) ou username
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
      
      if (data.ok) {
        return true;
      } else {
        return false;
      }
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

    // Verificar se é numérico
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
    // Salvar apenas as configurações do usuário (não o token do bot)
    const settingsToSave = {
      userTelegram: telegramSettings.userTelegram,
      notificationsEnabled: telegramSettings.notificationsEnabled
    };
    localStorage.setItem('telegram_settings', JSON.stringify(settingsToSave));
    
    // ✅ NOVO: Salvar Chat ID no banco de dados
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
        } else {
          console.error('❌ Erro ao salvar no banco:', data.error);
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
    
    // ===== VERIFICAÇÃO DE DISPOSITIVO REMOVIDA =====
    // Permite múltiplas abas/dispositivos sem restrição
    
    setLicenseInfo(license);
    setIsLicenseValid(true);
    setLicenseStatus('Acesso autorizado com sucesso!');
    
    // Salvar sessão
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

  // ===== CARREGAR LICENÇAS DO USUÁRIO =====
  useEffect(() => {
    const loadUserLicenses = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Buscar licenças reais do banco de dados via API
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://mvb-bot-pro.vercel.app/api';
        const response = await fetch(`${API_BASE_URL}/data?action=licenses&user_id=${user.id}`);
        
        if (!response.ok) {
          throw new Error('Erro ao carregar licenças');
        }
        
        const data = await response.json();
        const licenses = data.licenses || [];
        
        setUserLicenses(licenses);
        
        // Buscar a licença mais recente (ativa ou expirada)
        const latestLicense = licenses.find(license => license.is_active);
        
        if (latestLicense) {
          // Verificar se a licença ainda é válida (não expirada)
          const now = new Date();
          const isLicenseValid = new Date(latestLicense.expires_at) > now;
          
          if (isLicenseValid) {
            const activeLicense = latestLicense;
            // Para licenças "free", usar o valor já calculado pela API (em minutos)
            // Para outras licenças, calcular normalmente
            const isFreeLicense = activeLicense.license_type === 'free';
            const minutesRemaining = isFreeLicense 
              ? activeLicense.days_remaining // API já retorna minutos para "free"
              : Math.floor((new Date(activeLicense.expires_at).getTime() - Date.now()) / (1000 * 60));
            const daysRemaining = Math.ceil((new Date(activeLicense.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            
          // Usuário tem licença válida, pular validação
          const licenseInfo: LicenseInfo = {
            type: activeLicense.license_type,
              days: isFreeLicense ? Math.ceil(minutesRemaining / (60 * 24)) : daysRemaining,
            features: activeLicense.license_type === 'free' ? ['limited_features'] : ['all_features'],
            maxDevices: activeLicense.max_devices
          };
          
          setLicenseInfo(licenseInfo);
          setLicenseKey(activeLicense.license_key);
          setIsLicenseValid(true);
            
            // Mostrar tempo restante apropriado
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
            // Licença encontrada mas expirada
            setIsLicenseValid(false);
            setLicenseStatus(`Licença expirada. Tipo: ${latestLicense.license_type}. Renove para continuar.`);
            
            toast({
              title: "⚠️ Licença Expirada",
              description: `Sua licença ${latestLicense.license_type} expirou. Renove para continuar usando o bot.`,
              variant: "destructive"
            });
          }
        } else {
          // Nenhuma licença encontrada
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
    
    // ✅ NOVO: Verificar licença a cada 60 segundos (menos frequente para evitar problemas)
    const licenseCheckInterval = setInterval(() => {
      // Só verificar se não estiver carregando para evitar conflitos
      if (!loading) {
        loadUserLicenses();
      }
    }, 60000); // 60 segundos em vez de 30
    
    return () => clearInterval(licenseCheckInterval);
  }, [isAuthenticated, user, toast]);

  // ===== CARREGAR CONFIGURAÇÕES =====
  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user?.id]);

  // ===== CARREGAR TOKEN DO BOT DO SERVIDOR =====
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

  // ===== CARREGAR CONFIGURAÇÕES DO TELEGRAM =====
  useEffect(() => {
    const savedTelegramSettings = localStorage.getItem('telegram_settings');
    if (savedTelegramSettings) {
      const parsed = JSON.parse(savedTelegramSettings);
      // Não sobrescrever o botToken que veio do servidor
      setTelegramSettings(prev => ({
        ...prev,
        userTelegram: parsed.userTelegram || '',
        notificationsEnabled: parsed.notificationsEnabled || false
      }));
    }
  }, []);

  // ===== MONITORAR EXPIRAÇÃO DE LICENÇA E PARAR BOT =====
  useEffect(() => {
    if (!isLicenseValid) {
      // Licença expirou, parar o bot se estiver rodando
      const stopBotButton = document.querySelector('button[onclick="stopBot()"]') as HTMLButtonElement;
      if (stopBotButton) {
        stopBotButton.click();
      }
      
      // Também chamar a função global se existir
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
    
    // Atualizar estado global da licença para o bot poder verificar
    (window as any).isLicenseValid = isLicenseValid;
  }, [isLicenseValid, toast]);

  // ===== CRIAR FUNÇÃO TOAST GLOBAL ANTES DO BOT =====
  useEffect(() => {
    // ✅ CORREÇÃO: Criar função global para o bot usar com múltiplos sistemas de toast
    (window as any).showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
      // Toast chamado
      
      try {
        // Tentar usar o sistema React primeiro
        if (toast) {
          // Usando toast React
          toast({
            title: title,
            description: description,
            variant: variant,
            duration: 3000,
          });
          return; // Se funcionou, não tentar outros métodos
        }
      } catch (error) {
        // Toast React falhou, tentando Sonner
      }

      try {
        // Fallback para Sonner
        // Tentando Sonner
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
        return; // Se funcionou, não tentar alert
      } catch (error) {
        // Sonner falhou
      }

      // Último fallback: alert nativo
      // Usando alert nativo
      alert(`${title}: ${description}`);
    };

    // ✅ CORREÇÃO: Adicionar função de teste para debug
    (window as any).testToast = () => {
      (window as any).showToast('Teste Toast', 'Se você está vendo isso, o sistema está funcionando!', 'default');
    };

    // Exportar função do Telegram para o bot usar
    (window as any).sendTelegramNotification = sendTelegramNotification;

    return () => {
      delete (window as any).showToast;
      delete (window as any).testToast;
      delete (window as any).sendTelegramNotification;
    };
  }, [toast]);

  // ===== NOTIFICAÇÕES AUTOMÁTICAS DO BOT =====
  useEffect(() => {
    const handleBotStarted = () => {
      // Buscar configurações diretamente do localStorage (mais confiável que state)
      const savedSettings = localStorage.getItem('telegram_settings');
      if (!savedSettings) return;
      
      const telegramConfig = JSON.parse(savedSettings);
      if (!telegramConfig.notificationsEnabled || !telegramConfig.userTelegram) return;
      
      const symbolElement = document.getElementById('symbol') as HTMLSelectElement;
      const currentSymbol = symbolElement?.value || 'R_10';
      const accountType = settings.selectedTokenType === 'demo' ? 'DEMO' : 'REAL';
      
      // Buscar botToken do state ou fazer fetch
      const botToken = telegramSettings.botToken;
      if (!botToken) {
        console.log('⚠️ Bot token não carregado ainda');
        return;
      }
      
      // Enviar diretamente (sem depender do state do React)
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: telegramConfig.userTelegram,
          text: `
🚀 <b>Zeus Iniciado</b>

✅ Bot conectado e analisando mercado
📊 Par: ${currentSymbol}
💼 Conta: ${accountType}
💰 Entrada: $${settings.stake}
⚙️ Estratégia: Zeus

⏰ ${new Date().toLocaleString()}
          `.trim(),
          parse_mode: 'HTML'
        })
      }).catch(err => console.log('Erro ao enviar notificação:', err));
    };

    const handleBotStopped = (event: any) => {
      // Buscar configurações diretamente do localStorage (mais confiável que state)
      const savedSettings = localStorage.getItem('telegram_settings');
      if (!savedSettings) return;
      
      const telegramConfig = JSON.parse(savedSettings);
      if (!telegramConfig.notificationsEnabled || !telegramConfig.userTelegram) return;
      
      const reportData = event.detail || {};
      const currentSymbol = reportData.symbol || 'N/A';
      const profit = reportData.profit || 0;
      const accuracy = reportData.accuracy || '0';
      const trades = reportData.tradeHistory || [];

      // Determinar tipo de conta
      const accountType = settings.selectedTokenType === 'demo' ? 'DEMO' : 'REAL';

      // Buscar botToken do state
      const botToken = telegramSettings.botToken;
      if (!botToken) return;

      // Criar lista de trades
      let tradesList = '';
      trades.forEach((trade: any) => {
        const emoji = trade.result === 'WIN' ? '🎉' : '❌';
        tradesList += `${emoji} ${trade.result} - Ativo: ${trade.symbol} - Lucro $${trade.profit.toFixed(2)}\n`;
      });

      // Enviar diretamente
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: telegramConfig.userTelegram,
          text: `
⏹️ <b>Zeus Parado</b>

📊 Sessão finalizada
📊 Par: ${currentSymbol}
💼 Conta: ${accountType}
💰 Lucro final: $${profit.toFixed(2)}
📈 Precisão: ${accuracy}%
${tradesList || 'Nenhuma operação realizada'}
⏰ ${new Date().toLocaleString()}
          `.trim(),
          parse_mode: 'HTML'
        })
      }).catch(err => console.log('Erro ao enviar notificação:', err));
    };

    window.addEventListener('bot-started', handleBotStarted);
    window.addEventListener('bot-stopped', handleBotStopped);

    return () => {
      window.removeEventListener('bot-started', handleBotStarted);
      window.removeEventListener('bot-stopped', handleBotStopped);
    };
  }, [telegramSettings.botToken, settings.selectedTokenType, settings.stake]);

  // ===== INICIALIZAR BOT UMA ÚNICA VEZ (NUNCA REINICIALIZAR) =====
  useEffect(() => {
    if (isLicenseValid && botContainerRef.current && !isInitialized.current) {
      // Aguardar um pouco para garantir que o DOM está pronto
      setTimeout(() => {
        if (botContainerRef.current && !botContainerRef.current.innerHTML.trim()) {
          // Inicializando bot
          isInitialized.current = true;
          initializeOriginalBot();
        }
      }, 500);
    }
  }, [isLicenseValid]);

  // ===== ATUALIZAR TOKEN QUANDO SELEÇÃO MUDAR =====
  useEffect(() => {
    const tokenInput = document.getElementById('token') as HTMLInputElement;
    if (tokenInput) {
      const selectedToken = settings.selectedTokenType === 'demo' 
        ? settings.derivTokenDemo 
        : settings.derivTokenReal;
      tokenInput.value = selectedToken || '';
      // Token atualizado
    }
  }, [settings.selectedTokenType, settings.derivTokenDemo, settings.derivTokenReal]);

  // ===== ATUALIZAR CAMPOS DO BOT QUANDO CONFIGURAÇÕES MUDAREM =====
  useEffect(() => {
    // Atualizar duração
    const durationInput = document.getElementById('duration') as HTMLInputElement;
    if (durationInput && settings.duration) {
      durationInput.value = String(settings.duration);
      // Duração atualizada
    }

    // Atualizar stake
    const stakeInput = document.getElementById('stake') as HTMLInputElement;
    if (stakeInput && settings.stake) {
      stakeInput.value = String(settings.stake);
    }

    // Atualizar martingale
    const martingaleInput = document.getElementById('martingale') as HTMLInputElement;
    if (martingaleInput && settings.martingale) {
      martingaleInput.value = String(settings.martingale);
    }

    // ✅ CORREÇÃO: Atualizar stopWin
    const stopWinInput = document.getElementById('stopWin') as HTMLInputElement;
    if (stopWinInput && settings.stopWin) {
      stopWinInput.value = String(settings.stopWin);
      // StopWin atualizado
    }

    // ✅ CORREÇÃO: Atualizar stopLoss
    const stopLossInput = document.getElementById('stopLoss') as HTMLInputElement;
    if (stopLossInput && settings.stopLoss) {
      stopLossInput.value = String(settings.stopLoss);
      // StopLoss atualizado
    }

    // ✅ CORREÇÃO: Atualizar minConfidence
    const minConfidenceInput = document.getElementById('minConfidence') as HTMLInputElement;
    if (minConfidenceInput && settings.confidence) {
      minConfidenceInput.value = String(settings.confidence);
      // MinConfidence atualizado
    }

    // ✅ CORREÇÃO: Atualizar parâmetros técnicos
    const mhiPeriodsInput = document.getElementById('mhiPeriods') as HTMLInputElement;
    if (mhiPeriodsInput && settings.mhiPeriods) {
      mhiPeriodsInput.value = String(settings.mhiPeriods);
    }

    const emaFastInput = document.getElementById('emaFast') as HTMLInputElement;
    if (emaFastInput && settings.emaFast) {
      emaFastInput.value = String(settings.emaFast);
    }

    const emaSlowInput = document.getElementById('emaSlow') as HTMLInputElement;
    if (emaSlowInput && settings.emaSlow) {
      emaSlowInput.value = String(settings.emaSlow);
    }

    const rsiPeriodsInput = document.getElementById('rsiPeriods') as HTMLInputElement;
    if (rsiPeriodsInput && settings.rsiPeriods) {
      rsiPeriodsInput.value = String(settings.rsiPeriods);
    }

    const autoCloseTimeInput = document.getElementById('autoCloseTime') as HTMLInputElement;
    if (autoCloseTimeInput && settings.autoCloseTime) {
      autoCloseTimeInput.value = String(settings.autoCloseTime);
    }

    const autoCloseProfitInput = document.getElementById('autoCloseProfit') as HTMLInputElement;
    if (autoCloseProfitInput && settings.autoCloseProfit) {
      autoCloseProfitInput.value = String(settings.autoCloseProfit);
    }
  }, [settings.duration, settings.stake, settings.martingale, settings.stopWin, settings.stopLoss, settings.confidence, settings.mhiPeriods, settings.emaFast, settings.emaSlow, settings.rsiPeriods, settings.autoCloseTime, settings.autoCloseProfit]);

  // ===== FUNÇÕES DO GRÁFICO PROFISSIONAL =====
  const initializeProfessionalChart = () => {
    console.log('📊 Inicializando gráfico profissional...');
    
    const canvas = document.getElementById('professionalChart') as HTMLCanvasElement;
    if (!canvas) {
      console.error('❌ Canvas do gráfico profissional não encontrado!');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Contexto do canvas não encontrado!');
      return;
    }

    // Dados iniciais de teste
    const initialData: CandleData[] = [];
    const now = Date.now();
    
    // Gerar 50 velas de teste
    for (let i = 0; i < 50; i++) {
      const time = now - (50 - i) * 60000; // 1 minuto entre velas
      const basePrice = 100 + Math.random() * 10;
      const open = basePrice + (Math.random() - 0.5) * 2;
      const close = open + (Math.random() - 0.5) * 3;
      const high = Math.max(open, close) + Math.random() * 1;
      const low = Math.min(open, close) - Math.random() * 1;
      
      initialData.push({
        x: i,
        o: open,
        h: high,
        l: low,
        c: close,
        t: time
      });
    }

    // Configuração do gráfico
    const chart = new (window as any).Chart(ctx, {
      type: 'candlestick',
      data: {
        datasets: [{
          label: 'Preço',
          data: initialData,
          borderColor: {
            up: '#10b981',
            down: '#ef4444',
            unchanged: '#6b7280'
          },
          backgroundColor: {
            up: 'rgba(16, 185, 129, 0.1)',
            down: 'rgba(239, 68, 68, 0.1)',
            unchanged: 'rgba(107, 114, 128, 0.1)'
          },
          borderWidth: 2,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: '#f1f5f9',
              font: {
                size: 12,
                weight: '600'
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            ticks: {
              color: '#94a3b8',
              font: {
                size: 10
              },
              callback: function(value: any) {
                return 'Vela ' + Math.floor(value);
              }
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
              drawBorder: false
            }
          },
          y: {
            ticks: {
              color: '#94a3b8',
              font: {
                size: 10
              },
              callback: function(value: any) {
                return '$' + value.toFixed(2);
              }
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
              drawBorder: false
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });

    // Armazenar referência do gráfico
    (window as any).professionalChart = chart;
    
    console.log('✅ Gráfico profissional inicializado com sucesso!');
  };

  const updateChartWithCandle = (candleData: CandleData) => {
    const chart = (window as any).professionalChart;
    if (!chart) return;

    const data = chart.data.datasets[0].data;
    data.push(candleData);
    
    // Manter apenas os últimos 100 pontos
    if (data.length > 100) {
      data.shift();
    }
    
    chart.update('none');
  };

  const processTickToCandle = (tick: any) => {
    const now = Date.now();
    const price = parseFloat(tick.quote);
    
    return {
      x: now,
      o: price,
      h: price,
      l: price,
      c: price,
      t: now
    };
  };

  const addTradeMarker = (price: number, type: 'CALL' | 'PUT', time: number) => {
    const chart = (window as any).professionalChart;
    if (!chart) return;

    // Adicionar marcador de trade
    const marker = {
      x: time,
      y: price,
      type: type,
      color: type === 'CALL' ? '#10b981' : '#ef4444'
    };

    // Implementar lógica de marcadores
    console.log(`📍 Marcador de trade adicionado: ${type} em $${price}`);
  };

  const updateCurrentPriceLine = (price: number) => {
    const chart = (window as any).professionalChart;
    if (!chart) return;

    // Atualizar linha de preço atual
    console.log(`💰 Preço atual: $${price}`);
  };

  const calculateEMAValues = (data: CandleData[], period: number) => {
    if (data.length < period) return [];
    
    const emaValues = [];
    const multiplier = 2 / (period + 1);
    
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        emaValues.push(data[i].c);
      } else {
        const ema = (data[i].c * multiplier) + (emaValues[i - 1] * (1 - multiplier));
        emaValues.push(ema);
      }
    }
    
    return emaValues;
  };

  const updateEMAsOnChart = (data: CandleData[]) => {
    const chart = (window as any).professionalChart;
    if (!chart) return;

    const ema8 = calculateEMAValues(data, 8);
    const ema18 = calculateEMAValues(data, 18);

    // Adicionar EMAs ao gráfico
    chart.data.datasets.push({
      label: 'EMA 8',
      data: ema8.map((value, index) => ({ x: index, y: value })),
      borderColor: '#3b82f6',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1
    });

    chart.data.datasets.push({
      label: 'EMA 18',
      data: ema18.map((value, index) => ({ x: index, y: value })),
      borderColor: '#f59e0b',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.1
    });

    chart.update('none');
  };

  const getTimeUnit = (timeframe: string) => {
    switch (timeframe) {
      case '1m': return 'minute';
      case '5m': return 'minute';
      case '15m': return 'minute';
      case '1h': return 'hour';
      default: return 'minute';
    }
  };

  const getTimeframeMilliseconds = (timeframe: string) => {
    switch (timeframe) {
      case '1m': return 60000;
      case '5m': return 300000;
      case '15m': return 900000;
      case '1h': return 3600000;
      default: return 60000;
    }
  };

  const clearChart = () => {
    const chart = (window as any).professionalChart;
    if (!chart) return;

    chart.data.datasets[0].data = [];
    chart.update('none');
  };

  const changeChartType = (type: 'candlestick' | 'line') => {
    const chart = (window as any).professionalChart;
    if (!chart) return;

    chart.config.type = type;
    chart.update('none');
  };

  const changeChartTimeframe = (timeframe: string) => {
    console.log(`⏰ Mudando timeframe para: ${timeframe}`);
    // Implementar lógica de mudança de timeframe
  };

  // ===== FUNÇÃO PARA INICIALIZAR O BOT ORIGINAL =====
  const initializeOriginalBot = () => {
    if (!botContainerRef.current) return;

    // Inserir HTML do bot original - OTIMIZADO PARA MOBILE
    botContainerRef.current.innerHTML = `
      <div class="bot-interface-original" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 20px; padding: 24px; margin: 12px 0; border: 1px solid #334155; box-shadow: 0 12px 40px rgba(0,0,0,0.5); backdrop-filter: blur(10px);">
        <!-- Controles Principais - Design Moderno -->
        <div class="main-controls" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 20px; padding: 24px; margin: 16px 0; box-shadow: 0 12px 40px rgba(0,0,0,0.6); border: 1px solid #475569; backdrop-filter: blur(15px);">
          <div class="control-grid" style="display: grid; gap: 16px;">
            <!-- Token oculto - será preenchido automaticamente -->
            <input type="hidden" id="token" value="">
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

          <!-- Botões de Controle - Design Moderno -->
          <div class="button-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px;">
            <button 
              id="startBtn"
              onclick="startBot()" 
              ${!isLicenseValid ? 'disabled' : ''}
              style="background: ${isLicenseValid ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'}; color: white; border: none; padding: 16px 24px; border-radius: 16px; font-size: 16px; font-weight: 700; cursor: ${isLicenseValid ? 'pointer' : 'not-allowed'}; box-shadow: 0 8px 24px ${isLicenseValid ? 'rgba(16, 185, 129, 0.4)' : 'rgba(107, 114, 128, 0.4)'}; transition: all 0.3s ease; opacity: ${isLicenseValid ? '1' : '0.6'}; width: 100%; min-height: 56px; text-transform: uppercase; letter-spacing: 0.5px;" 
              onmouseover="if(this.style.cursor==='pointer') this.style.transform='scale(1.05) translateY(-2px)'" 
              onmouseout="if(this.style.cursor==='pointer') this.style.transform='scale(1) translateY(0px)'"
              title="${!isLicenseValid ? 'Licença expirada - Renove para continuar' : 'Iniciar trading automático'}">
              ${isLicenseValid ? '🚀 Iniciar Bot' : '🔒 Licença Expirada'}
            </button>
            <button 
              id="stopBtn"
              onclick="stopBot()" 
              style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; padding: 16px 24px; border-radius: 16px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4); transition: all 0.3s ease; width: 100%; min-height: 56px; text-transform: uppercase; letter-spacing: 0.5px;" 
              onmouseover="this.style.transform='scale(1.05) translateY(-2px)'" 
              onmouseout="this.style.transform='scale(1) translateY(0px)'">
              ⏸️ Parar Bot
            </button>
          </div>
        </div>

        <!-- Status Cards - Design Moderno -->
        <div class="status-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin: 20px 0;">
          <div class="status-card" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 16px; border-radius: 16px; text-align: center; border: 2px solid #3b82f6; box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2); backdrop-filter: blur(10px);">
            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Status</div>
            <div class="status-value" id="status" style="font-size: 1rem; font-weight: 700; color: #f1f5f9;">⏳ Aguardando...</div>
          </div>
          <div class="status-card" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 16px; border-radius: 16px; text-align: center; border: 2px solid #10b981; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.2); backdrop-filter: blur(10px);">
            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Saldo</div>
            <div class="status-value" style="font-size: 1.1rem; font-weight: 700; color: #f1f5f9;">$<span id="balance">0</span></div>
          </div>
          <div class="status-card" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 16px; border-radius: 16px; text-align: center; border: 2px solid #8b5cf6; box-shadow: 0 8px 24px rgba(139, 92, 246, 0.2); backdrop-filter: blur(10px);">
            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Lucro</div>
            <div class="status-value" id="profit" style="font-size: 1.1rem; font-weight: 700; color: #f1f5f9;">$0</div>
          </div>
          <div class="status-card" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 16px; border-radius: 16px; text-align: center; border: 2px solid #f59e0b; box-shadow: 0 8px 24px rgba(245, 158, 11, 0.2); backdrop-filter: blur(10px);">
            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Precisão</div>
            <div class="status-value" id="accuracy" style="font-size: 1.1rem; font-weight: 700; color: #f1f5f9;">0%</div>
          </div>
          <div class="status-card" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 16px; border-radius: 16px; text-align: center; border: 2px solid #06b6d4; box-shadow: 0 8px 24px rgba(6, 182, 212, 0.2); backdrop-filter: blur(10px);">
            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Dados</div>
            <div class="status-value" id="dataCount" style="font-size: 1.1rem; font-weight: 700; color: #f1f5f9;">0</div>
          </div>
          <div class="status-card" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 16px; border-radius: 16px; text-align: center; border: 2px solid #84cc16; box-shadow: 0 8px 24px rgba(132, 204, 22, 0.2); backdrop-filter: blur(10px);">
            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Entrada</div>
            <div class="status-value" id="currentStake" style="font-size: 1.1rem; font-weight: 700; color: #f1f5f9;">$1</div>
          </div>
        </div>

        <!-- Gráfico Profissional de Velas -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border: 1px solid #475569; border-radius: 20px; padding: 24px; margin: 20px 0; box-shadow: 0 12px 40px rgba(0,0,0,0.6); backdrop-filter: blur(15px);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="color: #f1f5f9; margin: 0; font-size: 1.2rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">📈 Gráfico Profissional</h3>
            <div style="display: flex; gap: 12px;">
              <select id="chartType" style="background: #0f172a; color: #f1f5f9; border: 1px solid #475569; border-radius: 8px; padding: 8px 12px; font-size: 0.9rem;">
                <option value="candlestick">Velas</option>
                <option value="line">Linha</option>
              </select>
              <select id="timeframe" style="background: #0f172a; color: #f1f5f9; border: 1px solid #475569; border-radius: 8px; padding: 8px 12px; font-size: 0.9rem;">
                <option value="1m">1 Minuto</option>
                <option value="5m">5 Minutos</option>
                <option value="15m">15 Minutos</option>
                <option value="1h">1 Hora</option>
              </select>
            </div>
          </div>
          <div style="position: relative; width: 100%; height: 500px; max-height: 500px; overflow: visible; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
            <canvas id="professionalChart" style="display: block; width: 100%; height: 500px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 2px solid #475569; border-radius: 16px; box-shadow: inset 0 4px 16px rgba(0,0,0,0.3);"></canvas>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-top: 20px; font-size: 0.9rem;">
            <div style="display: flex; align-items: center; gap: 8px; color: #cbd5e1; font-weight: 600; padding: 8px 12px; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid #334155;">
              <div style="width: 16px; height: 4px; background: linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%); border-radius: 4px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(96, 165, 250, 0.3);"></div>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; letter-spacing: 0.5px;">Preço</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; color: #cbd5e1; font-weight: 600; padding: 8px 12px; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid #334155;">
              <div style="width: 16px; height: 4px; background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); border-radius: 4px; border: 1px dashed #f59e0b; flex-shrink: 0; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);"></div>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; letter-spacing: 0.5px;">Operação</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; color: #cbd5e1; font-weight: 600; padding: 8px 12px; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid #334155;">
              <div style="width: 16px; height: 4px; background: linear-gradient(90deg, #10b981 0%, #059669 100%); border-radius: 4px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);"></div>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; letter-spacing: 0.5px;">CALL</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; color: #cbd5e1; font-weight: 600; padding: 8px 12px; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid #334155;">
              <div style="width: 16px; height: 4px; background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%); border-radius: 4px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);"></div>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; letter-spacing: 0.5px;">PUT</span>
            </div>
          </div>
        </div>

        <!-- Log Compacto para Mobile - Design Moderno -->
        <div class="log-container" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 20px; margin: 20px 0; overflow: hidden; border: 1px solid #475569; box-shadow: 0 12px 40px rgba(0,0,0,0.6); backdrop-filter: blur(15px);">
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 16px; border-bottom: 2px solid #475569;">
            <h3 style="color: #f1f5f9; margin: 0; font-size: 1.1rem; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 1px;">📋 Log do Sistema</h3>
          </div>
          <div id="log" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #34d399; padding: 20px; font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace; height: 200px; overflow-y: auto; font-size: 0.9rem; line-height: 1.5; border-radius: 0 0 20px 20px;"></div>
        </div>

        <!-- Histórico Responsivo - Design Moderno -->
        <div class="history-container" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 20px; margin: 20px 0; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.6); border: 1px solid #475569; backdrop-filter: blur(15px);">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 20px; color: #e2e8f0; border-bottom: 2px solid #475569;">
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 1px;">📊 Histórico de Operações</h3>
          </div>
          <div class="table-container" style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; min-width: 500px;">
              <thead>
                <tr style="background: #0f172a;">
                  <th style="border: 1px solid #334155; padding: 8px 6px; text-align: center; font-weight: 600; color: #cbd5e1; font-size: 0.75rem;">Contrato</th>
                  <th style="border: 1px solid #334155; padding: 8px 6px; text-align: center; font-weight: 600; color: #cbd5e1; font-size: 0.75rem;">Sinal</th>
                  <th style="border: 1px solid #334155; padding: 8px 6px; text-align: center; font-weight: 600; color: #cbd5e1; font-size: 0.75rem;">Conf.</th>
                  <th style="border: 1px solid #334155; padding: 8px 6px; text-align: center; font-weight: 600; color: #cbd5e1; font-size: 0.75rem;">Entrada</th>
                  <th style="border: 1px solid #334155; padding: 8px 6px; text-align: center; font-weight: 600; color: #cbd5e1; font-size: 0.75rem;">Resultado</th>
                  <th style="border: 1px solid #334155; padding: 8px 6px; text-align: center; font-weight: 600; color: #cbd5e1; font-size: 0.75rem;">Lucro</th>
                  <th style="border: 1px solid #334155; padding: 8px 6px; text-align: center; font-weight: 600; color: #cbd5e1; font-size: 0.75rem;">Hora</th>
                </tr>
              </thead>
              <tbody id="historyBody" style="color: #e2e8f0;"></tbody>
            </table>
          </div>
        </div>

        <!-- Elementos ocultos mas necessários para o código -->
        <div style="display: none;">
          <div id="mhiSignal"></div>
          <div id="trendSignal"></div>
          <div id="emaSignal"></div>
          <div id="rsiValue"></div>
          <div id="bollingerSignal"></div>
          <div id="fibonacciSignal"></div>
          <div id="suporteValue"></div>
          <div id="resistenciaValue"></div>
          <div id="confidenceValue"></div>
          <div id="finalSignal"></div>
        </div>

        <!-- Campos ocultos para configurações -->
        <div style="display: none;">
          <input type="number" id="stake" value="${settings.stake || 1}" min="0.01" max="1000" step="0.01">
          <input type="number" id="martingale" value="${settings.martingale || 2}" min="2" max="5" step="1">
          <input type="number" id="duration" value="15" min="15" max="15">
          <input type="number" id="stopWin" value="${settings.stopWin || 3}" min="1" max="1000">
          <input type="number" id="stopLoss" value="${settings.stopLoss || -5}" min="-1000" max="-1">
          <input type="number" id="minConfidence" value="${settings.confidence || 70}" min="50" max="90">
          <input type="number" id="mhiPeriods" value="${settings.mhiPeriods || 20}" min="5" max="50">
          <input type="number" id="emaFast" value="${settings.emaFast || 8}" min="5" max="20">
          <input type="number" id="emaSlow" value="${settings.emaSlow || 18}" min="15" max="50">
          <input type="number" id="rsiPeriods" value="${settings.rsiPeriods || 11}" min="7" max="21">
          <input type="number" id="autoCloseTime" value="${settings.autoCloseTime || 30}" min="10" max="300">
          <input type="number" id="autoCloseProfit" value="${settings.autoCloseProfit || 20}" min="5" max="100">
        </div>
      </div>
    `;

    // Inserir JavaScript do bot original - COM CORREÇÃO DO BUG
    const script = document.createElement('script');
    script.innerHTML = `
      // ✅ CORREÇÃO: Disponibilizar dados do usuário para o bot
      window.user = ${JSON.stringify(user)};
      
      // Bot inicializado
    `;
    
    botContainerRef.current.appendChild(script);
    
    // Inserir o código principal do bot
    const mainScript = document.createElement('script');
    mainScript.innerHTML = `
      // ===== FUNÇÃO PARA SALVAR CONFIGURAÇÕES =====
      function saveSettings() {
        const settings = {
          stake: document.getElementById('stake').value,
          martingale: document.getElementById('martingale').value,
          duration: document.getElementById('duration').value,
          stopWin: document.getElementById('stopWin').value,
          stopLoss: document.getElementById('stopLoss').value,
          minConfidence: document.getElementById('minConfidence').value,
          mhiPeriods: document.getElementById('mhiPeriods').value,
          emaFast: document.getElementById('emaFast').value,
          emaSlow: document.getElementById('emaSlow').value,
          rsiPeriods: document.getElementById('rsiPeriods').value,
          autoCloseTime: document.getElementById('autoCloseTime').value,
          autoCloseProfit: document.getElementById('autoCloseProfit').value
        };
        
        // ✅ CORREÇÃO: Salvar com chave específica do usuário
        const userKey = window.user?.id ? \`mvb_bot_settings_\${window.user.id}\` : 'mvb_bot_settings_temp';
        localStorage.setItem(userKey, JSON.stringify(settings));
        
        // Mostrar notificação de sucesso
        window.showToast('✅ Configurações Salvas', 'Suas configurações foram aplicadas com sucesso!');
        
        // ✅ CORREÇÃO: Sincronizar com servidor silenciosamente
        if (window.user?.id) {
          fetch('/api/data?action=settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: window.user.id,
              settings: settings
            })
          }).catch(error => {
            // Silencioso - não mostrar logs desnecessários
          });
        }
      }

      // ===== CARREGAR CONFIGURAÇÕES SALVAS =====
      function loadSettings() {
        // ✅ CORREÇÃO: Usar chave específica do usuário
        const userKey = window.user?.id ? \`mvb_bot_settings_\${window.user.id}\` : 'mvb_bot_settings_temp';
        const savedSettings = localStorage.getItem(userKey);
        if (savedSettings) {
          try {
            const settings = JSON.parse(savedSettings);
            
            // Aplicar configurações salvas
            Object.keys(settings).forEach(key => {
              const element = document.getElementById(key);
              if (element) {
                element.value = settings[key];
              }
            });
            
            // ✅ CORREÇÃO: Removido log desnecessário de carregamento
          } catch (error) {
            addLog('⚠️ Erro ao carregar configurações salvas');
          }
        }
      }

      // ===== VARIÁVEIS GLOBAIS =====
      let ws = null;
      let isRunning = false;
      let currentStake = 1;
      let initialStake = 1;
      let martingaleMultiplier = 2;
      let martingaleLevel = 0;
      let maxMartingale = 3;
      let profit = 0;
      let duration = 1;
      let symbol = "R_10";
      let mhiPeriods = 14;
      let emaFast = 9;
      let emaSlow = 21;
      let rsiPeriods = 11; // ✅ AJUSTADO: Menos sensível
      let minConfidence = 50; // ✅ AJUSTADO: Menos restritivo para mais operações

      let stats = {
        total: 0,
        wins: 0,
        losses: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0
      };
      
      // Histórico de trades para relatório detalhado
      let tradeHistory = [];

      // ===== FUNÇÕES DE PERSISTÊNCIA DO ESTADO =====
      function saveBotState() {
        const botState = {
          isRunning,
          currentStake,
          initialStake,
          martingaleLevel,
          profit,
          stats,
          symbol,
          duration,
          timestamp: Date.now()
        };
        localStorage.setItem('bot_state', JSON.stringify(botState));
        // Estado do bot salvo
        
        // ✅ NOVO: Salvar performance no banco de dados
        savePerformanceToDatabase();
      }
      
      // ✅ NOVO: Função para salvar performance no banco
      function savePerformanceToDatabase() {
        if (!window.user?.id) return;
        
        try {
          const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
          
          // Calcular retorno mensal baseado na performance atual
          let monthlyReturn = 0;
          if (stats.total > 0) {
            const avgProfitPerTrade = profit / stats.total;
            const tradesPerDay = Math.min(stats.total, 10);
            const dailyReturn = avgProfitPerTrade * tradesPerDay;
            monthlyReturn = (dailyReturn * 30) / initialStake * 100;
            monthlyReturn = Math.min(Math.max(monthlyReturn, -50), 100);
          }
          
          const performanceData = {
            total_profit: profit,
            total_trades: stats.total,
            wins: stats.wins,
            losses: stats.losses,
            win_rate: winRate,
            monthly_return: monthlyReturn,
            last_session_profit: profit,
            last_session_trades: stats.total
          };
          
          // Salvar no banco de dados
          fetch('/api/data?action=performance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: window.user.id,
              performance_data: performanceData
            })
          }).then(response => {
            if (response.ok) {
              // Performance salva no banco
            } else {
              // Erro ao salvar performance no banco
            }
          }).catch(error => {
            // Erro de rede ao salvar performance
          });
          
        } catch (error) {
          // Erro ao salvar performance
        }
      }

      // Salvar estado periodicamente enquanto bot está rodando
      setInterval(() => {
        if (isRunning) {
          saveBotState();
        }
      }, 5000); // Salva a cada 5 segundos quando bot está ativo

      function restoreBotState() {
        const savedState = localStorage.getItem('bot_state');
        if (savedState) {
          try {
            const state = JSON.parse(savedState);
            // ✅ CORREÇÃO: Verificar se o estado tem menos de 30 minutos (1800000ms)
            if (Date.now() - state.timestamp < 1800000) {
              currentStake = state.currentStake || initialStake;
              martingaleLevel = state.martingaleLevel || 0;
              profit = state.profit || 0;
              stats = state.stats || stats;
              
              // Atualizar UI
              document.getElementById('profit').innerText = "$" + profit.toFixed(2);
              document.getElementById('currentStake').textContent = "$" + currentStake;
              
              if (stats.total > 0) {
                const accuracy = ((stats.wins / stats.total) * 100).toFixed(1);
                document.getElementById('accuracy').textContent = \`\${accuracy}%\`;
              }
              
              // Estado do bot restaurado
              // ✅ CORREÇÃO: Removido log desnecessário de restauração
            } else {
              // Estado antigo descartado
              localStorage.removeItem('bot_state');
            }
          } catch (error) {
            console.error('❌ Erro ao restaurar estado:', error);
          }
        }
      }

      let martingaleLevel_current = 0;
      let maxMartingale_current = 3;
      let priceData = [];
      let volumeData = [];
      let priceChart = null; // Instância do Chart.js
      let chartData = []; // Dados específicos para o gráfico
      let persistentChartData = []; // Dados persistentes do gráfico (não perdem na reconexão)
      let isTrading = false;
      let lastTradeTime = 0;
      let minTradeInterval = 60000;
      let autoCloseTimer = null; // Timer para fechamento por tempo
      let currentContractId = null; // ID do contrato atual
      let contractBuyPrice = 0; // Preço de compra do contrato
      let profitCheckInterval = null; // Intervalo para verificar lucro
      let tentouFechar = false; // ✅ Flag para evitar múltiplas tentativas de fechamento
      let velasSemOperarAposHistorico = 0; // ✅ NOVO: Contador de velas após carregar histórico
      let historicoCarregado = false; // ✅ NOVO: Flag para saber se histórico foi carregado
      let ultimoMinutoProcessado = 0; // ✅ NOVO: Controlar contagem de velas de 1 minuto
      let suporteResistencia = { suporte: 0, resistencia: 0, forca: 0 }; // ✅ NOVO: Suporte e resistência de 24h
      let savedToken = ''; // ✅ NOVO: Armazenar token para reconexões automáticas

      const WEBSOCKET_ENDPOINTS = [
        "wss://ws.binaryws.com/websockets/v3",
        "wss://ws.derivws.com/websockets/v3"
      ];

      // ===== FUNÇÕES UTILITÁRIAS =====
      function addLog(message) {
        const logElement = document.getElementById("log");
        if (logElement) {
          const timestamp = new Date().toLocaleTimeString();
          logElement.innerHTML += \`[\${timestamp}] \${message}<br>\`;
          logElement.scrollTop = logElement.scrollHeight;
        }
      }

      // ===== FUNÇÕES DO GRÁFICO =====
      
      function initializeChart() {
        try {
          console.log('🚀 Inicializando gráfico...');
          
          // Destruir gráfico existente se houver
          if (priceChart) {
            priceChart.destroy();
            priceChart = null;
          }
          
          // Verificar se Chart.js está disponível
          if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js não está carregado!');
            return;
          }
          
          const canvas = document.getElementById('priceChart');
          if (!canvas) {
            console.error('❌ Canvas do gráfico não encontrado!');
            return;
          }
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('❌ Contexto do canvas não disponível!');
            return;
          }
          
          // Configurar dimensões do canvas
          const container = canvas.parentElement;
          canvas.width = container.offsetWidth;
          canvas.height = 300;
          
          // Limpar dados - gráfico só mostra durante operação
          chartData = [];
          persistentChartData = [];
          console.log('📊 Gráfico inicializado vazio - aguardando operação');
          
          // Criar instância do Chart.js
          priceChart = new Chart(ctx, {
            type: 'line',
            data: {
              datasets: [
                {
                  label: 'Preço do Ativo',
                  data: [],
                  borderColor: '#60a5fa',
                  backgroundColor: 'rgba(96, 165, 250, 0.1)',
                  borderWidth: 2,
                  pointRadius: 2,
                  pointBackgroundColor: '#60a5fa',
                  pointBorderColor: '#60a5fa',
                  fill: true,
                  tension: 0.4
                },
                {
                  label: 'Linha de Operação',
                  data: [],
                  borderColor: '#f59e0b',
                  backgroundColor: 'transparent',
                  borderWidth: 2,
                  borderDash: [5, 5],
                  pointRadius: 0,
                  pointHoverRadius: 0,
                  fill: false,
                  tension: 0
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  enabled: true,
                  mode: 'index',
                  intersect: false
                }
              },
              scales: {
                x: {
                  type: 'time',
                  time: {
                    unit: 'second',
                    displayFormats: {
                      second: 'HH:mm:ss',
                      minute: 'HH:mm'
                    }
                  },
                  display: true,
                  grid: {
                    color: '#475569',
                    drawBorder: false
                  },
                  ticks: {
                    color: '#cbd5e1',
                    font: {
                      size: 10
                    },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 12 // Mais ticks para 1 hora de dados
                  }
                },
                y: {
                  display: true,
                  position: 'right',
                  grid: {
                    color: '#475569',
                    drawBorder: false
                  },
                  ticks: {
                    color: '#cbd5e1',
                    font: {
                      size: 10,
                      weight: 'bold'
                    },
                    callback: function(value) {
                      return value.toFixed(2);
                    }
                  },
                  // Escala dinâmica do eixo Y baseada nos dados reais
                  min: function(context) {
                    const data = context.chart.data.datasets[0].data;
                    if (data.length === 0) return undefined;
                    const values = data.map(d => d.y);
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    const range = max - min;
                    return min - (range * 0.1); // 10% de margem
                  },
                  max: function(context) {
                    const data = context.chart.data.datasets[0].data;
                    if (data.length === 0) return undefined;
                    const values = data.map(d => d.y);
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    const range = max - min;
                    return max + (range * 0.1); // 10% de margem
                  }
                }
              },
              interaction: {
                intersect: false,
                mode: 'index'
              }
            }
          });
          
          console.log('✅ Gráfico criado, canvas width:', canvas.width, 'height:', canvas.height);
          console.log('📊 Canvas element:', canvas);
          console.log('📊 Chart instance:', priceChart);
          console.log('📊 Chart data:', priceChart.data);
          
          // Linha de operação será criada apenas quando bot operar
          
          // Se há dados persistentes, é uma reconexão
          if (persistentChartData.length > 0) {
            console.log('🔄 Reconexão detectada - gráfico restaurado com', persistentChartData.length, 'pontos');
          }
          
          console.log('✅ Gráfico inicializado com sucesso!');
          
        } catch (error) {
          console.error('❌ Erro ao inicializar gráfico:', error);
        }
      }
      
      function createOperationLine() {
        if (!priceChart) {
          console.warn('⚠️ priceChart não existe para criar linha de operação');
          return;
        }
        
        try {
          const now = Date.now();
          const operationPrice = 5700.0; // Preço de referência fixo
          
          // Criar pontos para linha horizontal (início e fim do gráfico)
          const operationData = [
            { x: now - 300000, y: operationPrice }, // 5 minutos atrás
            { x: now + 300000, y: operationPrice }  // 5 minutos no futuro
          ];
          
          console.log('📏 Criando linha de operação:', operationData);
          console.log('📊 Datasets disponíveis:', priceChart.data.datasets.length);
          
          // Verificar se dataset 1 existe
          if (priceChart.data.datasets[1]) {
            priceChart.data.datasets[1].data = operationData;
            priceChart.update('none');
            console.log('✅ Linha de operação criada em:', operationPrice);
          } else {
            console.error('❌ Dataset 1 não existe!');
          }
          
        } catch (error) {
          console.error('❌ Erro ao criar linha de operação:', error);
        }
      }
      
      function updatePriceChart(price) {
        if (!priceChart) return;
        if (!price) return;
        
        // Só atualizar se houver operação ativa
        if (chartData.length === 0) return;
        
        try {
          const now = new Date();
          const timestamp = now.getTime();
          
          const newPoint = {
            x: timestamp,
            y: price
          };
          
          chartData.push(newPoint);
          persistentChartData.push(newPoint);
          
          // Limitar a 15 minutos (180 pontos)
          if (chartData.length > 180) {
            chartData = chartData.slice(-180);
          }
          
          if (persistentChartData.length > 180) {
            persistentChartData = persistentChartData.slice(-180);
          }
          
          priceChart.data.datasets[0].data = chartData;
          priceChart.update('none');
          
          // Log removido para reduzir poluição no console
          
        } catch (error) {
          console.error('❌ Erro ao atualizar gráfico:', error);
        }
      }
      
      function addEntryLine(price, signal, timestamp) {
        if (!priceChart) return;
        
        try {
          const color = signal === 'CALL' ? '#10b981' : '#ef4444';
          const label = signal === 'CALL' ? 'CALL' : 'PUT';
          
          // Limpar dados anteriores e iniciar novo gráfico para esta operação
          chartData = [];
          persistentChartData = [];
          
          // Adicionar ponto inicial da operação
          chartData.push({ x: timestamp, y: price });
          persistentChartData.push({ x: timestamp, y: price });
          
          // Criar linha de operação (amarela tracejada) com duração de 15 minutos
          const operationData = [
            { x: timestamp, y: price },
            { x: timestamp + (15 * 60 * 1000), y: price } // 15 minutos
          ];
          
          priceChart.data.datasets[1].data = operationData;
          priceChart.data.datasets[0].data = chartData;
          console.log('📏 Gráfico iniciado - Operação', label, 'em:', price);
          
          priceChart.update('none');
          
          // Resetar gráfico após 15 minutos (fim da operação)
          setTimeout(() => {
            resetChart();
          }, 15 * 60 * 1000); // 15 minutos
          
        } catch (error) {
          console.error('❌ Erro ao adicionar linha de entrada:', error);
        }
      }
      
      function resetChart() {
        if (!priceChart) return;
        
        try {
          // Limpar todos os dados
          chartData = [];
          persistentChartData = [];
          priceChart.data.datasets[0].data = [];
          priceChart.data.datasets[1].data = [];
          priceChart.update('none');
          console.log('🔄 Gráfico resetado - aguardando nova operação');
        } catch (error) {
          console.error('❌ Erro ao resetar gráfico:', error);
        }
      }
      
      function removeEntryLine(timestamp) {
        if (!priceChart) return;
        
        try {
          // Remover dataset da linha de entrada
          priceChart.data.datasets = priceChart.data.datasets.filter((dataset, index) => {
            if (index === 0) return true; // Manter dataset principal do preço
            return dataset.data[0]?.x !== timestamp;
          });
          
          priceChart.update('none');
          
        } catch (error) {
          console.error('❌ Erro ao remover linha de entrada:', error);
        }
      }

      // ===== FUNÇÕES PRINCIPAIS DO BOT =====
      
      // ✅ FUNÇÃO: Buscar dados históricos de 24 HORAS da Deriv
      function loadHistoricalData(websocket, symbol) {
        addLog(\`📊 Solicitando dados históricos de \${symbol}...\`);
        
        // Solicitar candles de 5 minutos das últimas 288 velas (24 horas)
        // 288 velas de 5 minutos = 24 horas (288 * 5 = 1440 minutos = 24h)
        // Isso fornece uma análise muito mais robusta e segura
        const historyRequest = {
          ticks_history: symbol,
          adjust_start_time: 1,
          count: 288, // 288 velas de 5 minutos = 24 horas
          end: "latest",
          granularity: 300, // 300 segundos = 5 minutos por vela
          style: "candles"
        };
        
        websocket.send(JSON.stringify(historyRequest));
        addLog(\`⏳ Aguardando 288 candles de 5 minutos (24 horas)...\`);
        addLog(\`📈 Análise robusta: Estratégia Zeus\`);
      }
      
      function startBot() {
        // ✅ VERIFICAR LICENÇA ANTES DE INICIAR
        if (!window.isLicenseValid) {
          window.showToast('🔒 Licença Expirada', 'Sua licença expirou! Renove para continuar usando o bot.', 'destructive');
          addLog('❌ Tentativa de iniciar bot bloqueada: Licença expirada!');
          return;
        }
        
        if (isRunning) {
          window.showToast('⚠️ Bot em Execução', 'O bot já está rodando!', 'destructive');
          return;
        }

        // ✅ CORREÇÃO: Verificar token diretamente das configurações se campo estiver vazio
        let token = document.getElementById("token").value.trim();
        
        if (!token) {
          // Tentar pegar token das configurações do localStorage
          try {
            const userKey = window.user?.id ? \`mvb_bot_settings_\${window.user.id}\` : 'mvb_bot_settings_temp';
            const savedSettings = JSON.parse(localStorage.getItem(userKey) || '{}');
            
            const selectedToken = savedSettings.selectedTokenType === 'demo' 
              ? savedSettings.derivTokenDemo 
              : savedSettings.derivTokenReal;
            
            if (selectedToken) {
              token = selectedToken;
              // Atualizar o campo para próxima vez
              document.getElementById("token").value = token;
              addLog('✅ Token carregado das configurações automaticamente');
            }
          } catch (error) {
            console.error('Erro ao carregar token das configurações:', error);
          }
        }
        
        // ✅ Salvar token globalmente para reconexões
        savedToken = token;
        
        // Debug token
        
        if (!token) {
          window.showToast('❌ Token Necessário', 'Configure o token da Deriv na aba Configurações!', 'destructive');
          addLog('❌ Token não encontrado. Verifique se está configurado na aba Configurações.');
          return;
        }
        
        // Disparar evento de bot iniciado
        window.dispatchEvent(new Event('bot-started'));

        // Carregar configurações dos campos
        initialStake = parseFloat(document.getElementById("stake").value) || 1;
        currentStake = initialStake;
        martingaleMultiplier = Math.round(parseFloat(document.getElementById("martingale").value) || 2);
        const stopWin = parseFloat(document.getElementById("stopWin").value) || 10;
        const stopLoss = parseFloat(document.getElementById("stopLoss").value) || -10;
        duration = parseInt(document.getElementById("duration").value) || 1;
        symbol = document.getElementById("symbol").value;
        mhiPeriods = parseInt(document.getElementById("mhiPeriods").value) || 14;
        emaFast = parseInt(document.getElementById("emaFast").value) || 9;
        emaSlow = parseInt(document.getElementById("emaSlow").value) || 21;
        rsiPeriods = parseInt(document.getElementById("rsiPeriods").value) || 14;
        minConfidence = parseInt(document.getElementById("minConfidence").value) || 70;
        
        // ✅ NOVO: Garantir que autoCloseProfit está configurado
        const autoCloseProfitField = document.getElementById("autoCloseProfit");
        if (autoCloseProfitField && !autoCloseProfitField.value) {
          // Tentar carregar das configurações salvas
          try {
            const userKey = window.user?.id ? \`mvb_bot_settings_\${window.user.id}\` : 'mvb_bot_settings_temp';
            const savedSettings = JSON.parse(localStorage.getItem(userKey) || '{}');
            if (savedSettings.autoCloseProfit) {
              autoCloseProfitField.value = savedSettings.autoCloseProfit;
              addLog(\`✅ Percentual de fechamento carregado: \${savedSettings.autoCloseProfit}%\`);
            }
          } catch (error) {
            console.error('Erro ao carregar autoCloseProfit:', error);
          }
        }

        priceData = [];
        volumeData = [];
        isTrading = false;
        martingaleLevel_current = 0;
        lastTradeTime = 0;
        stats = { total: 0, wins: 0, losses: 0, consecutiveWins: 0, consecutiveLosses: 0 };
        profit = 0;
        
        // ✅ RESETAR variáveis de análise de histórico
        velasSemOperarAposHistorico = 0;
        historicoCarregado = false;
        ultimoMinutoProcessado = 0;

        addLog(\`🚀 Iniciando Zeus - Par: \${symbol}\`);
        addLog(\`⚙️ Configurações: MHI(\${mhiPeriods}) | EMA(\${emaFast}/\${emaSlow}) | RSI(\${rsiPeriods})\`);
        document.getElementById("status").innerText = "🔄 Conectando...";
        updateMartingaleStatus();
        updateAccuracy();
        updateDataCount();
        document.getElementById("profit").innerText = "$0";

        ws = connectWebSocket(token);
      }

      function connectWebSocket(token, endpointIndex = 0, tentativaReconexao = 0) {
        // ✅ Usar token salvo se não foi passado (reconexão automática)
        const tokenToUse = token || savedToken;
        
        if (!tokenToUse) {
          addLog("❌ Token não disponível para reconexão.");
          return null;
        }
        
        if (endpointIndex >= WEBSOCKET_ENDPOINTS.length) {
          // ✅ Se todos os endpoints falharam, reiniciar do primeiro após 5 segundos
          if (isRunning) {
            tentativaReconexao++;
            addLog(\`⚠️ Todos os endpoints falharam. Tentativa \${tentativaReconexao} - Reiniciando em 5s...\`);
            setTimeout(() => {
              ws = connectWebSocket(tokenToUse, 0, tentativaReconexao);
            }, 5000);
          } else {
            addLog("❌ Todos os endpoints falharam. Bot parado.");
          }
          return null;
        }

        const endpoint = WEBSOCKET_ENDPOINTS[endpointIndex] + "?app_id=1089";
        
        try {
          const websocket = new WebSocket(endpoint);
          
          websocket.onopen = () => {
            addLog(\`✅ WebSocket conectado! (Endpoint \${endpointIndex + 1}/\${WEBSOCKET_ENDPOINTS.length})\`);
            document.getElementById("status").innerText = "🔐 Autenticando...";
            websocket.send(JSON.stringify({ authorize: tokenToUse }));
            tentativaReconexao = 0; // Reset contador ao conectar com sucesso
            
            // Inicializar gráfico após conectar
            setTimeout(() => {
              initializeChart();
              // Inicializar gráfico profissional
              if (typeof initializeProfessionalChart === 'function') {
                initializeProfessionalChart();
              }
            }, 1000);
          };

          websocket.onmessage = (event) => {
            handleWebSocketMessage(event, websocket);
          };

          websocket.onclose = (event) => {
            if (!event.wasClean && isRunning) {
              addLog(\`🔴 Conexão perdida (Endpoint \${endpointIndex + 1}). Tentando próximo endpoint...\`);
              setTimeout(() => {
                ws = connectWebSocket(tokenToUse, endpointIndex + 1, tentativaReconexao);
              }, 2000);
            } else if (!isRunning) {
              addLog("ℹ️ WebSocket fechado (bot parado).");
            }
          };

          websocket.onerror = (error) => {
            addLog(\`❌ Erro de conexão no endpoint \${endpointIndex + 1}.\`);
          };

          return websocket;
        } catch (error) {
          addLog(\`❌ Erro ao criar WebSocket no endpoint \${endpointIndex + 1}\`);
          // Tentar próximo endpoint imediatamente
          setTimeout(() => {
            ws = connectWebSocket(tokenToUse, endpointIndex + 1, tentativaReconexao);
          }, 1000);
          return null;
        }
      }

      function handleWebSocketMessage(event, websocket) {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            addLog(\`❌ ERRO: \${data.error.message}\`);
            if (data.error.code === 'InvalidToken') {
              document.getElementById("status").innerText = "❌ Token Inválido";
              stopBot();
            }
            return;
          }

          if (data.msg_type === "authorize") {
            addLog("🔐 Autenticado com sucesso!");
            document.getElementById("status").innerText = "🔐 Autenticado";
            
            // ✅ Estrutura correta da API Deriv: data.authorize possui loginid, balance, currency, etc
            const accountInfo = data.authorize;
            if (accountInfo) {
              const loginid = accountInfo.loginid || 'N/A';
              const currency = accountInfo.currency || 'USD';
              
              // Detectar tipo de conta pelo loginid (VRTC = Virtual/Demo, CR = Real)
              let accountType = 'N/A';
              if (loginid.startsWith('VRTC') || loginid.startsWith('VRT')) {
                accountType = 'DEMO';
              } else if (loginid.startsWith('CR') || loginid.startsWith('MF')) {
                accountType = 'REAL';
              }
              
              addLog(\`👤 Conta: \${loginid} | Tipo: \${accountType} | Moeda: \${currency}\`);
              
              // Salvar informações de autorização
              localStorage.setItem('deriv_auth_data', JSON.stringify({
                loginid: loginid,
                account_type: accountType,
                currency: currency,
                timestamp: Date.now()
              }));
              
              // Detectar se é conta demo ou real
              if (accountType === 'DEMO') {
                addLog("ℹ️ Conta DEMO detectada");
              } else if (accountType === 'REAL') {
                addLog("⚠️ CONTA REAL detectada - ATENÇÃO!");
              }
              
              // ✅ NOVO: Criar sessão no banco de dados para sincronização com Telegram
              if (window.user?.id) {
                const stopWin = parseFloat(document.getElementById("stopWin").value) || 3;
                const stopLoss = parseFloat(document.getElementById("stopLoss").value) || -5;
                const chatId = localStorage.getItem('telegram_settings') ? JSON.parse(localStorage.getItem('telegram_settings')).userTelegram : null;
                
                fetch('/api/data?action=create_bot_session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    user_id: window.user.id,
                    telegram_chat_id: chatId,
                    source: 'web',
                    symbol: symbol,
                    account_type: accountType.toLowerCase(),
                    stake: initialStake,
                    martingale: martingaleMultiplier,
                    duration: duration,
                    stop_win: stopWin,
                    stop_loss: stopLoss,
                    confidence: minConfidence,
                    strategy: 'zeus'
                  })
                }).then(res => res.json()).then(data => {
                  if (data.success) {
                    window.botSessionId = data.session_id;
                    addLog(\`✅ Sessão criada no banco (ID: \${data.session_id})\`);
                  }
                }).catch(err => {
                  console.error('❌ Erro ao criar sessão:', err);
                });
              }
            }
            
            // ✅ NOVO: Buscar dados históricos ANTES de subscrever ticks
            loadHistoricalData(websocket, symbol);
            
            websocket.send(JSON.stringify({ balance: 1, subscribe: 1 }));
            websocket.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
            addLog(\`📊 Monitorando: \${symbol}\`);
          }

          // ✅ PROCESSAR DADOS HISTÓRICOS (Candles de 1 hora)
          if (data.msg_type === "history" || data.msg_type === "candles") {
            const candles = data.candles || [];
            const prices = data.history?.prices || [];
            const times = data.history?.times || [];
            
            if (candles.length > 0) {
              // Preencher priceData com candles históricos (melhor para análise)
              priceData = [];
              volumeData = [];
              
              for (let i = 0; i < candles.length; i++) {
                const candle = candles[i];
                priceData.push({
                  high: parseFloat(candle.high),
                  low: parseFloat(candle.low),
                  close: parseFloat(candle.close),
                  open: parseFloat(candle.open),
                  timestamp: candle.epoch
                });
                volumeData.push(1); // Volume padrão
              }
              
              addLog(\`✅ \${priceData.length} velas históricas carregadas (24 HORAS)!\`);
              addLog(\`📊 Analisando tendência de 24h do mercado antes de operar...\`);
              addLog(\`📈 Indicadores robustos: MHI(\${mhiPeriods}) EMA(\${emaFast}/\${emaSlow}) RSI(\${rsiPeriods}) Fibonacci\`);
              addLog(\`⏳ Aguardando 5 velas de 1min antes de operar (5min para estabilizar)...\`);
              historicoCarregado = true; // ✅ Marcar que histórico foi carregado
              velasSemOperarAposHistorico = 0; // ✅ Resetar contador
              ultimoMinutoProcessado = Math.floor(Date.now() / 1000 / 60); // ✅ Inicializar contador de minutos
              updateDataCount();
              document.getElementById("status").innerText = "⏳ Analisando 24h...";
            } else if (prices.length > 0) {
              // Fallback: processar ticks simples se candles não estiverem disponíveis
              priceData = [];
              volumeData = [];
              
              for (let i = 0; i < prices.length; i++) {
                priceData.push({
                  high: prices[i],
                  low: prices[i],
                  close: prices[i],
                  timestamp: times[i]
                });
                volumeData.push(1);
              }
              
              addLog(\`✅ \${priceData.length} ticks históricos carregados!\`);
              addLog(\`📊 Indicadores prontos: MHI(\${mhiPeriods}) EMA(\${emaFast}/\${emaSlow}) RSI(\${rsiPeriods})\`);
              updateDataCount();
              document.getElementById("status").innerText = "✅ Pronto para operar";
            } else {
              addLog("⚠️ Nenhum dado histórico recebido");
            }
          }

          if (data.msg_type === "balance") {
            const balance = data.balance?.balance || 0;
            const currency = data.balance?.currency || 'USD';
            const loginid = data.balance?.loginid || '';
            
            // ✅ CORREÇÃO: Detectar conta demo baseado em múltiplos critérios
            let accountType = 'REAL';
            
            // Critério 1: Login ID (VRTC = Virtual/Demo)
            if (loginid.startsWith('VRTC') || loginid.includes('VR')) {
              accountType = 'DEMO';
            }
            // Critério 2: Saldo muito alto geralmente indica conta demo
            else if (balance >= 10000) {
              accountType = 'DEMO';
            }
            // Critério 3: Verificar se temos informação do account_type da autorização
            else {
              // Buscar informações da autorização se disponível
              const authData = localStorage.getItem('deriv_auth_data');
              if (authData) {
                try {
                  const parsed = JSON.parse(authData);
                  if (parsed.account_type && 
                      (parsed.account_type.toLowerCase().includes('demo') || 
                       parsed.account_type.toLowerCase().includes('virtual'))) {
                    accountType = 'DEMO';
                  }
                } catch (e) {
                  // Ignorar erro de parsing
                }
              }
            }
            
            // ✅ CORREÇÃO: Atualizar interface para refletir o tipo de conta detectado
            const detectedTokenType = accountType === 'DEMO' ? 'demo' : 'real';
            
            // Usar updateSetting se disponível, senão apenas log
            try {
              if (typeof updateSetting === 'function') {
                updateSetting('selectedTokenType', detectedTokenType);
                addLog(\`🔄 Tipo de conta detectado: \${accountType} - Interface atualizada\`);
              } else {
                addLog(\`🔄 Tipo de conta detectado: \${accountType}\`);
              }
            } catch (error) {
              addLog(\`🔄 Tipo de conta detectado: \${accountType}\`);
            }
            
            document.getElementById("balance").innerText = balance;
            addLog(\`💰 Saldo: $\${balance} \${currency} (Conta \${accountType})\`);
            
            // ✅ CORREÇÃO: Detectar tipo de conta automaticamente
            if (accountType === 'REAL') {
              addLog("⚠️ ATENÇÃO: Bot conectado em CONTA REAL!");
            } else {
              addLog("ℹ️ Bot conectado em conta DEMO");
            }
            
            if (!isRunning) {
              isRunning = true;
              addLog("✅ Bot ativo e analisando!");
              document.getElementById("status").innerText = "📊 Analisando...";
            }
          }

          if (data.msg_type === "tick") {
            processTick(data.tick, websocket);
          }

          if (data.msg_type === "proposal") {
            addLog(\`📋 Proposta recebida\`);
            const buyRequest = { buy: data.proposal.id, price: currentStake };
            websocket.send(JSON.stringify(buyRequest));
          }

          if (data.msg_type === "buy") {
            if (data.buy.error) {
              addLog(\`❌ Erro na compra: \${data.buy.error.message}\`);
              isTrading = false;
              return;
            }
            
            addLog(\`✅ Contrato ID: \${data.buy.contract_id}\`);
            
            // ✅ NOVO: Salvar contract_id para fechamento automático
            currentContractId = data.buy.contract_id;
            tentouFechar = false; // ✅ Resetar flag de fechamento para novo contrato
            
            websocket.send(JSON.stringify({ 
              proposal_open_contract: 1, 
              subscribe: 1, 
              contract_id: data.buy.contract_id 
            }));
          }

          if (data.msg_type === "proposal_open_contract") {
            const contract = data.proposal_open_contract;
            
            // ✅ Verificar se o trade já foi vendido
            if (contract.is_sold) {
              handleTradeResult(contract);
              return;
            }
            
            // ✅ ESTRATÉGIA DE FECHAMENTO: Verificar percentual de lucro configurável
            if (contract.bid_price && contract.buy_price) {
              const currentPrice = parseFloat(contract.bid_price);
              const buyPrice = parseFloat(contract.buy_price);
              const profitPercentage = ((currentPrice - buyPrice) / buyPrice) * 100;
              
              // Obter percentual de fechamento configurado
              const autoCloseProfitElement = document.getElementById('autoCloseProfit');
              const autoCloseProfitThreshold = parseFloat(autoCloseProfitElement?.value || '30');
              
              // Debug removido para reduzir poluição no console
              
              // Log do P&L atual (sempre mostrar quando positivo)
              if (profitPercentage > 0) {
                addLog(\`💰 Lucro atual: +\${profitPercentage.toFixed(1)}% (Meta: \${autoCloseProfitThreshold}%) - $\${currentPrice.toFixed(2)} / $\${buyPrice.toFixed(2)}\`);
              }
              
              // ✅ FECHAR se lucro >= percentual configurado E ainda não tentou fechar
              if (profitPercentage >= autoCloseProfitThreshold && !tentouFechar) {
                addLog(\`🎯 META ATINGIDA! Lucro de \${profitPercentage.toFixed(1)}% >= \${autoCloseProfitThreshold}% - Tentando fechar trade...\`);
                
                // ✅ VERIFICAR se o contrato permite venda (is_valid_to_sell)
                if (contract.is_valid_to_sell === 1 && !contract.is_expired && !contract.is_sold) {
                  tentouFechar = true; // Marcar que já tentou fechar
                  
                  addLog(\`✅ Contrato permite revenda - Enviando comando de venda...\`);
                  
                    // Fechar o trade
                    websocket.send(JSON.stringify({ 
                      sell: contract.contract_id, 
                      price: 0 
                    }));
                    
                    // Limpar timers
                    if (autoCloseTimer) clearTimeout(autoCloseTimer);
                    if (profitCheckInterval) clearInterval(profitCheckInterval);
                } else {
                  // Revenda não permitida neste momento
                  if (!tentouFechar) {
                    addLog(\`⏳ Revenda não disponível ainda (is_valid_to_sell=\${contract.is_valid_to_sell}) - Aguardando...\`);
                    tentouFechar = true; // Evitar spam de logs
                    
                    // Tentar novamente em 2 segundos
                    setTimeout(() => {
                      tentouFechar = false;
                    }, 2000);
                  }
                }
              }
            }
          }

          // ✅ PROCESSAR resultado de venda (sell)
          if (data.msg_type === "sell") {
            if (data.error) {
              addLog(\`❌ ERRO: \${data.error.message}\`);
              
              // Se o erro for "resale not offered", resetar flag para tentar depois
              if (data.error.message.includes("not offered")) {
                setTimeout(() => {
                  tentouFechar = false;
                }, 2000);
              }
            } else {
              addLog(\`✅ Venda realizada com sucesso! Preço: $\${data.sell?.sold_for || '0.00'}\`);
              tentouFechar = false; // Resetar para próximo trade
            }
          }

        } catch (error) {
          addLog(\`❌ Erro processando mensagem: \${error.message}\`);
        }
      }

      function processTick(tick, websocket) {
        try {
          if (!tick || !tick.quote) {
            addLog("⚠️ Tick inválido recebido");
            return;
          }
          
          const price = parseFloat(tick.quote);
          const timestamp = Math.floor(Date.now() / 1000);
          const volume = tick.volume || 1;
          
          const timeSinceLastTrade = Date.now() - lastTradeTime;
          if (timeSinceLastTrade < minTradeInterval && lastTradeTime > 0) return;
          
          priceData.push({ high: price, low: price, close: price, timestamp: timestamp });
          volumeData.push(volume);
          
          // Atualizar gráfico com novo preço
          updatePriceChart(price);
          
          // ✅ MANTER histórico de 24h (288 velas) + margem para novos ticks
          const maxDataPoints = Math.max(mhiPeriods, emaSlow, rsiPeriods, 288) + 50;
          if (priceData.length > maxDataPoints) {
            priceData = priceData.slice(-maxDataPoints);
            volumeData = volumeData.slice(-maxDataPoints);
          }
          
          // ✅ PRÁTICO: Contar apenas velas de 1 minuto (não ticks)
          if (historicoCarregado && velasSemOperarAposHistorico < 5) {
            const currentMinute = Math.floor(timestamp / 60); // Minuto atual (timestamp em segundos)
            
            // Só incrementar se mudou o minuto (nova vela de 1 minuto)
            if (currentMinute > ultimoMinutoProcessado) {
              ultimoMinutoProcessado = currentMinute;
              velasSemOperarAposHistorico++;
              addLog(\`⏳ Vela \${velasSemOperarAposHistorico}/5 após histórico (1min cada = \${velasSemOperarAposHistorico}min)...\`);
              
              if (velasSemOperarAposHistorico >= 5) {
                addLog(\`✅ Análise de 24h + 5min completas! Bot pronto para operar.\`);
              document.getElementById("status").innerText = "✅ Pronto para operar";
              }
            }
          }
          
          updateDataCount();
          
          // ✅ PRÁTICO: Só operar após aguardar 5 velas de 1min do histórico (5min)
          if (priceData.length >= Math.max(mhiPeriods, emaSlow, rsiPeriods) && isRunning && !isTrading) {
            // ✅ Verificar se já aguardou 5 velas após histórico
            if (historicoCarregado && velasSemOperarAposHistorico < 5) {
              return; // ⏳ Ainda aguardando velas...
            }
            
            // 📊 Log de análise a cada minuto (não a cada tick)
            const agora = new Date();
            const minutoAtual = agora.getMinutes();
            const segundoAtual = agora.getSeconds();
            
            // Só analisar e logar a cada 30 segundos para não poluir o log
            if (segundoAtual === 0 || segundoAtual === 30) {
              addLog(\`🔍 Analisando mercado... (Preço atual: $\${tick.quote?.toFixed(4) || 'N/A'})\`);
            }
            
            const analysis = analyzeSignals(priceData, volumeData);
            
            if (analysis && analysis.finalSignal !== "NEUTRO" && analysis.confidence >= minConfidence) {
              updateSignalsDisplay(analysis.signals, analysis.confidence);
              
              addLog(\`🎯 SINAL DETECTADO: \${analysis.finalSignal} com \${analysis.confidence}% de confiança!\`);
              addLog(\`📋 Resumo: RSI(\${analysis.signals.rsi}) + Bollinger(\${analysis.signals.bollinger}) + Tendência 24h(\${analysis.signals.trend24h} \${analysis.signals.trend24hStrength?.toFixed(2)}%)\`);
              
              isTrading = true;
              executeTrade(analysis.finalSignal, websocket);
            } else if (analysis && segundoAtual === 0) {
              // Log explicativo a cada minuto quando NÃO há sinal
              addLog(\`⏸️ Aguardando próximo sinal... (Confiança atual: \${analysis.confidence}%, mínimo: \${minConfidence}%)\`);
            }
          }
        } catch (error) {
          addLog(\`❌ Erro processando tick: \${error.message}\`);
        }
      }

      function analyzeSignals(prices, volumes) {
        try {
          // ✅ VALIDAÇÃO ROBUSTA: Precisa de pelo menos 50 velas (4+ horas) para análise segura
          const minRequiredCandles = Math.max(mhiPeriods, emaSlow, rsiPeriods, 50);
          if (!prices || prices.length < minRequiredCandles) {
            addLog(\`⚠️ Dados insuficientes: \${prices?.length || 0} velas (mínimo: \${minRequiredCandles})\`);
            return null;
          }
          
          // ✅ ANÁLISE DE TENDÊNCIA DE 24H: Usar EMA 50 e EMA 200 para tendência REAL
          const currentPrice = prices[prices.length - 1].close;
          
          // Calcular EMAs de longo prazo
          const ema50 = calculateEMA(prices.slice(-50), 50);
          const ema100 = calculateEMA(prices.slice(-100), 100);
          const ema200 = prices.length >= 200 ? calculateEMA(prices.slice(-200), 200) : ema100;
          
          // Determinar tendência baseada em EMAs (mais confiável)
          let trend24h = "NEUTRO";
          let trend24hStrength = 0;
          
          if (ema50 > ema100 && ema100 > ema200 && currentPrice > ema50) {
            trend24h = "ALTA";
            trend24hStrength = ((ema50 - ema200) / ema200) * 100;
          } else if (ema50 < ema100 && ema100 < ema200 && currentPrice < ema50) {
            trend24h = "BAIXA";
            trend24hStrength = ((ema200 - ema50) / ema200) * 100;
          } else {
            // Tendência indefinida ou lateral
            trend24h = currentPrice > ema50 ? "ALTA" : "BAIXA";
            trend24hStrength = Math.abs((currentPrice - ema50) / ema50) * 100;
          }
          
          trend24hStrength = Math.abs(trend24hStrength);
          
          // ✅ NOVO: Calcular suporte e resistência de 24h
          suporteResistencia = calculateSupportResistance(prices);
          
          addLog(\`📊 Tendência REAL (EMAs): \${trend24h} (\${trend24hStrength.toFixed(2)}%) | EMA50: $\${ema50.toFixed(4)} | Preço: $\${currentPrice.toFixed(4)}\`);
          addLog(\`🎯 Suporte: $\${suporteResistencia.suporte.toFixed(4)} | Resistência: $\${suporteResistencia.resistencia.toFixed(4)} (Força: \${suporteResistencia.forca})\`);
          
          // ✅ MHI REATIVADO
          const mhiData = prices.slice(-mhiPeriods);
          let highSum = 0, lowSum = 0;
          mhiData.forEach(candle => {
            highSum += candle.high;
            lowSum += candle.low;
          });
          
          const avgHigh = highSum / mhiPeriods;
          const avgLow = lowSum / mhiPeriods;
          // currentPrice já foi definido acima para análise de tendência
          
          let mhiSignal = "NEUTRO";
          if (currentPrice > avgHigh) {
            mhiSignal = "CALL";
          } else if (currentPrice < avgLow) {
            mhiSignal = "PUT";
          }
          
          // EMA Calculation
          const emaFastValue = calculateEMA(prices, emaFast);
          const emaSlowValue = calculateEMA(prices, emaSlow);
          
          let trendSignal = "NEUTRO";
          if (emaFastValue > emaSlowValue && currentPrice > emaFastValue) {
            trendSignal = "CALL";
          } else if (emaFastValue < emaSlowValue && currentPrice < emaFastValue) {
            trendSignal = "PUT";
          }
          
          // ✅ RSI OTIMIZADO - Filtro inteligente
          const rsi = calculateRSI(prices, rsiPeriods);
          let rsiSignal = "NEUTRO";
          
          // Para COMPRA: RSI entre 30-45 (saindo de oversold)
          if (rsi >= 30 && rsi <= 45) {
            rsiSignal = "CALL";
          } 
          // Para VENDA: RSI entre 55-70 (saindo de overbought)
          else if (rsi >= 55 && rsi <= 70) {
            rsiSignal = "PUT";
          }
          // ❌ EVITAR: RSI > 65 para CALL ou RSI < 35 para PUT
          // (mesmo que outros indicadores estejam ok)
          
          // ✅ BOLLINGER OTIMIZADO - Confirmação de Timing
          const bollingerBands = calculateBollingerBands(prices, 20, 2);
          let bollingerSignal = "NEUTRO";
          
          if (bollingerBands) {
            const { upper, middle, lower } = bollingerBands;
            const pricePosition = (currentPrice - lower) / (upper - lower); // 0 = banda inferior, 1 = banda superior
            
            // ✅ COMPRA: Preço na banda inferior (0-20% da banda) + subindo
            if (pricePosition <= 0.2 && currentPrice >= lower) {
              bollingerSignal = "CALL";
              addLog(\`📊 Bollinger CALL: Preço tocando banda inferior (\${(pricePosition * 100).toFixed(1)}% da banda)\`);
            }
            // ✅ VENDA: Preço na banda superior (80-100% da banda) + descendo
            else if (pricePosition >= 0.8 && currentPrice <= upper) {
              bollingerSignal = "PUT";
              addLog(\`📊 Bollinger PUT: Preço tocando banda superior (\${(pricePosition * 100).toFixed(1)}% da banda)\`);
            }
            // ⚠️ NEUTRO: Preço no meio da banda
            else {
              addLog(\`📊 Bollinger NEUTRO: Preço no meio da banda (\${(pricePosition * 100).toFixed(1)}%)\`);
            }
          }
          
          // ⏸️ FIBONACCI DESABILITADO TEMPORARIAMENTE
          // const fibonacciAnalysis = analyzeFibonacciSignal(prices, currentPrice);
          const fibonacciAnalysis = { signal: "NEUTRO", confidence: 0, reason: "Desabilitado" }; // ⏸️ Fibonacci desabilitado
          
          const signals = {
            mhi: mhiSignal,
            trend: trendSignal,
            ema: currentPrice > emaFastValue ? "CALL" : "PUT",
            rsi: rsiSignal,
            bollinger: bollingerSignal,
            fibonacci: "NEUTRO", // ⏸️ Fibonacci desabilitado
            volume: "NEUTRO"
          };
          
          // ✅ ESTRATÉGIA ROBUSTA - Incluir dados de tendência 24h + suporte/resistência
          signals.trend24h = trend24h;
          signals.trend24hStrength = trend24hStrength;
          signals.suporteResistencia = suporteResistencia;
          let finalSignal = calculateFinalSignal(signals, fibonacciAnalysis);
          
          const confidence = calculateConfidence(signals, rsi, fibonacciAnalysis);
          
          return {
            signals: { ...signals, final: finalSignal },
            confidence,
            finalSignal,
            fibonacciData: fibonacciAnalysis // ✅ Para logs e debug
          };
        } catch (error) {
          addLog(\`❌ Erro no cálculo MHI: \${error.message}\`);
          return null;
        }
      }

      function calculateEMA(prices, period) {
        if (prices.length < period) return 0;
        const multiplier = 2 / (period + 1);
        let ema = prices.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) / period;
        for (let i = period; i < prices.length; i++) {
          ema = (prices[i].close - ema) * multiplier + ema;
        }
        return ema;
      }

      function calculateRSI(prices, period) {
        if (prices.length <= period) return 50;
        let gains = 0, losses = 0;
        for (let i = 1; i <= period; i++) {
          const change = prices[prices.length - i].close - prices[prices.length - i - 1].close;
          if (change > 0) gains += change;
          else losses -= change;
        }
        const avgGain = gains / period;
        const avgLoss = losses / period;
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
      }

      // ✅ BANDAS DE BOLLINGER - NOVA FUNÇÃO
      function calculateBollingerBands(prices, period = 20, stdDev = 2) {
        if (prices.length < period) return null;
        
        try {
          // Pegar os últimos 'period' preços de fechamento
          const recentPrices = prices.slice(-period).map(candle => candle.close);
          
          // Calcular média móvel simples (SMA)
          const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
          
          // Calcular desvio padrão
          const variance = recentPrices.reduce((sum, price) => {
            return sum + Math.pow(price - sma, 2);
          }, 0) / period;
          
          const standardDeviation = Math.sqrt(variance);
          
          // Calcular as bandas
          const upperBand = sma + (stdDev * standardDeviation);
          const middleBand = sma;
          const lowerBand = sma - (stdDev * standardDeviation);
          
          return {
            upper: upperBand,
            middle: middleBand,
            lower: lowerBand,
            sma: sma,
            stdDev: standardDeviation
          };
        } catch (error) {
          addLog(\`❌ Erro no cálculo Bollinger: \${error.message}\`);
          return null;
        }
      }

      // ✅ FIBONACCI - NOVAS FUNÇÕES
      function calculateFibonacciLevels(prices, lookback = 50) {
        if (prices.length < lookback) return null;
        
        try {
          const recentPrices = prices.slice(-lookback);
          const highs = recentPrices.map(c => c.high);
          const lows = recentPrices.map(c => c.low);
          
          const highest = Math.max(...highs);
          const lowest = Math.min(...lows);
          const range = highest - lowest;
          
          // Níveis de Retração Fibonacci
          const fib = {
            high: highest,
            low: lowest,
            // Retração (do topo para baixo)
            ret_0: highest,
            ret_236: highest - (range * 0.236),
            ret_382: highest - (range * 0.382),
            ret_500: highest - (range * 0.500),
            ret_618: highest - (range * 0.618),
            ret_786: highest - (range * 0.786),
            ret_100: lowest,
            // Extensão (projeção)
            ext_1272: highest + (range * 0.272),
            ext_1618: highest + (range * 0.618)
          };
          
          return fib;
        } catch (error) {
          addLog(\`❌ Erro no cálculo Fibonacci: \${error.message}\`);
          return null;
        }
      }

      // ✅ ADX (Average Directional Index) - FORÇA DA TENDÊNCIA
      function calculateADX(prices, period = 14) {
        if (prices.length < period + 1) return 0;
        
        try {
          let plusDM = [], minusDM = [], tr = [];
          
          // Calcular +DM, -DM e TR
          for (let i = 1; i < prices.length; i++) {
            const high = prices[i].high;
            const low = prices[i].low;
            const prevHigh = prices[i-1].high;
            const prevLow = prices[i-1].low;
            const prevClose = prices[i-1].close;
            
            const upMove = high - prevHigh;
            const downMove = prevLow - low;
            
            plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
            minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
            
            const trueRange = Math.max(
              high - low,
              Math.abs(high - prevClose),
              Math.abs(low - prevClose)
            );
            tr.push(trueRange);
          }
          
          // Suavizar com EMA
          const smoothPlusDM = plusDM.slice(-period).reduce((a, b) => a + b, 0);
          const smoothMinusDM = minusDM.slice(-period).reduce((a, b) => a + b, 0);
          const smoothTR = tr.slice(-period).reduce((a, b) => a + b, 0);
          
          const plusDI = (smoothPlusDM / smoothTR) * 100;
          const minusDI = (smoothMinusDM / smoothTR) * 100;
          
          const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
          
          return dx; // Simplificado, ADX seria média do DX
        } catch (error) {
          return 0;
        }
      }

      // ✅ EMA 50 e 200 para Tendência Principal
      function calculateEMA50_200(prices) {
        if (prices.length < 200) return null;
        
        const ema50 = calculateEMA(prices.slice(-50), 50);
        const ema200 = calculateEMA(prices.slice(-200), 200);
        
        return { ema50, ema200 };
      }

      // ✅ ANÁLISE FIBONACCI INTEGRADA
      function analyzeFibonacciSignal(prices, currentPrice) {
        if (prices.length < 200) return { signal: "NEUTRO", confidence: 0, reason: "Dados insuficientes" };
        
        try {
          // 1. IDENTIFICAR TENDÊNCIA PRINCIPAL
          const emas = calculateEMA50_200(prices);
          if (!emas) return { signal: "NEUTRO", confidence: 0, reason: "EMAs indisponíveis" };
          
          const { ema50, ema200 } = emas;
          const adx = calculateADX(prices, 14);
          
          let mainTrend = "NEUTRO";
          if (ema50 > ema200 && adx > 25) {
            mainTrend = "ALTA"; // Tendência de alta confirmada
          } else if (ema50 < ema200 && adx > 25) {
            mainTrend = "BAIXA"; // Tendência de baixa confirmada
          }
          
          // 2. CALCULAR NÍVEIS FIBONACCI
          const fib = calculateFibonacciLevels(prices, 50);
          if (!fib) return { signal: "NEUTRO", confidence: 0, reason: "Fibonacci indisponível" };
          
          // 3. VERIFICAR POSIÇÃO DO PREÇO EM RELAÇÃO AOS NÍVEIS
          let fibSignal = "NEUTRO";
          let fibConfidence = 0;
          let fibReason = "";
          
          // SETUP DE COMPRA (Tendência de Alta)
          if (mainTrend === "ALTA") {
            // Preço na zona de suporte Fibonacci (0.382-0.618)
            if (currentPrice >= fib.ret_618 && currentPrice <= fib.ret_382) {
              fibSignal = "CALL";
              fibConfidence = 80;
              fibReason = "Correção em zona Fib 0.382-0.618 + Tendência Alta";
              addLog(\`🎯 Fibonacci CALL: Preço=\${currentPrice.toFixed(5)} entre 0.618(\${fib.ret_618.toFixed(5)}) e 0.382(\${fib.ret_382.toFixed(5)})\`);
            }
            // Preço no nível 0.5 (equilíbrio)
            else if (Math.abs(currentPrice - fib.ret_500) < (fib.high - fib.low) * 0.05) {
              fibSignal = "CALL";
              fibConfidence = 70;
              fibReason = "Preço no nível 0.5 Fib + Tendência Alta";
            }
            // Breakout acima da resistência
            else if (currentPrice > fib.ret_236) {
              fibSignal = "CALL";
              fibConfidence = 75;
              fibReason = "Breakout acima 0.236 + Tendência Alta";
            }
          }
          
          // SETUP DE VENDA (Tendência de Baixa)
          else if (mainTrend === "BAIXA") {
            // Preço na zona de resistência Fibonacci (0.382-0.618)
            if (currentPrice <= fib.ret_382 && currentPrice >= fib.ret_618) {
              fibSignal = "PUT";
              fibConfidence = 80;
              fibReason = "Correção em zona Fib 0.382-0.618 + Tendência Baixa";
              addLog(\`🎯 Fibonacci PUT: Preço=\${currentPrice.toFixed(5)} entre 0.382(\${fib.ret_382.toFixed(5)}) e 0.618(\${fib.ret_618.toFixed(5)})\`);
            }
            // Preço no nível 0.5
            else if (Math.abs(currentPrice - fib.ret_500) < (fib.high - fib.low) * 0.05) {
              fibSignal = "PUT";
              fibConfidence = 70;
              fibReason = "Preço no nível 0.5 Fib + Tendência Baixa";
            }
            // Breakout abaixo do suporte
            else if (currentPrice < fib.ret_786) {
              fibSignal = "PUT";
              fibConfidence = 75;
              fibReason = "Breakout abaixo 0.786 + Tendência Baixa";
            }
          }
          
          // Log informativo
          if (fibSignal !== "NEUTRO") {
            addLog(\`📊 ADX: \${adx.toFixed(1)} | EMA50: \${ema50.toFixed(5)} | EMA200: \${ema200.toFixed(5)}\`);
            addLog(\`🎯 Fibonacci: \${fibReason}\`);
          }
          
          return { 
            signal: fibSignal, 
            confidence: fibConfidence, 
            reason: fibReason,
            mainTrend,
            adx,
            fibLevels: fib
          };
        } catch (error) {
          addLog(\`❌ Erro na análise Fibonacci: \${error.message}\`);
          return { signal: "NEUTRO", confidence: 0, reason: "Erro no cálculo" };
        }
      }

      function calculateFinalSignal(signals, fibonacciAnalysis) {
        // ✅ ESTRATÉGIA ROBUSTA - RSI + Bollinger + Tendência 24h + Suporte/Resistência
        // RSI: Indica momentum (sobrecompra/sobrevenda)
        // Bollinger: Indica volatilidade e timing
        // Tendência 24h: Validação de direção geral do mercado
        // Suporte/Resistência: Níveis críticos de preço
        
        // ✅ VALIDAÇÃO DE TENDÊNCIA 24H (maior segurança)
        const trend24h = signals.trend24h || "NEUTRO";
        const trend24hStrength = signals.trend24hStrength || 0;
        const sr = signals.suporteResistencia || { suporte: 0, resistencia: 0, forca: 0 };
        
        // ✅ ANÁLISE DE SUPORTE E RESISTÊNCIA
        const currentPrice = priceData[priceData.length - 1]?.close || 0;
        const distanciaSuporte = currentPrice - sr.suporte;
        const distanciaResistencia = sr.resistencia - currentPrice;
        const percentualSuporte = (distanciaSuporte / sr.suporte) * 100;
        const percentualResistencia = (distanciaResistencia / sr.resistencia) * 100;
        
        // Log da análise de S/R
        if (sr.suporte > 0 && sr.resistencia > 0) {
          addLog(\`📊 S/R: Preço $\${currentPrice.toFixed(4)} | Dist. Suporte: \${percentualSuporte.toFixed(1)}% | Dist. Resistência: \${percentualResistencia.toFixed(1)}%\`);
        }
        
        // ✅ ESTRATÉGIA MELHORADA: SEMPRE seguir a tendência REAL (baseada em EMAs)
        // Só opera A FAVOR da tendência principal detectada pelas EMAs
        
        // 🔴 REGRA 1: Se tendência é BAIXA (EMA50 < EMA100 < EMA200), NUNCA fazer CALL
        if (trend24h === "BAIXA" && trend24hStrength >= 0.02) { // ✅ AJUSTADO: Menos restritivo
          // Só permite PUT se RSI ou Bollinger confirmarem
          if (signals.rsi === "PUT" || signals.bollinger === "PUT") {
            addLog(\`✅ PUT aprovado: A FAVOR da tendência BAIXA (\${trend24hStrength.toFixed(2)}%) + RSI(\${signals.rsi}) BB(\${signals.bollinger})\`);
            return "PUT";
          } else {
            addLog(\`⚠️ Operação bloqueada: Tendência BAIXA (\${trend24hStrength.toFixed(2)}%), mas indicadores não confirmam PUT. Aguardando...\`);
            return "NEUTRO";
          }
        }
        
        // 🟢 REGRA 2: Se tendência é ALTA (EMA50 > EMA100 > EMA200), NUNCA fazer PUT
        if (trend24h === "ALTA" && trend24hStrength >= 0.02) { // ✅ AJUSTADO: Menos restritivo
          // Só permite CALL se RSI ou Bollinger confirmarem
          if (signals.rsi === "CALL" || signals.bollinger === "CALL") {
            addLog(\`✅ CALL aprovado: A FAVOR da tendência ALTA (\${trend24hStrength.toFixed(2)}%) + RSI(\${signals.rsi}) BB(\${signals.bollinger})\`);
            return "CALL";
          } else {
            addLog(\`⚠️ Operação bloqueada: Tendência ALTA (\${trend24hStrength.toFixed(2)}%), mas indicadores não confirmam CALL. Aguardando...\`);
            return "NEUTRO";
          }
        }
        
        // 🟡 REGRA 3: Se tendência é extremamente LATERAL/FRACA (< 0.05%), ser mais cauteloso
        // Requer confirmação DUPLA de indicadores para operar em mercado lateral
        if (trend24hStrength < 0.02) { // ✅ AJUSTADO: Mais permissivo para mercado lateral
          // ✅ MHI + RSI para confirmação dupla em mercado lateral
          if (signals.mhi === "CALL" && signals.rsi === "CALL") {
            addLog(\`✅ CALL aprovado em mercado lateral: MHI + RSI confirmam\`);
            return "CALL";
          } else if (signals.mhi === "PUT" && signals.rsi === "PUT") {
            addLog(\`✅ PUT aprovado em mercado lateral: MHI + RSI confirmam\`);
            return "PUT";
          } else {
            addLog(\`⚠️ Mercado MUITO LATERAL detectado (\${trend24hStrength.toFixed(3)}%). Aguardando confirmação dupla MHI + RSI...\`);
          return "NEUTRO";
          }
        }
        
        addLog(\`⏸️ Nenhum sinal válido: Aguardando condições favoráveis...\`);
        return "NEUTRO";
      }

      // ✅ NOVA FUNÇÃO: Calcular suporte e resistência baseado no histórico de 24h
      function calculateSupportResistance(prices) {
        try {
          if (!prices || prices.length < 50) {
            return { suporte: 0, resistencia: 0, forca: 0 };
          }
          
          // Pegar dados das últimas 24h (288 velas de 5min)
          const last24h = prices.slice(-288);
          
          // Encontrar máximos e mínimos locais
          const highs = [];
          const lows = [];
          
          for (let i = 2; i < last24h.length - 2; i++) {
            const current = last24h[i];
            const prev2 = last24h[i-2];
            const prev1 = last24h[i-1];
            const next1 = last24h[i+1];
            const next2 = last24h[i+2];
            
            // Máximo local (resistência)
            if (current.high > prev2.high && current.high > prev1.high && 
                current.high > next1.high && current.high > next2.high) {
              highs.push({ price: current.high, timestamp: current.timestamp });
            }
            
            // Mínimo local (suporte)
            if (current.low < prev2.low && current.low < prev1.low && 
                current.low < next1.low && current.low < next2.low) {
              lows.push({ price: current.low, timestamp: current.timestamp });
            }
          }
          
          // Calcular níveis de suporte e resistência mais fortes
          let resistencia = 0;
          let suporte = 0;
          let forca = 0;
          
          if (highs.length > 0 && lows.length > 0) {
            // Ordenar por preço
            highs.sort((a, b) => b.price - a.price);
            lows.sort((a, b) => a.price - b.price);
            
            // Pegar os níveis mais recentes e fortes
            const resistenciaCandidata = highs[0];
            const suporteCandidato = lows[0];
            
            // Calcular força baseada na frequência de toques
            const resistenciaTouches = highs.filter(h => 
              Math.abs(h.price - resistenciaCandidata.price) / resistenciaCandidata.price < 0.001
            ).length;
            
            const suporteTouches = lows.filter(l => 
              Math.abs(l.price - suporteCandidato.price) / suporteCandidato.price < 0.001
            ).length;
            
            resistencia = resistenciaCandidata.price;
            suporte = suporteCandidato.price;
            forca = Math.max(resistenciaTouches, suporteTouches);
          }
          
          return { suporte, resistencia, forca };
        } catch (error) {
          addLog(\`❌ Erro calculando suporte/resistência: \${error.message}\`);
          return { suporte: 0, resistencia: 0, forca: 0 };
        }
      }

      function calculateConfidence(signals, rsi, fibonacciAnalysis) {
        let confidence = 50; // Base de 50%
        
        // ✅ CONFIANÇA SIMPLES - RSI + Bollinger
        if (signals.rsi !== "NEUTRO") confidence += 20;
        if (signals.bollinger !== "NEUTRO") confidence += 20;
        
        // ✅ BONUS SE AMBOS CONCORDAM
        if (signals.rsi === signals.bollinger && signals.rsi !== "NEUTRO") {
          confidence += 10; // +10% quando RSI e Bollinger concordam
        }
        
        return Math.min(95, confidence);
      }

      function updateSignalsDisplay(signals, confidence) {
        // ✅ MHI REATIVADO
        document.getElementById("mhiSignal").textContent = signals.mhi || "-";
        
        // ❌ DESABILITADOS - EMA e FIBONACCI
        document.getElementById("emaSignal").textContent = "OFF";
        document.getElementById("fibonacciSignal").textContent = "OFF";
        
        // ✅ ATIVOS - Tendência, RSI e Bollinger
        document.getElementById("trendSignal").textContent = signals.trend || "-";
        document.getElementById("rsiValue").textContent = signals.rsi || "-";
        document.getElementById("bollingerSignal").textContent = signals.bollinger || "-";
        document.getElementById("confidenceValue").textContent = confidence ? \`\${confidence}%\` : "-";
        document.getElementById("finalSignal").textContent = signals.final || "-";
        
        // ✅ NOVO - Suporte e Resistência
        if (signals.suporteResistencia) {
          const sr = signals.suporteResistencia;
          document.getElementById("suporteValue").textContent = sr.suporte > 0 ? \`$\${sr.suporte.toFixed(4)}\` : "-";
          document.getElementById("resistenciaValue").textContent = sr.resistencia > 0 ? \`$\${sr.resistencia.toFixed(4)}\` : "-";
        } else {
          document.getElementById("suporteValue").textContent = "-";
          document.getElementById("resistenciaValue").textContent = "-";
        }
      }

      function executeTrade(signal, websocket) {
        if (!websocket || websocket.readyState !== WebSocket.OPEN) {
          addLog("❌ WebSocket não conectado!");
          return;
        }
        
        addLog(\`🚀 EXECUTANDO: \${signal} - $\${currentStake}\`);
        
        const proposal = {
          proposal: 1,
          amount: currentStake,
          basis: "stake",
          contract_type: signal,
          currency: "USD",
          duration: duration,
          duration_unit: "m",
          symbol: symbol
        };

        websocket.send(JSON.stringify(proposal));
        document.getElementById("status").innerText = \`🚀 \${signal} - $\${currentStake}\`;
        
        // Adicionar linha de entrada no gráfico
        const currentPrice = priceData[priceData.length - 1]?.close || 0;
        addEntryLine(currentPrice, signal, Date.now());
        
        // Limpar timers anteriores
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
        if (profitCheckInterval) clearInterval(profitCheckInterval);
        
        // Salvar preço de compra (será atualizado quando receber data.buy)
        contractBuyPrice = currentStake;
      }

      function handleTradeResult(contract) {
        // Limpar todos os timers
        if (autoCloseTimer) {
          clearTimeout(autoCloseTimer);
          autoCloseTimer = null;
        }
        if (profitCheckInterval) {
          clearInterval(profitCheckInterval);
          profitCheckInterval = null;
        }
        
        // Limpar variáveis do contrato
        currentContractId = null;
        contractBuyPrice = 0;
        
        const tradeProfit = contract.profit;
        const finalSignal = document.getElementById("finalSignal").textContent;
        const confidence = document.getElementById("confidenceValue").textContent.replace('%', '') || "0";

        profit += tradeProfit;
        document.getElementById("profit").innerText = "$" + profit.toFixed(2);

        stats.total++;
        if (tradeProfit >= 0) {
          stats.wins++;
          stats.consecutiveWins++;
          stats.consecutiveLosses = 0;
        } else {
          stats.losses++;
          stats.consecutiveLosses++;
          stats.consecutiveWins = 0;
        }
        
        // Adicionar ao histórico para relatório
        tradeHistory.push({
          symbol: symbol,
          signal: finalSignal,
          stake: currentStake,
          profit: tradeProfit,
          result: tradeProfit >= 0 ? 'WIN' : 'LOSS',
          confidence: confidence,
          timestamp: new Date().toLocaleString()
        });
        
        updateAccuracy();
        updateAnalytics(); // Atualizar aba Analytics

        // Salvar estado do bot após cada trade
        saveBotState();

        addTradeToHistory(contract.contract_id, finalSignal, confidence, currentStake, martingaleLevel_current, tradeProfit >= 0 ? "WIN" : "LOSS", tradeProfit);

        addLog(\`📊 Resultado: \${tradeProfit >= 0 ? 'WIN' : 'LOSS'} | Entrada: $\${currentStake} | Lucro: $\${tradeProfit.toFixed(2)}\`);

        if (tradeProfit < 0) {
          martingaleLevel_current++;
          addLog(\`🔴 Perda \${martingaleLevel_current}/3\`);
          
          const newStake = calculateNextStake();
          
          if (canUseMartingale(newStake)) {
            currentStake = newStake;
            addLog(\`📈 Nova entrada: $\${currentStake}\`);
          } else {
            martingaleLevel_current = 0;
            currentStake = initialStake;
            addLog("🔄 Martingale resetado");
          }
        } else {
          martingaleLevel_current = 0;
          currentStake = initialStake;
          addLog(\`✅ WIN! Reset para entrada inicial: $\${currentStake}\`);
        }

        updateMartingaleStatus();

        const stopWin = parseFloat(document.getElementById("stopWin").value) || 10;
        const stopLoss = parseFloat(document.getElementById("stopLoss").value) || -10;

        if (profit >= stopWin) {
          addLog("🎯 STOP WIN atingido! Parando bot.");
          stopBot();
        } else if (profit <= stopLoss) {
          addLog("💀 STOP LOSS atingido! Parando bot.");
          stopBot();
        } else {
          addLog("🔄 Aguardando próximo sinal...");
          document.getElementById("status").innerText = "📊 Analisando...";
          isTrading = false;
          lastTradeTime = Date.now();
        }
      }

      function calculateNextStake() {
        const newStake = currentStake * martingaleMultiplier;
        const balance = parseFloat(document.getElementById("balance").textContent) || 100;
        
        const limits = {
          maxMartingale: initialStake * Math.pow(martingaleMultiplier, 3),
          maxBalancePercent: balance * 0.3,
          minStake: 1
        };
        
        let finalStake = Math.min(newStake, limits.maxMartingale, limits.maxBalancePercent);
        finalStake = Math.max(finalStake, limits.minStake);
        finalStake = Math.round(finalStake);
        
        return finalStake;
      }

      function canUseMartingale(stake) {
        const balance = parseFloat(document.getElementById("balance").textContent) || 100;
        
        if (martingaleLevel_current >= maxMartingale_current) {
          addLog("🚫 Máximo de 3 martingales atingido!");
          return false;
        }
        
        if (stake > balance * 0.5) {
          addLog(\`⚠️ Stake muito alto para o saldo!\`);
          return false;
        }
        
        return true;
      }

      function updateMartingaleStatus() {
        // Atualizar apenas o stake atual (martingaleStatus foi removido)
        document.getElementById("currentStake").textContent = "$" + currentStake;
      }

      function updateAccuracy() {
        if (stats.total > 0) {
          const accuracy = ((stats.wins / stats.total) * 100).toFixed(1);
          document.getElementById("accuracy").textContent = \`\${accuracy}%\`;
        }
      }

      function updateDataCount() {
        document.getElementById("dataCount").textContent = priceData.length;
      }

      // ===== FUNÇÃO CORRIGIDA PARA ADICIONAR AO HISTÓRICO =====
      function addTradeToHistory(contractId, signal, confidence, stake, martingale, result, profit) {
        try {
          const historyBody = document.getElementById("historyBody");
          if (!historyBody) return;
          
          const row = document.createElement("tr");
          const time = new Date().toLocaleTimeString();
          
          // CORREÇÃO: Garantir que contractId seja string e tratar casos onde pode ser número
          const contractIdStr = String(contractId || 'N/A');
          const displayId = contractIdStr.length > 6 ? contractIdStr.slice(-6) : contractIdStr;
          
          row.innerHTML = \`
            <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-size: 0.85rem;">\${displayId}</td>
            <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; color: \${signal === 'CALL' ? '#10b981' : '#ef4444'}; font-weight: 600; font-size: 0.85rem;">\${signal}</td>
            <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-size: 0.85rem;">\${confidence}%</td>
            <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-size: 0.85rem;">$\${stake}</td>
            <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; color: \${profit >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600; font-size: 0.85rem;">\${result}</td>
            <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; color: \${profit >= 0 ? '#10b981' : '#ef4444'}; font-weight: 600; font-size: 0.85rem;">$\${profit.toFixed(2)}</td>
            <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-size: 0.85rem;">\${time}</td>
          \`;
          historyBody.prepend(row);
          
          addLog(\`📋 Trade adicionado ao histórico: \${result} - $\${profit.toFixed(2)}\`);
          
          // ✅ SALVAR NO BANCO DE DADOS
          if (window.user?.id) {
            // Detectar tipo de conta do localStorage ou assumir demo
            let accountType = 'demo';
            try {
              const authData = localStorage.getItem('deriv_auth_data');
              if (authData) {
                const parsed = JSON.parse(authData);
                accountType = (parsed.account_type === 'REAL') ? 'real' : 'demo';
              }
            } catch (e) {
              // Se não conseguir ler, usa demo como padrão
              accountType = 'demo';
            }
            
            console.log('💾 Salvando trade:', { symbol, signal, stake, result, profit, account_type: accountType });
            fetch('/api/data?action=save_trade', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: window.user.id,
                symbol: symbol,
                trade_signal: signal,
                stake: stake,
                result: result,
                profit: profit,
                confidence: confidence,
                account_type: accountType
              })
            }).catch(err => {
              console.error('❌ Erro ao salvar trade:', err);
            });
            
            // ✅ ATUALIZAR SESSÃO NO BANCO (para sincronizar com Telegram /status)
            if (window.botSessionId) {
              fetch('/api/data?action=sync_session_stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  session_id: window.botSessionId,
                  profit_delta: profit,
                  result: result
                })
              }).catch(err => {
                console.error('❌ Erro ao atualizar sessão:', err);
              });
            }
          }
        } catch (error) {
          addLog(\`❌ Erro ao adicionar trade ao histórico: \${error.message}\`);
        }
      }
      
      // ===== ATUALIZAR ABA ANALYTICS =====
      function updateAnalytics() {
        try {
          // Atualizar cards de estatísticas
          const totalTradesEl = document.getElementById("analytics-total-trades");
          if (totalTradesEl) totalTradesEl.textContent = stats.total.toString();
          
          const winRateEl = document.getElementById("analytics-win-rate");
          const winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : '0';
          if (winRateEl) winRateEl.textContent = winRate + '%';
          
          const profitEl = document.getElementById("analytics-profit");
          if (profitEl) profitEl.textContent = '$' + profit.toFixed(2);
          
          const bestStreakEl = document.getElementById("analytics-best-streak");
          const bestStreak = Math.max(stats.consecutiveWins, stats.consecutiveLosses);
          if (bestStreakEl) bestStreakEl.textContent = bestStreak.toString();
          
          // Atualizar tabela de histórico
          const historyBody = document.getElementById("analytics-history");
          if (historyBody && tradeHistory.length > 0) {
            historyBody.innerHTML = '';
            
            tradeHistory.slice().reverse().forEach(trade => {
              const row = document.createElement("tr");
              row.style.borderBottom = "1px solid #334155";
              
              const resultColor = trade.result === 'WIN' ? '#10b981' : '#ef4444';
              const profitColor = trade.profit >= 0 ? '#10b981' : '#ef4444';
              
              row.innerHTML = \`
                <td style="padding: 10px 8px; fontSize: 0.8rem;">\${trade.timestamp}</td>
                <td style="padding: 10px 8px; fontSize: 0.8rem; fontWeight: 600;">\${trade.symbol}</td>
                <td style="padding: 10px 8px; fontSize: 0.8rem; color: \${trade.signal === 'CALL' ? '#10b981' : '#ef4444'};">\${trade.signal}</td>
                <td style="padding: 10px 8px; fontSize: 0.8rem;">$\${trade.stake.toFixed(2)}</td>
                <td style="padding: 10px 8px; fontSize: 0.8rem; color: \${resultColor}; fontWeight: 600;">\${trade.result}</td>
                <td style="padding: 10px 8px; fontSize: 0.8rem; color: \${profitColor}; fontWeight: 600;">$\${trade.profit.toFixed(2)}</td>
              \`;
              
              historyBody.appendChild(row);
            });
          }
        } catch (error) {
          // Silenciar erro se aba analytics não estiver aberta
        }
      }

      function stopBot() {
        isRunning = false;
        isTrading = false;
        
        // Salvar estado final do bot
        saveBotState();
        
        // Preparar dados do relatório
        const reportData = {
          symbol: symbol, // Símbolo atual do bot
          profit: profit,
          accuracy: stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : '0',
          totalTrades: stats.total,
          wins: stats.wins,
          losses: stats.losses,
          tradeHistory: tradeHistory
        };
        
        // ✅ NOVO: Atualizar sessão no banco de dados
        if (window.user?.id && window.botSessionId) {
          fetch('/api/data?action=update_bot_session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: window.botSessionId,
              current_profit: profit,
              trades_count: stats.total,
              wins_count: stats.wins,
              losses_count: stats.losses
            })
          }).then(res => res.json()).then(data => {
            if (data.success) {
              addLog(\`✅ Sessão atualizada no banco\`);
            }
          }).catch(err => {
            console.error('❌ Erro ao atualizar sessão:', err);
          });
        }
        
        // Disparar evento de bot parado com dados do relatório
        const event = new CustomEvent('bot-stopped', { detail: reportData });
        window.dispatchEvent(event);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ forget_all: "ticks" }));
            ws.send(JSON.stringify({ forget_all: "proposal_open_contract" }));
            
            setTimeout(() => {
              ws.close();
            }, 500);
          } catch (error) {
            ws.close();
          }
        }
        
        addLog("⏹ Bot parado com sucesso!");
        document.getElementById("status").innerText = "⏹ Parado";
      }

      // ===== INICIALIZAÇÃO =====
      setTimeout(() => {
        loadSettings();
        restoreBotState(); // Restaurar estado do bot
        // ✅ CORREÇÃO: Limpar logs antigos do localStorage se existirem
        const logElement = document.getElementById("log");
        if (logElement && logElement.innerHTML.includes("Zeus carregado com sucesso")) {
          logElement.innerHTML = ""; // Limpar logs antigos
        }
      }, 1000);
    `;
    
    botContainerRef.current.appendChild(mainScript);
    
    // Inicializar gráfico profissional
    setTimeout(() => {
      console.log('📊 Inicializando gráfico profissional...');
      initializeProfessionalChart();
      
      // Configurar event listeners do gráfico
      const chartTypeSelect = document.getElementById('chartType') as HTMLSelectElement;
      const timeframeSelect = document.getElementById('timeframe') as HTMLSelectElement;
      
      if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', (e) => {
          const target = e.target as HTMLSelectElement;
          changeChartType(target.value as 'candlestick' | 'line');
        });
        console.log('📈 Seletor de tipo de gráfico configurado');
      }
      
      if (timeframeSelect) {
        timeframeSelect.addEventListener('change', (e) => {
          const target = e.target as HTMLSelectElement;
          changeChartTimeframe(target.value);
        });
        console.log('⏰ Seletor de timeframe configurado');
      }
      
      console.log('🤖 Bot original inicializado com sucesso!');
    }, 100);
    
    // Preencher automaticamente o token baseado na seleção
    setTimeout(() => {
      const tokenInput = document.getElementById('token') as HTMLInputElement;
      if (tokenInput) {
        // Buscar settings do usuário específico
        const userId = window.localStorage.getItem('auth_user');
        let settingsKey = 'mvb_bot_settings_temp';
        if (userId) {
          try {
            const userObj = JSON.parse(userId);
            settingsKey = `mvb_bot_settings_${userObj.id}`;
          } catch (e) {
            console.error('Erro ao parsear user:', e);
          }
        }
        
        const currentSettings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
        const selectedToken = currentSettings.selectedTokenType === 'demo' 
          ? currentSettings.derivTokenDemo 
          : currentSettings.derivTokenReal;
        tokenInput.value = selectedToken || '';
        console.log('Token preenchido automaticamente (usuário específico):', {
          userId: settingsKey,
          selectedType: currentSettings.selectedTokenType,
          hasToken: !!selectedToken,
          token: selectedToken ? 'Token configurado' : 'Token não configurado'
        });
      }
    }, 100);
  };

  // ===== RENDER =====
  // Removido: tela antiga de inserir licença - agora as licenças vêm da API

  // ===== TELA DE LOADING =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="text-center pb-8">
            <div className="text-6xl mb-4">🤖</div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Carregando Zeus
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Verificando suas licenças...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-4">
              Aguarde enquanto verificamos seu acesso
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-2 sm:p-4">
      {/* Container Principal com 3 Abas React - Mobile Optimized */}
      <Card className="shadow-2xl border-0">
        <CardContent className="p-2 sm:p-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6 h-10 sm:h-12">
              <TabsTrigger value="trading" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2">
                <Play className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Zeus</span>
                <span className="sm:hidden">Trading</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Configurações</span>
                <span className="sm:hidden">Config</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="trading" className="space-y-4" forceMount style={{ display: activeTab === 'trading' ? 'block' : 'none' }}>
              {/* Alerta de Licença Inválida */}
              {!isLicenseValid && !loading && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {licenseStatus || 'Nenhuma licença válida. Por favor, renove sua licença.'}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Seletor de Token */}
              <Card className="border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-600 flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Conta Deriv
                  </CardTitle>
                  <CardDescription>
                    Selecione qual conta usar para o trading
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <Button
                      type="button"
                      onClick={() => updateSetting('selectedTokenType', 'demo')}
                      className={`h-auto py-3 px-2 sm:px-4 transition-all duration-200 ${
                        settings.selectedTokenType === 'demo' 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-blue-600' 
                          : 'bg-slate-700 border-blue-300 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-md'
                      }`}
                    >
                      <div className="text-center w-full">
                        <div className="font-semibold text-sm sm:text-base">💎 Demo</div>
                        <div className="text-xs opacity-75 mt-1">
                          {settings.derivTokenDemo ? '✅ Configurado' : '❌ Não configurado'}
                        </div>
                      </div>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => updateSetting('selectedTokenType', 'real')}
                      className={`h-auto py-3 px-2 sm:px-4 transition-all duration-200 ${
                        settings.selectedTokenType === 'real' 
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg border-green-600' 
                          : 'bg-slate-700 border-green-300 text-green-400 hover:bg-green-600 hover:text-white hover:border-green-600 hover:shadow-md'
                      }`}
                    >
                      <div className="text-center w-full">
                        <div className="font-semibold text-sm sm:text-base">💰 Real</div>
                        <div className="text-xs opacity-75 mt-1">
                          {settings.derivTokenReal ? '✅ Configurado' : '❌ Não configurado'}
                        </div>
                      </div>
                    </Button>
                  </div>
                  {(!settings.derivTokenDemo && settings.selectedTokenType === 'demo') || 
                   (!settings.derivTokenReal && settings.selectedTokenType === 'real') ? (
                    <Alert className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Configure o token da conta {settings.selectedTokenType === 'demo' ? 'Demo' : 'Real'} na aba Configurações.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>

              <div ref={botContainerRef} className="w-full">
                {/* O bot original será inserido aqui */}
              </div>
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-4">
              {/* Filtro de Tipo de Conta */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium text-slate-100">Filtrar por Tipo de Conta</h3>
                      <p className="text-xs text-gray-400 mt-1">Separe análises de contas Real e Demo</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant={analyticsAccountFilter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAnalyticsAccountFilter('all')}
                        className="flex-1 sm:flex-none text-xs"
                      >
                        Todas
                      </Button>
                      <Button
                        variant={analyticsAccountFilter === 'real' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAnalyticsAccountFilter('real')}
                        className="flex-1 sm:flex-none text-xs bg-green-600 hover:bg-green-700 border-green-600"
                      >
                        Real
                      </Button>
                      <Button
                        variant={analyticsAccountFilter === 'demo' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAnalyticsAccountFilter('demo')}
                        className="flex-1 sm:flex-none text-xs bg-blue-600 hover:bg-blue-700 border-blue-600"
                      >
                        Demo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estatísticas Gerais */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 text-white shadow-lg">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm opacity-95 font-medium">Total de Trades</p>
                        <p className="text-xl sm:text-3xl font-bold text-white" id="analytics-total-trades">0</p>
                      </div>
                      <Target className="h-6 w-6 sm:h-10 sm:w-10 opacity-90" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0 text-white shadow-lg">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm opacity-95 font-medium">Taxa de Acerto</p>
                        <p className="text-xl sm:text-3xl font-bold text-white" id="analytics-win-rate">0%</p>
                      </div>
                      <TrendingUp className="h-6 w-6 sm:h-10 sm:w-10 opacity-90" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 text-white shadow-lg">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm opacity-95 font-medium">Lucro Total</p>
                        <p className="text-xl sm:text-3xl font-bold text-white" id="analytics-profit">$0.00</p>
                      </div>
                      <DollarSign className="h-6 w-6 sm:h-10 sm:w-10 opacity-90" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0 text-white shadow-lg">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm opacity-95 font-medium">Melhor Sequência</p>
                        <p className="text-xl sm:text-3xl font-bold text-white" id="analytics-best-streak">0</p>
                      </div>
                      <Zap className="h-6 w-6 sm:h-10 sm:w-10 opacity-90" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico de Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Gráfico de Performance
                  </CardTitle>
                  <CardDescription>
                    Evolução do lucro ao longo do tempo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div style={{ background: '#1e293b', borderRadius: '12px', padding: '8px sm:16px', border: '1px solid #475569' }}>
                    <canvas id="performanceChart" style={{ width: '100%', height: '200px sm:300px' }}></canvas>
                  </div>
                </CardContent>
              </Card>

          {/* Histórico Detalhado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Histórico de Operações
              </CardTitle>
              <CardDescription>
                Todas as operações realizadas nesta sessão
              </CardDescription>
              <Button 
                onClick={async () => {
                  console.log('🔄 Forçando recarregamento...');
                  console.log('👤 User ID:', user?.id);
                  
                  // Teste direto da API
                  try {
                    const response = await fetch(`/api/data?action=trading_history&user_id=${user?.id}`);
                    const data = await response.json();
                    console.log('🔍 Resposta direta da API:', data);
                    console.log('📊 Primeiro trade:', data.trades?.[0]);
                  } catch (error) {
                    console.error('❌ Erro no teste direto:', error);
                  }
                  
                  loadAnalyticsFromDatabase();
                }}
                variant="outline" 
                size="sm"
                className="mt-2"
              >
                🔄 Recarregar Dados
              </Button>
            </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ minWidth: '500px' }}>
                      <thead>
                        <tr style={{ background: '#1e293b', borderBottom: '2px solid #475569' }}>
                          <th className="hidden sm:table-cell" style={{ padding: '12px 8px', textAlign: 'left', color: '#f1f5f9', fontSize: '0.8rem', fontWeight: '600' }}>Horário</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left', color: '#f1f5f9', fontSize: '0.8rem', fontWeight: '600' }}>Ativo</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left', color: '#f1f5f9', fontSize: '0.8rem', fontWeight: '600' }}>Sinal</th>
                          <th className="hidden md:table-cell" style={{ padding: '12px 8px', textAlign: 'left', color: '#f1f5f9', fontSize: '0.8rem', fontWeight: '600' }}>Entrada</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left', color: '#f1f5f9', fontSize: '0.8rem', fontWeight: '600' }}>Resultado</th>
                          <th style={{ padding: '12px 8px', textAlign: 'left', color: '#f1f5f9', fontSize: '0.8rem', fontWeight: '600' }}>Lucro</th>
                        </tr>
                      </thead>
                      <tbody id="analytics-history" style={{ color: '#e2e8f0' }}>
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-gray-400">
                            Nenhuma operação registrada ainda
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configurações do Bot
                  </CardTitle>
                  <CardDescription>
                    Configure todos os parâmetros para otimizar sua estratégia
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    
                    {/* Configurações de Entrada */}
                    <Card className="border-blue-200">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg text-blue-600 flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Entrada & Martingale
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="stake-setting" className="text-sm font-medium">Entrada Inicial (USD)</Label>
                          <Input
                            id="stake-setting"
                            type="number"
                            min="0.01"
                            max="1000"
                            step="0.01"
                            value={settings.stake}
                            className="mt-1"
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 1;
                              updateSetting('stake', value);
                            }}
                          />
                        </div>
                        
                        
                        <div>
                          <Label htmlFor="martingale-setting" className="text-sm font-medium">Multiplicador Martingale</Label>
                          <Input
                            id="martingale-setting"
                            type="number"
                            min="2"
                            max="5"
                            step="1"
                            value={settings.martingale}
                            className="mt-1"
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 2;
                              updateSetting('martingale', value);
                            }}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="duration-setting" className="text-sm font-medium">Duração (minutos)</Label>
                          <Input
                            id="duration-setting"
                            type="number"
                            min="1"
                            max="15"
                            value={settings.duration}
                            className="mt-1"
                            onChange={(e) => {
                              const value = e.target.value === '' ? 1 : parseFloat(e.target.value) || 1;
                              updateSetting('duration', value);
                            }}
                            onFocus={(e) => e.target.select()}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Configurações de Risco */}
                    <Card className="border-red-200">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg text-red-600 flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Gestão de Risco
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="stopwin-setting" className="text-sm font-medium">Stop Win (USD)</Label>
                          <Input
                            id="stopwin-setting"
                            type="number"
                            min="0.01"
                            max="1000"
                            step="0.01"
                            value={settings.stopWin}
                            className="mt-1"
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 3;
                              updateSetting('stopWin', value);
                            }}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="stoploss-setting" className="text-sm font-medium">Stop Loss (USD)</Label>
                          <Input
                            id="stoploss-setting"
                            type="number"
                            min="-1000"
                            max="-1"
                            value={settings.stopLoss}
                            className="mt-1"
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || -5;
                              updateSetting('stopLoss', value);
                            }}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="autocloseprofit-setting" className="text-sm font-medium">
                            💰 Percentual de Fechamento (%)
                          </Label>
                          <Input
                            id="autocloseprofit-setting"
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            value={settings.autoCloseProfit}
                            className="mt-1"
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 20;
                              updateSetting('autoCloseProfit', value);
                            }}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Fecha automaticamente ao atingir este percentual de lucro
                          </p>
                        </div>
                        
                      </CardContent>
                    </Card>

                    {/* Configurações da Deriv */}
                    <Card className="border-purple-200">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg text-purple-600 flex items-center gap-2">
                          <Key className="h-5 w-5" />
                          Tokens Deriv
                        </CardTitle>
                        <CardDescription>
                          Configure seus tokens de acesso para conta Demo e Real
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="deriv-token-demo" className="text-sm font-medium">Token Demo</Label>
                          <Input
                            id="deriv-token-demo"
                            type="password"
                            placeholder="Cole aqui seu token da conta Demo"
                            value={settings.derivTokenDemo}
                            className="mt-1"
                            onChange={(e) => {
                              updateSetting('derivTokenDemo', e.target.value);
                            }}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Token da sua conta Demo na Deriv
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="deriv-token-real" className="text-sm font-medium">Token Real</Label>
                          <Input
                            id="deriv-token-real"
                            type="password"
                            placeholder="Cole aqui seu token da conta Real"
                            value={settings.derivTokenReal}
                            className="mt-1"
                            onChange={(e) => {
                              updateSetting('derivTokenReal', e.target.value);
                            }}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Token da sua conta Real na Deriv
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Configurações dos Indicadores */}
                    <Card className="border-green-200">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg text-green-600 flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Indicadores Técnicos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="mhi-setting" className="text-sm font-medium">Períodos MHI</Label>
                          <Input
                            id="mhi-setting"
                            type="number"
                            min="5"
                            max="50"
                            value={settings.mhiPeriods || 20}
                            className="mt-1"
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 20;
                              updateSetting('mhiPeriods', value);
                            }}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="emafast-setting" className="text-sm font-medium">EMA Rápida</Label>
                          <Input
                            id="emafast-setting"
                            type="number"
                            min="5"
                            max="20"
                            value={settings.emaFast || 8}
                            className="mt-1"
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 8;
                              updateSetting('emaFast', value);
                            }}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="emaslow-setting" className="text-sm font-medium">EMA Lenta</Label>
                          <Input
                            id="emaslow-setting"
                            type="number"
                            min="15"
                            max="50"
                            value={settings.emaSlow || 18}
                            className="mt-1"
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 18;
                              updateSetting('emaSlow', value);
                            }}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="rsi-setting" className="text-sm font-medium">RSI Períodos</Label>
                          <Input
                            id="rsi-setting"
                            type="number"
                            min="7"
                            max="21"
                            value={settings.rsiPeriods || 10}
                            className="mt-1"
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 10;
                              updateSetting('rsiPeriods', value);
                            }}
                          />
                        </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* NOTIFICAÇÕES TELEGRAM - NOVO CARD */}
                    <Card className="border-cyan-200">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg text-cyan-600 flex items-center gap-2">
                          <Bell className="h-5 w-5" />
                          Notificações Telegram
                        </CardTitle>
                        <CardDescription>
                          Receba notificações automáticas no Telegram
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="telegram-notifications"
                            checked={telegramSettings.notificationsEnabled}
                            onChange={(e) => {
                              const newSettings = {
                                ...telegramSettings,
                                notificationsEnabled: e.target.checked
                              };
                              setTelegramSettings(newSettings);
                            }}
                            className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                          />
                          <Label htmlFor="telegram-notifications" className="text-sm font-medium">
                            Ativar notificações via Telegram
                          </Label>
                        </div>

                        {telegramSettings.notificationsEnabled && (
                          <>
                            {/* Instruções Detalhadas */}
                            <Alert className="bg-blue-50 border-blue-200">
                              <Bot className="h-4 w-4 text-blue-600" />
                              <AlertDescription className="text-sm text-blue-800">
                                <p className="font-semibold mb-2">📱 Como configurar em 3 passos:</p>
                                <ol className="list-decimal list-inside space-y-2 ml-2">
                                  <li>
                                    <strong>Inicie conversa com o bot:</strong>
                                    <br />
                                    <a 
                                      href="https://t.me/Mvb_pro_bot" 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1 mt-1"
                                    >
                                      Abrir @Mvb_pro_bot →
                                    </a>
                                    <br />
                                    <span className="text-xs text-blue-700">Clique em "Iniciar" e envie qualquer mensagem</span>
                                  </li>
                                  <li>
                                    <strong>Obtenha seu Chat ID:</strong>
                                    <br />
                                    <a 
                                      href="https://t.me/userinfobot" 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1 mt-1"
                                    >
                                      Abrir @userinfobot →
                                    </a>
                                    <br />
                                    <span className="text-xs text-blue-700">Envie qualquer mensagem e ele te responderá com seu ID</span>
                                  </li>
                                  <li>
                                    <strong>Cole o número aqui embaixo</strong>
                                    <br />
                                    <span className="text-xs text-blue-700">Copie apenas os números (ex: 5034947899)</span>
                                  </li>
                                </ol>
                              </AlertDescription>
                            </Alert>

                            <div>
                              <Label htmlFor="user-telegram" className="text-sm font-medium">
                                Seu Chat ID do Telegram
                              </Label>
                              <Input
                                id="user-telegram"
                                type="text"
                                placeholder="Digite seu Chat ID (ex: 5034947899)"
                                value={telegramSettings.userTelegram}
                                className="mt-1 text-lg font-mono"
                                onChange={(e) => {
                                  const newSettings = {
                                    ...telegramSettings,
                                    userTelegram: e.target.value.trim()
                                  };
                                  setTelegramSettings(newSettings);
                                }}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                💡 O Chat ID é um número único de 9-10 dígitos
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={testTelegramNotification}
                                variant="outline"
                                className="flex-1 border-cyan-300 text-cyan-600 hover:bg-cyan-50"
                              >
                                <Bot className="h-4 w-4 mr-2" />
                                Testar
                              </Button>
                              <Button
                                onClick={saveTelegramSettings}
                                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Salvar
                              </Button>
                            </div>

                            {telegramSettings.userTelegram && (
                              <div className="p-3 bg-cyan-50 rounded-lg">
                                <p className="text-sm text-cyan-800">
                                  <strong>Notificações ativas!</strong> Chat ID: {telegramSettings.userTelegram}
                                </p>
                                <p className="text-xs text-cyan-600 mt-1">
                                  ✅ Você receberá alertas quando o bot iniciar, parar, detectar sinais e finalizar trades.
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Botão para Salvar Configurações */}
                  <div className="text-center mt-8">
                    <Button 
                      onClick={saveSettings}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3 text-lg"
                    >
                      <Zap className="mr-2 h-5 w-5" />
                      Salvar Configurações
                    </Button>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* ✅ CORREÇÃO: Adicionar Toaster do sistema React */}
      <ReactToaster />
    </div>
  );
}