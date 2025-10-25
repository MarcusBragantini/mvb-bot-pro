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
    paperMode: true,
  });

  const [accountBalance, setAccountBalance] = useState<number>(1000); // fallback - integrar com API
  const [dailyPnL, setDailyPnL] = useState<number>(0);
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
  const [tradesTimestamps, setTradesTimestamps] = useState<number[]>([]);
  const [dailyStopped, setDailyStopped] = useState<{ stopWin?: boolean; stopLoss?: boolean }>({});
  const [isConnecting, setIsConnecting] = useState(false);

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

  // === WebSocket / Proposals handling (safe listener) ===

  const connectDeriv = (wsUrl: string) => {
    if (derivWSRef.current) derivWSRef.current.close();
    setIsConnecting(true);
    const ws = new WebSocket(wsUrl);
    derivWSRef.current = ws;

    ws.addEventListener("open", () => {
      setIsConnecting(false);
      console.info("WebSocket conectado");
      // aqui você pode autorizar, pedir balance, etc.
      // example: ws.send(JSON.stringify({ authorize: "TOKEN" }));
    });

    ws.addEventListener("close", (ev) => {
      console.warn("WebSocket fechado", ev);
      derivWSRef.current = null;
    });

    ws.addEventListener("error", (err) => {
      console.error("WebSocket erro", err);
    });

    // não adicionamos um listener global de message aqui — handlers temporários serão criados quando precisar
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

  // === Core: executar trade baseado numa "análise" simples (placeholder) ===
  // analysis: { symbol, direction, confidence }
  const executeTrade = async (analysis: { symbol: string; direction: "CALL" | "PUT"; confidence: number }) => {
    if (!isBotRunning) return console.info("Bot não está rodando");

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

    // montar requisição de proposta (exemplo genérico — adapte ao formato de sua API/deriv)
    const ws = derivWSRef.current;
    if (!ws) return console.warn("WebSocket não conectado");

    // exemplo: pedir uma proposta para o ativo e duração
    const proposalRequest = {
      proposal: 1,
      subscribe: 1,
      symbol: analysis.symbol,
      contract_type: analysis.direction === "CALL" ? "CALL" : "PUT",
      duration: settings.durationSec ?? 60,
      // outras propriedades necessárias pela API do seu broker
    } as any;

    try {
      ws.send(JSON.stringify(proposalRequest));
      // adicionar listener que fará buy quando proposal chegar
      const cleanupListener = addProposalListener(adjustedStake, (trade) => {
        console.info("Trade finalizado:", trade);
        // persistir no backend
        if (!settings.paperMode) saveTradeToBackend(trade).catch(console.error);
      });

      // remover listener automaticamente após timeout retornado
      // (addProposalListener já retorna cleanup), se retornou, use
      if (typeof cleanupListener === "function") {
        setTimeout(() => cleanupListener(), (settings.durationSec ?? 60) * 1000 + 20_000);
      }
    } catch (err) {
      console.error("Erro ao solicitar proposal:", err);
    }
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

  // === Simples "analyze" generator para demo/teste (substitua pela sua lógica real) ===
  const fakeAnalyzeAndMaybeExecute = () => {
    // apenas um exemplo: entra aleatoriamente baseado em scalpMode
    const rand = Math.random() * 100;
    const symbol = "R_100"; // adapte para seus símbolos
    const direction: "CALL" | "PUT" = rand > 50 ? "CALL" : "PUT";
    const confidence = 55 + Math.random() * 45; // 55-100
    executeTrade({ symbol, direction, confidence });
  };

  // === Start/Stop bot ===
  useEffect(() => {
    let interval: number | undefined;
    if (isBotRunning) {
      // exemplo: analisar a cada X segundos — em scalping interval menor
      const intervalSec = scalpMode ? 5 : 10;
      interval = window.setInterval(() => {
        fakeAnalyzeAndMaybeExecute();
      }, intervalSec * 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isBotRunning, scalpMode, settings]);

  // === UI / controles simples ===
  return (
    <div style={{ padding: 18, fontFamily: "Inter, Roboto, sans-serif" }}>
      <h2>Bot Interface — Scalper (Risk Managed)</h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ minWidth: 260, padding: 12, borderRadius: 8, background: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Scalp Mode</span>
            <input type="checkbox" checked={scalpMode} onChange={(e) => setScalpMode(e.target.checked)} />
          </label>

          <div style={{ marginTop: 8 }}>
            <label>Stake base (USD)</label>
            <input
              type="number"
              value={settings.stake}
              step={0.1}
              onChange={(e) => setSettings((s) => ({ ...s, stake: parseFloat(e.target.value || "0") }))}
              style={{ width: "100%", marginTop: 6 }}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <label>Risco por trade (% do capital)</label>
            <input
              type="number"
              value={settings.maxRiskPerTradePercent}
              step={0.1}
              onChange={(e) => setSettings((s) => ({ ...s, maxRiskPerTradePercent: parseFloat(e.target.value || "0") }))}
              style={{ width: "100%", marginTop: 6 }}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <label>Duração (segundos)</label>
            <input
              type="number"
              value={settings.durationSec}
              onChange={(e) => setSettings((s) => ({ ...s, durationSec: parseInt(e.target.value || "60") }))}
              style={{ width: "100%", marginTop: 6 }}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <label>Confiança mínima (%)</label>
            <input
              type="number"
              value={settings.minConfidence}
              onChange={(e) => setSettings((s) => ({ ...s, minConfidence: parseInt(e.target.value || "60") }))}
              style={{ width: "100%", marginTop: 6 }}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <label>Max trades/minuto</label>
            <input
              type="number"
              value={settings.maxTradesPerMinute}
              onChange={(e) => setSettings((s) => ({ ...s, maxTradesPerMinute: parseInt(e.target.value || "6") }))}
              style={{ width: "100%", marginTop: 6 }}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <label>Stop Win diário ($)</label>
            <input
              type="number"
              value={settings.stopWinDaily}
              onChange={(e) => setSettings((s) => ({ ...s, stopWinDaily: parseFloat(e.target.value || "0") }))}
              style={{ width: "100%", marginTop: 6 }}
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <label>Stop Loss diário ($)</label>
            <input
              type="number"
              value={settings.stopLossDaily}
              onChange={(e) => setSettings((s) => ({ ...s, stopLossDaily: parseFloat(e.target.value || "0") }))}
              style={{ width: "100%", marginTop: 6 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={() => {
                if (!derivWSRef.current) connectDeriv("wss://your-deriv-ws-url");
                setIsBotRunning(true);
              }}
            >
              Iniciar Bot
            </button>
            <button
              onClick={() => {
                setIsBotRunning(false);
              }}
            >
              Parar Bot
            </button>
            <button
              onClick={() => {
                // reset daily
                setDailyPnL(0);
                setDailyStopped({});
                setTradeHistory([]);
                setTradesTimestamps([]);
              }}
            >
              Reset Diário
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: 12, borderRadius: 8, background: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div>Saldo: ${accountBalance.toFixed(2)}</div>
              <div>PnL diário: ${dailyPnL.toFixed(2)}</div>
              <div>Trades/min: {countRecentTrades()}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div>Status: {isBotRunning ? "Rodando" : "Parado"}</div>
              <div>Modo: {scalpMode ? "Scalp" : "Normal"}</div>
              <div>
                {dailyStopped.stopWin && <span style={{ color: "green" }}>Stop Win atingido</span>}
                {dailyStopped.stopLoss && <span style={{ color: "red" }}>Stop Loss atingido</span>}
              </div>
            </div>
          </div>

          <hr style={{ margin: "12px 0" }} />

          <div>
            <h4>Histórico (recente)</h4>
            <div style={{ maxHeight: 300, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>ID</th>
                    <th>Ativo</th>
                    <th>Dir</th>
                    <th>Stake</th>
                    <th>Profit</th>
                    <th>Entrada</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.map((t) => (
                    <tr key={t.id}>
                      <td style={{ padding: 6 }}>{t.id.slice(-8)}</td>
                      <td style={{ padding: 6 }}>{t.symbol}</td>
                      <td style={{ padding: 6 }}>{t.direction}</td>
                      <td style={{ padding: 6 }}>${t.stake.toFixed(2)}</td>
                      <td style={{ padding: 6 }}>{t.profit >= 0 ? `+${t.profit.toFixed(2)}` : t.profit.toFixed(2)}</td>
                      <td style={{ padding: 6 }}>{new Date(t.entryTime).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Observações importantes:</strong>
        <ul>
          <li>Este componente é um ponto de partida — adapte a integração com a API do broker, autorização e dados de saldo.</li>
          <li>Teste em <em>paper mode</em> (settings.paperMode = true) antes de operar em real.</li>
          <li>Revise logs e salve histórico de trades no backend para auditoria.</li>
        </ul>
      </div>
    </div>
  );
}
