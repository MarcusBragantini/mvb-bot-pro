import React, { useEffect, useRef, useState } from "react";

/**
 * BotInterface.tsx
 * Versão atualizada com suporte a:
 * - modo scalping (scalpMode)
 * - position sizing baseado em risco (% do capital)
 * - stop-win / stop-loss diários (pausa automática)
 * - limite de trades por minuto (anti-overtrading)
 * - listener de mensagens WebSocket usando addEventListener (não sobrescreve onmessage)
 * - painel simples de controle e indicadores
 *
 * Observações:
 * - Integre a conexão WebSocket (derivWS) com sua implementação atual.
 * - Ajuste endpoints / métodos de persistência (saveTradeToDatabase) conforme seu backend.
 * - Teste inicialmente em modo paper/demo antes de usar em real.
 */

type TradeRecord = {
  id: string;
  symbol: string;
  direction: "CALL" | "PUT";
  stake: number;
  payout: number;
  profit: number;
  entryTime: string;
  exitTime?: string;
  durationSec?: number;
};

type Settings = {
  stake: number; // valor base em USD
  maxRiskPerTradePercent: number; // % do capital
  stopWinDaily?: number; // $
  stopLossDaily?: number; // $ (positivo, quantidade máxima de perda que pausa o bot)
  maxTradesPerMinute?: number; // limite de entradas por minuto
  durationSec?: number; // duração padrão das operações (scalp curtas)
  minConfidence?: number; // probabilidade mínima para entrar (0-100)
  paperMode?: boolean; // apenas simula
  // Configurações Deriv
  derivToken?: string; // Token de autenticação Deriv
  derivAppId?: string; // App ID da Deriv
  accountType?: 'demo' | 'real'; // Tipo de conta
  selectedSymbol?: string; // Símbolo selecionado para trading
};

export default function BotInterface() {
  // === states ===
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [scalpMode, setScalpMode] = useState(true);
  const [settings, setSettings] = useState<Settings>({
    stake: 1.0,
    maxRiskPerTradePercent: 1, // 1% do capital por trade
    stopWinDaily: 50,
    stopLossDaily: 50,
    maxTradesPerMinute: 6,
    durationSec: 60, // 60s trades por padrão para scalping
    minConfidence: 60,
    paperMode: false, // Mudado para false para operar de verdade
    // Configurações Deriv
    derivToken: '',
    derivAppId: '1089', // App ID padrão da Deriv
    accountType: 'demo',
    selectedSymbol: 'R_10', // Símbolo padrão
  });

  const [accountBalance, setAccountBalance] = useState<number>(1000); // fallback - integrar com API
  const [dailyPnL, setDailyPnL] = useState<number>(0);
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
  const [tradesTimestamps, setTradesTimestamps] = useState<number[]>([]);
  const [dailyStopped, setDailyStopped] = useState<{ stopWin?: boolean; stopLoss?: boolean }>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'authenticated'>('disconnected');
  const [availableSymbols, setAvailableSymbols] = useState<Array<{symbol: string, display_name: string}>>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  const derivWSRef = useRef<WebSocket | null>(null);
  const processingBuyRef = useRef(false);

  // === utility functions ===

  // Calcula o tamanho da posição baseado no capital e percentagem de risco
  const calculatePositionSize = (balance: number, riskPercent: number) => {
    const maxRiskUSD = (balance * (riskPercent / 100));
    // Stake mínimo prático
    const minStake = 0.35;
    // Limitando: não mais que 5% do capital mesmo que o usuário informe >5
    const capped = Math.max(minStake, Math.min(maxRiskUSD, balance * 0.05));
    return parseFloat(capped.toFixed(2));
  };

  // Conta quantos trades nos últimos 60s
  const countRecentTrades = () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    return tradesTimestamps.filter((t) => t > oneMinuteAgo).length;
  };

  // Atualiza PnL diário e aplica stop checks
  const updateDailyPnL = (profit: number) => {
    setDailyPnL((prev) => {
      const next = parseFloat((prev + profit).toFixed(2));
      // checar stop win / stop loss
      if (settings.stopWinDaily !== undefined && next >= settings.stopWinDaily) {
        setDailyStopped((s) => ({ ...s, stopWin: true }));
        setIsBotRunning(false);
        console.info("Stop Win diário atingido. Bot pausado.");
      }
      if (settings.stopLossDaily !== undefined && next <= -Math.abs(settings.stopLossDaily)) {
        setDailyStopped((s) => ({ ...s, stopLoss: true }));
        setIsBotRunning(false);
        console.info("Stop Loss diário atingido. Bot pausado.");
      }
      return next;
    });
  };

  // Checa se o bot pode executar mais trades (stop global + trades/minuto)
  const checkExecutionAllowed = () => {
    if (dailyStopped.stopWin || dailyStopped.stopLoss) return { allowed: false, reason: "Stop diário atingido" };
    const recent = countRecentTrades();
    const limit = scalpMode ? (settings.maxTradesPerMinute ?? 6) : (settings.maxTradesPerMinute ?? 3);
    if (recent >= limit) return { allowed: false, reason: `Limite de trades por minuto atingido (${limit})` };
    return { allowed: true };
  };

  // === WebSocket / Deriv API Integration ===

  const connectDeriv = async () => {
    if (derivWSRef.current) derivWSRef.current.close();
    
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    // URL da Deriv WebSocket
    const wsUrl = settings.accountType === 'demo' 
      ? 'wss://ws.binaryws.com/websockets/v3?app_id=' + settings.derivAppId
      : 'wss://ws.binaryws.com/websockets/v3?app_id=' + settings.derivAppId;
    
    const ws = new WebSocket(wsUrl);
    derivWSRef.current = ws;

    ws.addEventListener("open", () => {
      console.info("WebSocket Deriv conectado");
      setConnectionStatus('connected');
      
      // Autenticar se token fornecido
      if (settings.derivToken) {
        authenticateDeriv(settings.derivToken);
      } else {
        setIsConnecting(false);
        console.warn("Token Deriv não fornecido. Configure o token para operar.");
      }
    });

    ws.addEventListener("close", (ev) => {
      console.warn("WebSocket Deriv fechado", ev);
      derivWSRef.current = null;
      setConnectionStatus('disconnected');
      setIsAuthenticated(false);
    });

    ws.addEventListener("error", (err) => {
      console.error("WebSocket Deriv erro", err);
      setConnectionStatus('disconnected');
      setIsConnecting(false);
    });

    // Listener global para mensagens da Deriv
    ws.addEventListener("message", handleDerivMessage);
  };

  // Autenticação com Deriv
  const authenticateDeriv = (token: string) => {
    const ws = derivWSRef.current;
    if (!ws) return;

    const authRequest = {
      authorize: token
    };

    ws.send(JSON.stringify(authRequest));
  };

  // Handler para mensagens da Deriv
  const handleDerivMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.msg_type === 'authorize') {
        if (data.error) {
          console.error("Erro de autenticação:", data.error);
          setConnectionStatus('connected');
          setIsAuthenticated(false);
        } else {
          console.info("Autenticado com sucesso na Deriv");
          setConnectionStatus('authenticated');
          setIsAuthenticated(true);
          setAccountBalance(parseFloat(data.authorize.balance || 0));
          
          // Carregar símbolos disponíveis
          loadAvailableSymbols();
        }
        setIsConnecting(false);
      }
      
      if (data.msg_type === 'active_symbols') {
        const symbols = data.active_symbols.map((s: any) => ({
          symbol: s.symbol,
          display_name: s.display_name
        }));
        setAvailableSymbols(symbols);
      }
      
      if (data.msg_type === 'tick') {
        setCurrentPrice(parseFloat(data.tick.quote));
      }
      
      if (data.msg_type === 'buy') {
        handleTradeResult(data);
      }
      
    } catch (error) {
      console.error("Erro ao processar mensagem Deriv:", error);
    }
  };

  // Carregar símbolos disponíveis
  const loadAvailableSymbols = () => {
    const ws = derivWSRef.current;
    if (!ws) return;

    const request = {
      active_symbols: 1,
      product_type: 'basic'
    };

    ws.send(JSON.stringify(request));
  };

  // Handler para resultados de trades
  const handleTradeResult = (data: any) => {
    if (data.error) {
      console.error("Erro no trade:", data.error);
      return;
    }

    const trade: TradeRecord = {
      id: data.buy.contract_id,
      symbol: settings.selectedSymbol || 'R_10',
      direction: data.buy.contract_type === 'CALL' ? 'CALL' : 'PUT',
      stake: parseFloat(data.buy.buy_price),
      payout: parseFloat(data.buy.payout || 0),
      profit: parseFloat(data.buy.sell_price || 0) - parseFloat(data.buy.buy_price),
      entryTime: new Date().toISOString(),
    };

    // Adicionar ao histórico
    setTradeHistory(prev => [trade, ...prev.slice(0, 49)]); // Manter últimos 50
    setTradesTimestamps(prev => [Date.now(), ...prev.slice(0, 49)]);
    
    // Atualizar PnL
    updateDailyPnL(trade.profit);
    
    console.info("Trade executado:", trade);
  };

  // Cria um listener temporário para proposals que compra automaticamente a proposta quando recebida
  const addProposalListener = (adjustedStake: number, onBuyResult?: (trade: TradeRecord) => void) => {
    const ws = derivWSRef.current;
    if (!ws) return;

    const listener = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        // Proposal incoming
        if (data && data.proposal && data.proposal.id && !processingBuyRef.current) {
          processingBuyRef.current = true;
          const buyMsg = { buy: data.proposal.id, price: adjustedStake };
          ws.send(JSON.stringify(buyMsg));
        }

        // Buy result
        if (data && data.buy) {
          const buy = data.buy;
          // construir trade record simples
          const trade: TradeRecord = {
            id: buy.transaction_id || String(Date.now()),
            symbol: buy.echo_req?.buy?.contract_id || buy.contract_id || "UNKN",
            direction: buy.longcode?.includes("CALL") ? "CALL" : "PUT",
            stake: buy.buy_price ?? adjustedStake,
            payout: buy.payout ?? 0,
            profit: (buy.payout ?? 0) - (buy.buy_price ?? adjustedStake),
            entryTime: new Date().toISOString(),
          };
          // guardar
          setTradeHistory((prev) => [trade, ...prev].slice(0, 200));
          // atualizar PnL
          updateDailyPnL(trade.profit);
          // registrar timestamp para limitar frequência
          setTradesTimestamps((prev) => [...prev.filter((t) => t > Date.now() - 60_000), Date.now()]);
          if (onBuyResult) onBuyResult(trade);
        }
      } catch (err) {
        console.error("Erro no listener de proposal/buy", err);
      } finally {
        // removemos o flag de processamento após um pequeno timeout para evitar double-buys
        setTimeout(() => (processingBuyRef.current = false), 1500);
      }
    };

    ws.addEventListener("message", listener);

    // remover listener após um tempo (margem) para evitar listeners acumulados
    const cleanupTimeout = setTimeout(() => {
      if (ws) ws.removeEventListener("message", listener);
    }, (settings.durationSec ?? 60) * 1000 + 15_000);

    // retornar função de cleanup
    return () => {
      clearTimeout(cleanupTimeout);
      if (ws) ws.removeEventListener("message", listener);
    };
  };

  // === Core: executar trade na Deriv API ===
  // analysis: { symbol, direction, confidence }
  const executeTrade = async (analysis: { symbol: string; direction: "CALL" | "PUT"; confidence: number }) => {
    if (!isBotRunning) return console.info("Bot não está rodando");
    if (!isAuthenticated) return console.warn("Não autenticado na Deriv");

    // validações globais
    const allow = checkExecutionAllowed();
    if (!allow.allowed) return console.warn("Execução negada:", allow.reason);

    // confiança mínima
    if (analysis.confidence < (settings.minConfidence ?? 0)) {
      console.log("Confiança abaixo do mínimo: ", analysis.confidence);
      return;
    }

    // calcular stake com base em risco
    const stakeByRisk = calculatePositionSize(accountBalance, settings.maxRiskPerTradePercent);
    const confidenceMultiplier = Math.min(1.3, analysis.confidence / 100);
    const adjustedStake = Math.max(0.35, parseFloat((stakeByRisk * confidenceMultiplier).toFixed(2)));

    // checagem novamente antes de enviar
    const allow2 = checkExecutionAllowed();
    if (!allow2.allowed) return console.warn("Execução negada (2):", allow2.reason);

    const ws = derivWSRef.current;
    if (!ws) return console.warn("WebSocket Deriv não conectado");

    try {
      // Executar trade diretamente na Deriv
      const buyRequest = {
        buy: 1,
        price: adjustedStake,
        symbol: analysis.symbol,
        contract_type: analysis.direction,
        duration: settings.durationSec ?? 60,
        duration_unit: 's',
        basis: 'stake'
      };

      console.info("Executando trade na Deriv:", buyRequest);
      ws.send(JSON.stringify(buyRequest));
      
      // Adicionar timestamp para controle de trades por minuto
      setTradesTimestamps(prev => [Date.now(), ...prev.slice(0, 49)]);
      
    } catch (error) {
      console.error("Erro ao executar trade:", error);
    }
  };

  // === Análise simples para gerar sinais ===
  const generateTradingSignal = () => {
    if (!isAuthenticated || !currentPrice) return null;
    
    // Análise simples baseada em preço
    const randomFactor = Math.random();
    const confidence = Math.floor(Math.random() * 40) + 60; // 60-100%
    
    // Simular análise técnica básica
    const direction = randomFactor > 0.5 ? "CALL" : "PUT";
    
    return {
      symbol: settings.selectedSymbol || 'R_10',
      direction: direction as "CALL" | "PUT",
      confidence: confidence
    };
  };

  // === Simulação de função que salva trade no backend ===
  const saveTradeToBackend = async (trade: TradeRecord) => {
    // adapt to your API
    try {
      // await fetch('/api/trades', { method: 'POST', body: JSON.stringify(trade) })
      console.info('Salvando trade no backend (placeholder)', trade.id, trade);
    } catch (err) {
      console.error('Falha ao salvar trade', err);
    }
  };

  // === Análise e execução de trades ===
  const analyzeAndExecute = () => {
    if (!isBotRunning || !isAuthenticated) return;
    
    const signal = generateTradingSignal();
    if (signal) {
      console.info("Sinal gerado:", signal);
      executeTrade(signal);
    }
  };

  // === Start/Stop bot ===
  useEffect(() => {
    let interval: number | undefined;
    if (isBotRunning && isAuthenticated) {
      // Analisar a cada X segundos — em scalping interval menor
      const intervalSec = scalpMode ? 5 : 10;
      interval = window.setInterval(() => {
        analyzeAndExecute();
      }, intervalSec * 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isBotRunning, scalpMode, isAuthenticated, settings]);

  // === UI / controles simples ===
  return (
    <div style={{ padding: 18, fontFamily: "Inter, Roboto, sans-serif", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      <h2 style={{ color: "#60a5fa", fontSize: 28, marginBottom: 20 }}>🤖 Bot Interface — Scalper (Risk Managed)</h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 260, padding: 16, borderRadius: 12, background: "#1e293b", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", border: "1px solid #334155" }}>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#cbd5e1", cursor: "pointer" }}>
            <span style={{ fontWeight: 500 }}>Modo Scalping</span>
            <input type="checkbox" checked={scalpMode} onChange={(e) => setScalpMode(e.target.checked)} style={{ cursor: "pointer", width: 18, height: 18 }} />
          </label>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>💰 Stake base (USD)</label>
            <input
              type="number"
              value={settings.stake}
              step={0.1}
              onChange={(e) => setSettings((s) => ({ ...s, stake: parseFloat(e.target.value || "0") }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", fontSize: 14 }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>📊 Risco por trade (% do capital)</label>
            <input
              type="number"
              value={settings.maxRiskPerTradePercent}
              step={0.1}
              onChange={(e) => setSettings((s) => ({ ...s, maxRiskPerTradePercent: parseFloat(e.target.value || "0") }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", fontSize: 14 }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>⏱️ Duração (segundos)</label>
            <input
              type="number"
              value={settings.durationSec}
              onChange={(e) => setSettings((s) => ({ ...s, durationSec: parseInt(e.target.value || "60") }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", fontSize: 14 }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>🎯 Confiança mínima (%)</label>
            <input
              type="number"
              value={settings.minConfidence}
              onChange={(e) => setSettings((s) => ({ ...s, minConfidence: parseInt(e.target.value || "60") }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", fontSize: 14 }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>⚡ Max trades/minuto</label>
            <input
              type="number"
              value={settings.maxTradesPerMinute}
              onChange={(e) => setSettings((s) => ({ ...s, maxTradesPerMinute: parseInt(e.target.value || "6") }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", fontSize: 14 }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>✅ Stop Win diário ($)</label>
            <input
              type="number"
              value={settings.stopWinDaily}
              onChange={(e) => setSettings((s) => ({ ...s, stopWinDaily: parseFloat(e.target.value || "0") }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", fontSize: 14 }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>🛑 Stop Loss diário ($)</label>
            <input
              type="number"
              value={settings.stopLossDaily}
              onChange={(e) => setSettings((s) => ({ ...s, stopLossDaily: parseFloat(e.target.value || "0") }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", fontSize: 14 }}
            />
          </div>

          <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #334155" }} />
          
          <h4 style={{ color: "#60a5fa", marginBottom: 12 }}>🔗 Configurações Deriv</h4>
          
          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>🔑 Token Deriv</label>
            <input
              type="password"
              value={settings.derivToken || ''}
              onChange={(e) => setSettings((s) => ({ ...s, derivToken: e.target.value }))}
              placeholder="Cole seu token da Deriv aqui"
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", fontSize: 14 }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>🏦 Tipo de Conta</label>
            <select
              value={settings.accountType || 'demo'}
              onChange={(e) => setSettings((s) => ({ ...s, accountType: e.target.value as 'demo' | 'real' }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", fontSize: 14 }}
            >
              <option value="demo">Demo</option>
              <option value="real">Real</option>
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 13, marginBottom: 6 }}>📈 Símbolo</label>
            <select
              value={settings.selectedSymbol || 'R_10'}
              onChange={(e) => setSettings((s) => ({ ...s, selectedSymbol: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #475569", background: "#0f172a", color: "#e2e8f0", fontSize: 14 }}
            >
              <option value="R_10">Rise/Fall 10</option>
              <option value="R_25">Rise/Fall 25</option>
              <option value="R_50">Rise/Fall 50</option>
              <option value="R_75">Rise/Fall 75</option>
              <option value="R_100">Rise/Fall 100</option>
              <option value="RDBULL">Bull/Bear</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  connectDeriv();
                } else {
                  setIsBotRunning(true);
                }
              }}
              disabled={!settings.derivToken}
              style={{ 
                flex: 1, 
                padding: "10px 16px", 
                borderRadius: 8, 
                border: "none", 
                background: !settings.derivToken ? "#64748b" : isAuthenticated ? "#10b981" : "#3b82f6", 
                color: "#fff", 
                fontWeight: 600, 
                cursor: !settings.derivToken ? "not-allowed" : "pointer", 
                fontSize: 14, 
                transition: "all 0.2s",
                opacity: !settings.derivToken ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (settings.derivToken) {
                  e.currentTarget.style.background = isAuthenticated ? "#059669" : "#2563eb";
                }
              }}
              onMouseOut={(e) => {
                if (settings.derivToken) {
                  e.currentTarget.style.background = isAuthenticated ? "#10b981" : "#3b82f6";
                }
              }}
            >
              {!settings.derivToken ? "🔑 Configure Token" : !isAuthenticated ? "🔗 Conectar Deriv" : "▶️ Iniciar Bot"}
            </button>
            <button
              onClick={() => {
                setIsBotRunning(false);
              }}
              style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14, transition: "all 0.2s" }}
              onMouseOver={(e) => e.currentTarget.style.background = "#dc2626"}
              onMouseOut={(e) => e.currentTarget.style.background = "#ef4444"}
            >
              ⏸️ Parar Bot
            </button>
            <button
              onClick={() => {
                // reset daily
                setDailyPnL(0);
                setDailyStopped({});
                setTradeHistory([]);
                setTradesTimestamps([]);
              }}
              style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid #475569", background: "#334155", color: "#e2e8f0", fontWeight: 600, cursor: "pointer", fontSize: 14, transition: "all 0.2s" }}
              onMouseOver={(e) => e.currentTarget.style.background = "#475569"}
              onMouseOut={(e) => e.currentTarget.style.background = "#334155"}
            >
              🔄 Reset Diário
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 300, padding: 16, borderRadius: 12, background: "#1e293b", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", border: "1px solid #334155" }}>
          <h3 style={{ color: "#60a5fa", marginBottom: 16 }}>📊 Status e Informações</h3>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ marginBottom: 8, padding: "8px 12px", background: "#0f172a", borderRadius: 6, border: "1px solid #334155" }}>
                <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>💵 Saldo</div>
                <div style={{ color: "#10b981", fontSize: 20, fontWeight: 600 }}>${accountBalance.toFixed(2)}</div>
              </div>
              <div style={{ marginBottom: 8, padding: "8px 12px", background: "#0f172a", borderRadius: 6, border: "1px solid #334155" }}>
                <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>📈 PnL diário</div>
                <div style={{ color: dailyPnL >= 0 ? "#10b981" : "#ef4444", fontSize: 20, fontWeight: 600 }}>${dailyPnL.toFixed(2)}</div>
              </div>
              <div style={{ padding: "8px 12px", background: "#0f172a", borderRadius: 6, border: "1px solid #334155" }}>
                <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>⚡ Trades/min</div>
                <div style={{ color: "#60a5fa", fontSize: 20, fontWeight: 600 }}>{countRecentTrades()}</div>
              </div>
              <div style={{ padding: "8px 12px", background: "#0f172a", borderRadius: 6, border: "1px solid #334155" }}>
                <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>💰 Preço Atual</div>
                <div style={{ color: "#10b981", fontSize: 20, fontWeight: 600 }}>
                  {currentPrice > 0 ? currentPrice.toFixed(2) : "---"}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ marginBottom: 8, padding: "8px 12px", background: "#0f172a", borderRadius: 6, border: "1px solid #334155" }}>
                <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>🤖 Status</div>
                <div style={{ color: isBotRunning ? "#10b981" : "#ef4444", fontSize: 16, fontWeight: 600 }}>
                  {isBotRunning ? "🟢 Rodando" : "🔴 Parado"}
                </div>
              </div>
              <div style={{ marginBottom: 8, padding: "8px 12px", background: "#0f172a", borderRadius: 6, border: "1px solid #334155" }}>
                <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>⚙️ Modo</div>
                <div style={{ color: "#60a5fa", fontSize: 16, fontWeight: 600 }}>
                  {scalpMode ? "⚡ Scalp" : "📊 Normal"}
                </div>
              </div>
              <div style={{ padding: "8px 12px", background: "#0f172a", borderRadius: 6, border: "1px solid #334155" }}>
                <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>🔗 Conexão Deriv</div>
                <div style={{ 
                  color: connectionStatus === 'authenticated' ? "#10b981" : 
                         connectionStatus === 'connected' ? "#f59e0b" : 
                         connectionStatus === 'connecting' ? "#3b82f6" : "#ef4444", 
                  fontSize: 14, 
                  fontWeight: 600 
                }}>
                  {connectionStatus === 'authenticated' ? "✅ Conectado & Autenticado" :
                   connectionStatus === 'connected' ? "🔗 Conectado" :
                   connectionStatus === 'connecting' ? "⏳ Conectando..." : "❌ Desconectado"}
                </div>
                {dailyStopped.stopWin && <div style={{ color: "#10b981", fontSize: 14, fontWeight: 600, marginTop: 8 }}>✅ Stop Win atingido</div>}
                {dailyStopped.stopLoss && <div style={{ color: "#ef4444", fontSize: 14, fontWeight: 600, marginTop: 8 }}>🛑 Stop Loss atingido</div>}
                {!dailyStopped.stopWin && !dailyStopped.stopLoss && connectionStatus === 'authenticated' && <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 8 }}>✓ Pronto para operar</div>}
              </div>
            </div>
          </div>

          <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #334155" }} />

          <div>
            <h4 style={{ color: "#60a5fa", marginBottom: 12 }}>📜 Histórico (recente)</h4>
            <div style={{ maxHeight: 300, overflow: "auto", background: "#0f172a", borderRadius: 8, border: "1px solid #334155" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#1e293b", borderBottom: "2px solid #334155" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px", color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>ID</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Ativo</th>
                    <th style={{ textAlign: "center", padding: "10px 12px", color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Dir</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Stake</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Profit</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Entrada</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#64748b" }}>
                        Nenhum trade registrado ainda
                      </td>
                    </tr>
                  ) : (
                    tradeHistory.map((t, idx) => (
                      <tr key={t.id} style={{ borderBottom: "1px solid #334155", background: idx % 2 === 0 ? "#0f172a" : "#1e293b" }}>
                        <td style={{ padding: "10px 12px", color: "#cbd5e1", fontSize: 13 }}>{t.id.slice(-8)}</td>
                        <td style={{ padding: "10px 12px", color: "#cbd5e1", fontSize: 13 }}>{t.symbol}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: t.direction === "CALL" ? "#10b981" : "#ef4444", fontSize: 13, fontWeight: 600 }}>
                          {t.direction === "CALL" ? "📈" : "📉"} {t.direction}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "#cbd5e1", fontSize: 13 }}>${t.stake.toFixed(2)}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: t.profit >= 0 ? "#10b981" : "#ef4444", fontSize: 13, fontWeight: 600 }}>
                          {t.profit >= 0 ? `+$${t.profit.toFixed(2)}` : `-$${Math.abs(t.profit).toFixed(2)}`}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "#94a3b8", fontSize: 12 }}>{new Date(t.entryTime).toLocaleTimeString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: "#1e293b", border: "1px solid #334155" }}>
        <h4 style={{ color: "#f59e0b", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          ⚠️ Observações Importantes
        </h4>
        <ul style={{ color: "#cbd5e1", lineHeight: 1.8, paddingLeft: 20 }}>
          <li style={{ marginBottom: 8 }}>Este componente é um ponto de partida — adapte a integração com a API do broker, autorização e dados de saldo.</li>
          <li style={{ marginBottom: 8 }}>Teste em <em style={{ color: "#60a5fa" }}>paper mode</em> (settings.paperMode = true) antes de operar em real.</li>
          <li>Revise logs e salve histórico de trades no backend para auditoria.</li>
        </ul>
      </div>
    </div>
  );
}
