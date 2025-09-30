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
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ===== TIPOS TYPESCRIPT =====
interface LicenseInfo {
  type: string;
  days: number;
  features: string[];
  maxDevices: number;
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
  
  // ===== ESTADOS DAS CONFIGURAÇÕES =====
  const [settings, setSettings] = useState({
    stake: 1,
    martingale: 2,
    duration: 2,
    stopWin: 3,
    stopLoss: -5,
    confidence: 70,
    strategy: 'martingale'
  });
  
  // ===== REFS PARA INTEGRAÇÃO COM CÓDIGO ORIGINAL =====
  const botContainerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  // ===== FUNÇÕES DE CONFIGURAÇÃO =====
  const loadSettings = () => {
    const savedSettings = localStorage.getItem('mvb_bot_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem('mvb_bot_settings', JSON.stringify(settings));
      toast({
        title: "✅ Configurações salvas!",
        description: "Suas configurações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "❌ Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
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
    
    // Verificar dispositivos registrados
    const deviceKey = `mvb_device_${key}`;
    const registeredDevice = localStorage.getItem(deviceKey);
    
    if (registeredDevice && registeredDevice !== currentDeviceId) {
      setLicenseStatus('Esta licença já está em uso em outro dispositivo.');
      toast({
        title: "Limite de dispositivos atingido",
        description: `Esta licença permite apenas ${license.maxDevices} dispositivo(s).`,
        variant: "destructive"
      });
      return;
    }
    
    // Registrar dispositivo
    localStorage.setItem(deviceKey, currentDeviceId);
    
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
        // Simular carregamento das licenças do usuário
        // Em uma implementação real, você faria uma chamada para a API
        const mockUserLicenses = [
          {
            id: 1,
            license_key: 'FREE-MG5TKQHT-A7LGSL', // Usar a licença real do usuário
            license_type: 'free',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
            max_devices: 1,
            is_active: true
          }
        ];

        setUserLicenses(mockUserLicenses);
        
        // Verificar se o usuário tem uma licença válida
        const activeLicense = mockUserLicenses.find(license => 
          license.is_active && new Date(license.expires_at) > new Date()
        );

        if (activeLicense) {
          // Usuário tem licença válida, pular validação
          const licenseInfo: LicenseInfo = {
            type: activeLicense.license_type,
            days: Math.ceil((new Date(activeLicense.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            features: activeLicense.license_type === 'free' ? ['limited_features'] : ['all_features'],
            maxDevices: activeLicense.max_devices
          };
          
          setLicenseInfo(licenseInfo);
          setLicenseKey(activeLicense.license_key);
          setIsLicenseValid(true);
          setLicenseStatus('Licença válida encontrada! Acesso liberado.');
          
          toast({
            title: "✅ Acesso liberado!",
            description: `Bem-vindo ao Bot Trading, ${user.name}!`,
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
  }, [isAuthenticated, user, toast]);

  // ===== CARREGAR CONFIGURAÇÕES =====
  useEffect(() => {
    loadSettings();
  }, []);

  // ===== INICIALIZAR BOT ORIGINAL QUANDO LICENÇA FOR VÁLIDA =====
  useEffect(() => {
    if (isLicenseValid && !isInitialized.current && botContainerRef.current) {
      isInitialized.current = true;
      initializeOriginalBot();
    }
  }, [isLicenseValid]);

  // ===== FUNÇÃO PARA INICIALIZAR O BOT ORIGINAL =====
  const initializeOriginalBot = () => {
    if (!botContainerRef.current) return;

    // Inserir HTML do bot original - OTIMIZADO PARA MOBILE
    botContainerRef.current.innerHTML = `
      <div class="bot-interface-original">
        <!-- Indicadores de Sinais - Mobile Optimized -->
        <div class="indicators-container" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 16px; margin: 16px 0; color: white;">
          <h3 style="text-align: center; margin-bottom: 16px; font-size: 1.1rem; font-weight: 600;">📊 Sinais em Tempo Real</h3>
          
          <div class="indicators-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
            <div class="indicator-card" style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 12px; padding: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
              <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 4px;">MHI</div>
              <div class="indicator-value" id="mhiSignal" style="font-weight: bold; font-size: 1rem;">-</div>
            </div>
            <div class="indicator-card" style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 12px; padding: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
              <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 4px;">Tendência</div>
              <div class="indicator-value" id="trendSignal" style="font-weight: bold; font-size: 1rem;">-</div>
            </div>
            <div class="indicator-card" style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 12px; padding: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
              <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 4px;">EMA</div>
              <div class="indicator-value" id="emaSignal" style="font-weight: bold; font-size: 1rem;">-</div>
            </div>
            <div class="indicator-card" style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 12px; padding: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
              <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 4px;">RSI</div>
              <div class="indicator-value" id="rsiValue" style="font-weight: bold; font-size: 1rem;">-</div>
            </div>
            <div class="indicator-card" style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 12px; padding: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
              <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 4px;">Confiança</div>
              <div class="indicator-value" id="confidenceValue" style="font-weight: bold; font-size: 1rem;">-</div>
            </div>
            <div class="indicator-card" style="background: linear-gradient(135deg, #ffd700 0%, #ffb347 100%); border-radius: 12px; padding: 12px; text-align: center; color: #333; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);">
              <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 4px;">SINAL FINAL</div>
              <div class="indicator-value" id="finalSignal" style="font-weight: bold; font-size: 1.1rem;">-</div>
            </div>
          </div>
        </div>

        <!-- Controles Principais - Simplified for Mobile -->
        <div class="main-controls" style="background: white; border-radius: 16px; padding: 20px; margin: 16px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <div class="control-grid" style="display: grid; gap: 16px;">
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 0.9rem;">🔑 Token API Deriv:</label>
              <input type="text" id="token" placeholder="Cole seu token da Deriv" style="width: 100%; padding: 14px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 16px; transition: border-color 0.2s;">
            </div>
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 0.9rem;">📈 Símbolo:</label>
              <select id="symbol" style="width: 100%; padding: 14px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 16px; background: white;">
                <optgroup label="ÍNDICES VOLÁTEIS">
                  <option value="R_10">Volatility 10 Index</option>
                  <option value="R_25">Volatility 25 Index</option>
                  <option value="R_50">Volatility 50 Index</option>
                  <option value="R_75">Volatility 75 Index</option>
                  <option value="R_100">Volatility 100 Index</option>
                </optgroup>
                <optgroup label="FOREX MAJORS">
                  <option value="frxEURUSD">EUR/USD</option>
                  <option value="frxGBPUSD">GBP/USD</option>
                  <option value="frxUSDJPY">USD/JPY</option>
                </optgroup>
              </select>
            </div>
          </div>

          <!-- Botões de Controle - Mobile Optimized -->
          <div class="button-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px;">
            <button onclick="startBot()" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); transition: transform 0.2s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">
              ▶ Iniciar Bot
            </button>
            <button onclick="stopBot()" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3); transition: transform 0.2s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">
              ⏹ Parar Bot
            </button>
          </div>
        </div>

        <!-- Status Cards - Mobile Grid -->
        <div class="status-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 16px 0;">
          <div class="status-card" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 16px; border-radius: 12px; text-align: center; color: white; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">
            <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 4px;">Status</div>
            <div class="status-value" id="status" style="font-size: 1rem; font-weight: bold;">⏳ Aguardando...</div>
          </div>
          <div class="status-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 16px; border-radius: 12px; text-align: center; color: white; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
            <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 4px;">Saldo</div>
            <div class="status-value" style="font-size: 1rem; font-weight: bold;">$<span id="balance">0</span></div>
          </div>
          <div class="status-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 16px; border-radius: 12px; text-align: center; color: white; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);">
            <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 4px;">Lucro</div>
            <div class="status-value" id="profit" style="font-size: 1rem; font-weight: bold;">$0</div>
          </div>
          <div class="status-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 16px; border-radius: 12px; text-align: center; color: white; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
            <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 4px;">Precisão</div>
            <div class="status-value" id="accuracy" style="font-size: 1rem; font-weight: bold;">0%</div>
          </div>
          <div class="status-card" style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 16px; border-radius: 12px; text-align: center; color: white; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);">
            <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 4px;">Dados</div>
            <div class="status-value" id="dataCount" style="font-size: 1rem; font-weight: bold;">0</div>
          </div>
          <div class="status-card" style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); padding: 16px; border-radius: 12px; text-align: center; color: white; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.3);">
            <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 4px;">Martingale</div>
            <div class="status-value" id="martingaleStatus" style="font-size: 1rem; font-weight: bold;">0/3</div>
          </div>
          <div class="status-card" style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); padding: 16px; border-radius: 12px; text-align: center; color: white; box-shadow: 0 4px 15px rgba(132, 204, 22, 0.3);">
            <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 4px;">Entrada</div>
            <div class="status-value" id="currentStake" style="font-size: 1rem; font-weight: bold;">$1</div>
          </div>
        </div>

        <!-- Log Compacto para Mobile -->
        <div class="log-container" style="background: #1f2937; border-radius: 16px; margin: 16px 0; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #374151 0%, #1f2937 100%); padding: 12px; border-bottom: 1px solid #374151;">
            <h3 style="color: #f9fafb; margin: 0; font-size: 1rem; font-weight: 600;">📋 Log do Sistema</h3>
          </div>
          <div id="log" style="background: #111827; color: #10b981; padding: 16px; font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace; height: 200px; overflow-y: auto; font-size: 13px; line-height: 1.4;"></div>
        </div>

        <!-- Histórico Responsivo -->
        <div class="history-container" style="background: white; border-radius: 16px; margin: 16px 0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px; color: white;">
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600;">📊 Histórico de Operações</h3>
          </div>
          <div class="table-container" style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="border: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; font-weight: 600; color: #475569; font-size: 0.85rem;">Contrato</th>
                  <th style="border: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; font-weight: 600; color: #475569; font-size: 0.85rem;">Sinal</th>
                  <th style="border: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; font-weight: 600; color: #475569; font-size: 0.85rem;">Confiança</th>
                  <th style="border: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; font-weight: 600; color: #475569; font-size: 0.85rem;">Entrada</th>
                  <th style="border: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; font-weight: 600; color: #475569; font-size: 0.85rem;">Resultado</th>
                  <th style="border: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; font-weight: 600; color: #475569; font-size: 0.85rem;">Lucro</th>
                  <th style="border: 1px solid #e2e8f0; padding: 12px 8px; text-align: center; font-weight: 600; color: #475569; font-size: 0.85rem;">Hora</th>
                </tr>
              </thead>
              <tbody id="historyBody"></tbody>
            </table>
          </div>
        </div>

        <!-- Campos ocultos para configurações -->
        <div style="display: none;">
          <input type="number" id="stake" value="1" min="1" max="1000" step="1">
          <input type="number" id="martingale" value="2" min="2" max="5" step="1">
          <input type="number" id="duration" value="2" min="1" max="5">
          <input type="number" id="stopWin" value="3" min="1" max="1000">
          <input type="number" id="stopLoss" value="-5" min="-1000" max="-1">
          <input type="number" id="minConfidence" value="75" min="50" max="90">
          <input type="number" id="mhiPeriods" value="20" min="5" max="50">
          <input type="number" id="emaFast" value="8" min="5" max="20">
          <input type="number" id="emaSlow" value="18" min="15" max="50">
          <input type="number" id="rsiPeriods" value="10" min="7" max="21">
        </div>
      </div>
    `;

    // Inserir JavaScript do bot original - COM CORREÇÃO DO BUG
    const script = document.createElement('script');
    script.innerHTML = `
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
          rsiPeriods: document.getElementById('rsiPeriods').value
        };
        
        localStorage.setItem('mvb_bot_settings', JSON.stringify(settings));
        
        // Mostrar notificação de sucesso
        alert('✅ Configurações salvas com sucesso!');
        addLog('💾 Configurações salvas no armazenamento local');
      }

      // ===== CARREGAR CONFIGURAÇÕES SALVAS =====
      function loadSettings() {
        const savedSettings = localStorage.getItem('mvb_bot_settings');
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
            
            addLog('📥 Configurações carregadas do armazenamento local');
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
      let rsiPeriods = 14;
      let minConfidence = 70;

      let stats = {
        total: 0,
        wins: 0,
        losses: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0
      };

      let martingaleLevel_current = 0;
      let maxMartingale_current = 3;
      let priceData = [];
      let volumeData = [];
      let isTrading = false;
      let lastTradeTime = 0;
      let minTradeInterval = 60000;

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

      // ===== FUNÇÕES PRINCIPAIS DO BOT =====
      function startBot() {
        if (isRunning) {
          alert("Bot já está em execução!");
          return;
        }

        const token = document.getElementById("token").value.trim();
        if (!token) {
          alert("Token da Deriv é obrigatório para conectar!");
          return;
        }

        // Carregar configurações dos campos
        initialStake = Math.round(parseFloat(document.getElementById("stake").value) || 1);
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

        priceData = [];
        volumeData = [];
        isTrading = false;
        martingaleLevel_current = 0;
        lastTradeTime = 0;
        stats = { total: 0, wins: 0, losses: 0, consecutiveWins: 0, consecutiveLosses: 0 };
        profit = 0;

        addLog(\`🚀 Iniciando Bot MVB - Par: \${symbol}\`);
        addLog(\`⚙️ Configurações: MHI(\${mhiPeriods}) | EMA(\${emaFast}/\${emaSlow}) | RSI(\${rsiPeriods})\`);
        document.getElementById("status").innerText = "🔄 Conectando...";
        updateMartingaleStatus();
        updateAccuracy();
        updateDataCount();
        document.getElementById("profit").innerText = "$0";

        ws = connectWebSocket(token);
      }

      function connectWebSocket(token, endpointIndex = 0) {
        if (endpointIndex >= WEBSOCKET_ENDPOINTS.length) {
          addLog("❌ Todos os endpoints falharam.");
          return null;
        }

        const endpoint = WEBSOCKET_ENDPOINTS[endpointIndex] + "?app_id=1089";
        
        try {
          const websocket = new WebSocket(endpoint);
          
          websocket.onopen = () => {
            addLog("✅ WebSocket conectado!");
            document.getElementById("status").innerText = "🔐 Autenticando...";
            websocket.send(JSON.stringify({ authorize: token }));
          };

          websocket.onmessage = (event) => {
            handleWebSocketMessage(event, websocket);
          };

          websocket.onclose = (event) => {
            if (!event.wasClean && isRunning) {
              addLog("🔴 Conexão perdida. Reconectando...");
              setTimeout(() => connectWebSocket(token, endpointIndex + 1), 2000);
            }
          };

          websocket.onerror = () => {
            addLog(\`❌ Erro de conexão.\`);
          };

          return websocket;
        } catch (error) {
          addLog(\`❌ Erro ao criar WebSocket\`);
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
            websocket.send(JSON.stringify({ balance: 1, subscribe: 1 }));
            websocket.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
            addLog(\`📊 Monitorando: \${symbol}\`);
          }

          if (data.msg_type === "balance") {
            const balance = data.balance?.balance || 0;
            document.getElementById("balance").innerText = balance;
            addLog(\`💰 Saldo: $\${balance} USD\`);
            
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
            websocket.send(JSON.stringify({ 
              proposal_open_contract: 1, 
              subscribe: 1, 
              contract_id: data.buy.contract_id 
            }));
          }

          if (data.msg_type === "proposal_open_contract") {
            const contract = data.proposal_open_contract;
            if (contract.is_sold) {
              handleTradeResult(contract);
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
          
          const maxDataPoints = Math.max(mhiPeriods, emaSlow, rsiPeriods) * 2;
          if (priceData.length > maxDataPoints) {
            priceData = priceData.slice(-maxDataPoints);
            volumeData = volumeData.slice(-maxDataPoints);
          }
          
          updateDataCount();
          
          if (priceData.length >= Math.max(mhiPeriods, emaSlow, rsiPeriods) && isRunning && !isTrading) {
            const analysis = analyzeSignals(priceData, volumeData);
            
            if (analysis && analysis.finalSignal !== "NEUTRO" && analysis.confidence >= minConfidence) {
              updateSignalsDisplay(analysis.signals, analysis.confidence);
              
              addLog(\`🎯 SINAL: \${analysis.finalSignal} (\${analysis.confidence}%)\`);
              
              isTrading = true;
              executeTrade(analysis.finalSignal, websocket);
            }
          }
        } catch (error) {
          addLog(\`❌ Erro processando tick: \${error.message}\`);
        }
      }

      function analyzeSignals(prices, volumes) {
        try {
          if (!prices || prices.length < Math.max(mhiPeriods, emaSlow, rsiPeriods)) {
            return null;
          }
          
          // MHI Calculation
          const mhiData = prices.slice(-mhiPeriods);
          let highSum = 0, lowSum = 0;
          mhiData.forEach(candle => {
            highSum += candle.high;
            lowSum += candle.low;
          });
          
          const avgHigh = highSum / mhiPeriods;
          const avgLow = lowSum / mhiPeriods;
          const currentPrice = mhiData[mhiData.length - 1].close;
          
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
          
          // RSI Calculation
          const rsi = calculateRSI(prices, rsiPeriods);
          let rsiSignal = "NEUTRO";
          if (rsi < 30) {
            rsiSignal = "CALL";
          } else if (rsi > 70) {
            rsiSignal = "PUT";
          }
          
          const signals = {
            mhi: mhiSignal,
            trend: trendSignal,
            ema: currentPrice > emaFastValue ? "CALL" : "PUT",
            rsi: rsiSignal,
            volume: "NEUTRO"
          };
          
          const finalSignal = calculateFinalSignal(signals);
          const confidence = calculateConfidence(signals, rsi);
          
          return {
            signals: { ...signals, final: finalSignal },
            confidence,
            finalSignal
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

      function calculateFinalSignal(signals) {
        const weights = { mhi: 0.3, trend: 0.3, ema: 0.2, rsi: 0.2, volume: 0.0 };
        let callScore = 0, putScore = 0;
        
        Object.keys(signals).forEach(key => {
          if (signals[key] === "CALL") callScore += weights[key] || 0;
          else if (signals[key] === "PUT") putScore += weights[key] || 0;
        });
        
        if (callScore > putScore && callScore > 0.4) return "CALL";
        if (putScore > callScore && putScore > 0.4) return "PUT";
        return "NEUTRO";
      }

      function calculateConfidence(signals, rsi) {
        let confidence = 0;
        Object.values(signals).forEach(signal => {
          if (signal !== "NEUTRO") confidence += 20;
        });
        if (rsi < 20 || rsi > 80) confidence += 10;
        else if (rsi < 30 || rsi > 70) confidence += 5;
        return Math.min(95, confidence);
      }

      function updateSignalsDisplay(signals, confidence) {
        document.getElementById("mhiSignal").textContent = signals.mhi || "-";
        document.getElementById("trendSignal").textContent = signals.trend || "-";
        document.getElementById("emaSignal").textContent = signals.ema || "-";
        document.getElementById("rsiValue").textContent = signals.rsi || "-";
        document.getElementById("confidenceValue").textContent = confidence ? \`\${confidence}%\` : "-";
        document.getElementById("finalSignal").textContent = signals.final || "-";
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
      }

      function handleTradeResult(contract) {
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
        updateAccuracy();

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
        document.getElementById("martingaleStatus").textContent = \`\${martingaleLevel_current}/\${maxMartingale_current}\`;
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
        } catch (error) {
          addLog(\`❌ Erro ao adicionar trade ao histórico: \${error.message}\`);
        }
      }

      function stopBot() {
        isRunning = false;
        isTrading = false;
        
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
        addLog("🤖 Bot MVB carregado com sucesso!");
        addLog("📱 Interface otimizada para mobile");
        addLog("⚙️ Configure na aba 'Configurações' para começar");
        addLog("🔧 Bug do contractId.slice corrigido!");
      }, 1000);
    `;
    
    document.head.appendChild(script);
  };

  // ===== RENDER =====
  if (!isLicenseValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="text-center pb-8">
            <div className="text-6xl mb-4">🤖</div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Bot MVB
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Sistema de Trading Automatizado
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label htmlFor="licenseKey" className="text-base font-semibold">
                Insira sua Licença:
              </Label>
              <Input
                id="licenseKey"
                type="text"
                placeholder="Digite sua chave de licença"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                maxLength={20}
                className="h-12 text-center font-mono text-lg"
              />
            </div>
            
            <Button 
              onClick={validateLicense}
              className="w-full h-12 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={!licenseKey.trim()}
            >
              <Key className="mr-2 h-5 w-5" />
              Acessar Sistema
            </Button>
            
            {licenseStatus && (
              <Alert className={licenseStatus.includes('sucesso') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {licenseStatus.includes('sucesso') ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={licenseStatus.includes('sucesso') ? 'text-green-800' : 'text-red-800'}>
                  {licenseStatus}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Licenças de exemplo */}
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  Licenças Disponíveis:
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-mono bg-gray-200 px-2 py-1 rounded">STANDARD-MVB-2025</span>
                  <span className="text-green-600 font-semibold">30 dias | 2 dispositivos</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono bg-gray-200 px-2 py-1 rounded">PRO-MVB-UNLIMITED</span>
                  <span className="text-purple-600 font-semibold">365 dias | 5 dispositivos</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono bg-gray-200 px-2 py-1 rounded">FREE-MVB-24</span>
                  <span className="text-blue-600 font-semibold">1 dia | 1 dispositivo</span>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== TELA DE LOADING =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="text-center pb-8">
            <div className="text-6xl mb-4">🤖</div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Carregando Bot Trading
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-2 sm:p-4">
      {/* Header ULTRA COMPACTO para Mobile */}
      <div className="mb-4 sm:mb-6">
        <Card className="border-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl">
          <CardHeader className="text-center py-3 sm:py-4 px-3 sm:px-4">
            <CardTitle className="text-base sm:text-xl md:text-2xl font-bold flex items-center justify-center gap-2">
              <Bot className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
              <span className="whitespace-nowrap">MVB Pro</span>
            </CardTitle>
            <CardDescription className="text-blue-100 text-xs sm:text-sm md:text-base mt-1">
              Trading Bot com IA
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Status da Licença - Compacto */}
      <Card className="border-green-200 bg-green-50/50 mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
              <span className="font-semibold text-green-800 text-sm sm:text-base">
                Licença {licenseInfo?.type.toUpperCase()} Ativa
              </span>
            </div>
            <Badge variant="default" className="bg-green-600 text-xs sm:text-sm">
              ✅ {licenseInfo?.days} dias
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Container Principal com 3 Abas React - Mobile Optimized */}
      <Card className="shadow-2xl border-0">
        <CardContent className="p-2 sm:p-6">
          <Tabs defaultValue="trading" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6 h-10 sm:h-12">
              <TabsTrigger value="trading" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2">
                <Play className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">Bot Trading</span>
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
            
            <TabsContent value="trading" className="space-y-4">
              <div ref={botContainerRef} className="w-full">
                {/* O bot original será inserido aqui */}
              </div>
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Analytics e Performance
                  </CardTitle>
                  <CardDescription>
                    Análise detalhada do desempenho do bot
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-500">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Analytics em Desenvolvimento</h3>
                    <p className="text-sm">Esta seção mostrará:</p>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>• Gráficos de performance</li>
                      <li>• Estatísticas detalhadas</li>
                      <li>• Análise de risco</li>
                      <li>• Histórico de lucros</li>
                    </ul>
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
                            min="1"
                            max="1000"
                            step="1"
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
                            max="5"
                            value={settings.duration}
                            className="mt-1"
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 2;
                              updateSetting('duration', value);
                            }}
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
                            min="1"
                            max="1000"
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
                          <Label htmlFor="confidence-setting" className="text-sm font-medium">Confiança Mínima (%)</Label>
                          <Input
                            id="confidence-setting"
                            type="number"
                            min="50"
                            max="90"
                            value={settings.confidence}
                            className="mt-1"
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 70;
                              updateSetting('confidence', value);
                            }}
                          />
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
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="mhi-setting" className="text-sm font-medium">Períodos MHI</Label>
                          <Input
                            id="mhi-setting"
                            type="number"
                            min="5"
                            max="50"
                            defaultValue="20"
                            className="mt-1"
                            onChange={(e) => {
                              const hiddenInput = document.getElementById('mhiPeriods');
                              if (hiddenInput) (hiddenInput as HTMLInputElement).value = e.target.value;
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
                            defaultValue="8"
                            className="mt-1"
                            onChange={(e) => {
                              const hiddenInput = document.getElementById('emaFast');
                              if (hiddenInput) (hiddenInput as HTMLInputElement).value = e.target.value;
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
                            defaultValue="18"
                            className="mt-1"
                            onChange={(e) => {
                              const hiddenInput = document.getElementById('emaSlow');
                              if (hiddenInput) (hiddenInput as HTMLInputElement).value = e.target.value;
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
                            defaultValue="10"
                            className="mt-1"
                            onChange={(e) => {
                              const hiddenInput = document.getElementById('rsiPeriods');
                              if (hiddenInput) (hiddenInput as HTMLInputElement).value = e.target.value;
                            }}
                          />
                        </div>
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

                  {/* Informações sobre as configurações */}
                  <Alert className="mt-6">
                    <HelpCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>💡 Dicas de Configuração:</strong>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li><strong>Entrada Inicial:</strong> Comece com valores baixos para testar</li>
                        <li><strong>Martingale:</strong> Use 2x para menor risco, 3x para maior agressividade</li>
                        <li><strong>Stop Win/Loss:</strong> Defina limites para proteger seu capital</li>
                        <li><strong>Confiança:</strong> 75%+ recomendado para sinais mais seguros</li>
                        <li><strong>Indicadores:</strong> Valores padrão são otimizados para a maioria dos casos</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}