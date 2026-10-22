import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, FileText, Activity, Trash2, Award, Plus, Sparkles, RefreshCw, 
  Upload, Cpu, BarChart2, DollarSign, ShieldAlert, Zap, Clock, CheckCircle2
} from 'lucide-react';

const PAIR_OPTIONS = [
  'EUR/USD', 'USD/CHF', 'NZD/USD', 'XAU/USD', 'USD/JPY',
  'EUR/GBP', 'GBP/USD', 'USD/CAD', 'EUR/CHF', 'EUR/JPY', 'AUD/USD', 'CUSTOM'
];

export default function App() {
  const [activeTab, setActiveTab] = useState('calculator'); // 'calculator', 'journal', 'analytics'
  const [trades, setTrades] = useState(() => {
    const saved = localStorage.getItem('scalp_journal_trades');
    return saved ? JSON.parse(saved) : [];
  });

  // FORM & TRADE STAGING STATE
  const [pair, setPair] = useState('EUR/USD');
  const [customPair, setCustomPair] = useState('');
  const [tradeType, setTradeType] = useState('LONG');
  const [tradeStatus, setTradeStatus] = useState('ACTIVE'); // 'PENDING', 'ACTIVE', 'CLOSED'
  const [session, setSession] = useState('London Session');
  const [accountSize] = useState('10900');
  const [riskAmount, setRiskAmount] = useState('109');
  const [tradeResult, setTradeResult] = useState('WIN');
  const [pnlAmount, setPnlAmount] = useState('');
  const [notes, setNotes] = useState('');

  // 01: BIAS & TRENDS
  const [htfTrend, setHtfTrend] = useState(false);
  const [mtfTrend, setMtfTrend] = useState(false);
  const [ltfTrend, setLtfTrend] = useState(false);

  // 02: KEY ZONES & IMBALANCE
  const [zoneType, setZoneType] = useState('none'); 
  const [hasImbalance, setHasImbalance] = useState(false);

  // 03: LIQUIDITY SWEEPS
  const [liquidityType, setLiquidityType] = useState('none'); // 'none', 'push', 'pull', 'both'
  const [vShapeLiq, setVShapeLiq] = useState(false);

  // 04: MARKET SHIFT, TRAPS & MODELS
  const [shiftType, setShiftType] = useState('none'); // 'none', 'ms', 'fractal'
  const [trapsCount, setTrapsCount] = useState(0);
  const [selectedModel, setSelectedModel] = useState('none');

  // SCREENSHOTS STATE
  const [images, setImages] = useState({
    htf: null,
    mtf: null,
    ltf: null,
    entry: null,
    model: null
  });

  // AI Vision Analysis State
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);

  useEffect(() => {
    localStorage.setItem('scalp_journal_trades', JSON.stringify(trades));
  }, [trades]);

  // Recalculate Account Balance starting from $10,900
  const currentAccountBalance = useMemo(() => {
    const closedPnL = trades
      .filter(t => t.status === 'CLOSED')
      .reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
    return (parseFloat(accountSize) || 10900) + closedPnL;
  }, [trades, accountSize]);

  // CONFLUENCE SCORE CALCULATION (FULL SMC/ICT WEIGHTS)
  const calculatedScore = useMemo(() => {
    let score = 0;
    if (htfTrend) score += 10;
    if (mtfTrend) score += 10;
    if (ltfTrend) score += 5;
    if (zoneType === 'standard') score += 10;
    if (zoneType === 'extreme') score += 20;
    if (hasImbalance) score += 25;
    if (liquidityType === 'push') score += 10;
    if (liquidityType === 'pull') score += 5;
    if (liquidityType === 'both') score += 15;
    if (vShapeLiq) score += 10;
    if (shiftType === 'ms') score += 10;
    if (shiftType === 'fractal') score += 5;
    score += (trapsCount * 5);
    if (selectedModel !== 'none') score += 15;
    return Math.min(score, 100);
  }, [htfTrend, mtfTrend, ltfTrend, zoneType, hasImbalance, liquidityType, vShapeLiq, shiftType, trapsCount, selectedModel]);

  const handleImageUpload = (key, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImages(prev => ({ ...prev, [key]: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  // GEMINI VISION & PRE-TRADE ANALYSIS
  const runAiAnalysis = async () => {
    setAiAnalyzing(true);
    setAiFeedback(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('NO_KEY');

      const activeImageParts = [];
      ['htf', 'mtf', 'ltf', 'entry', 'model'].forEach((key) => {
        if (images[key] && images[key].startsWith('data:image')) {
          const base64Data = images[key].split(',')[1];
          const mimeType = images[key].split(';')[0].split(':')[1];
          activeImageParts.push({ inlineData: { mimeType, data: base64Data } });
        }
      });

      const promptText = `אתה אנליסט מומחה למסחר לפי שיטת 1% Percent Club (Brad) ו-SMC/ICT.
ניתוח לפני כניסה לעסקה (Pre-Trade Staging):
- צמד: ${pair === 'CUSTOM' ? customPair : pair} | כיוון: ${tradeType} \vert{} סשן: ${session}
- ציון Confluence: ${calculatedScore}%
- מגמות: HTF שעתי=${htfTrend}, MTF 15m=${mtfTrend}, LTF 1m=${ltfTrend}
- אזור: ${zoneType}, Imbalance (FVG):${hasImbalance}
- נזילות: ${liquidityType}, V-Shape:${vShapeLiq}
- שיפט: ${shiftType}, מלכודות: ${trapsCount}, מודל כניסה: ${selectedModel}
- יתרת חשבון: $${currentAccountBalance}, סיכון 1\%: $${riskAmount}

ספק ייעוץ קצר וממוקד בעברית:
1. האם מודל הכניסה והגרפים עקביים?
2. האם העסקה עומדת בחוק של 1% סיכון ויעד מינימום 3R?
3. המלצה סופית אם להיכנס או להמתין.`;

      const parts = [{ text: promptText }, ...activeImageParts];
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;  const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }] }) });  const result = await response.json(); const answer = result?.candidates?.[0]?.content?.parts?.[0]?.text;  if (answer) { setAiFeedback({ summary: answer, confidence: calculatedScore >= 75 ? 'גבוהה (Vision Verified)' : 'בינונית' }); } else { throw new Error('API Error'); } } catch (err) { setAiFeedback({ summary: `ניתוח תכנון (מקומי): Setup בציון ${calculatedScore}%.
• סנכרון מגמות: ${htfTrend && mtfTrend ? 'תקין' : 'חלקי'}.
• שתיית נזילות: ${liquidityType !== 'none' ? 'מזוהה' : 'טרם סומנה'}. • לפי כללי 1\% Percent Club, וודא יעד של לפחות 3R ($${(parseFloat(riskAmount) * 3).toFixed(0)} רווח).`, confidence: 'סטנדרטי' }); } finally { setAiAnalyzing(false); } };  const handleSaveTrade = () => { const finalPair = pair === 'CUSTOM' ? customPair.toUpperCase() : pair; if (!finalPair) return alert('נא להזין צמד מטבעות');  const risk = parseFloat(riskAmount) \vert{}\vert{} (currentAccountBalance * 0.01); let pnl = 0; let rMult = '0.0';  if (tradeStatus === 'CLOSED') { pnl = parseFloat(pnlAmount) \vert{}\vert{} (tradeResult === 'WIN' ? risk * 3 : tradeResult === 'LOSS' ? -risk : 0); rMult = (pnl / risk).toFixed(1); }  const newTrade = { id: `tr-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      pair: finalPair,
      type: tradeType,
      session,
      status: tradeStatus,
      riskAmount: risk.toString(),
      result: tradeStatus === 'CLOSED' ? tradeResult : 'PENDING',
      pnl: pnl.toString(),
      rMultiple: rMult,
      score: calculatedScore,
      model: selectedModel,
      notes,
      screenshots: { ...images }
    };

    setTrades([newTrade, ...trades]);
    alert('העסקה נשמרה ביומן בהצלחה!');
    setNotes('');
    setPnlAmount('');
    setImages({ htf: null, mtf: null, ltf: null, entry: null, model: null });
  };

  const handleDeleteTrade = (id) => {
    if (confirm('האם למחוק עסקה זו מהיומן?')) {
      setTrades(trades.filter(t => t.id !== id));
    }
  };

  // ANALYTICS COMPUTATION
  const analytics = useMemo(() => {
    const closed = trades.filter(t => t.status === 'CLOSED');
    const total = closed.length;
    if (total === 0) return { total: 0, winRate: 0, totalPnl: 0, avgR: 0, modelStats: {} };

    const wins = closed.filter(t => t.result === 'WIN').length;
    const winRate = ((wins / total) * 100).toFixed(1);
    const totalPnl = closed.reduce((acc, t) => acc + (parseFloat(t.pnl) || 0), 0);
    const totalR = closed.reduce((acc, t) => acc + (parseFloat(t.rMultiple) || 0), 0);

    const modelStats = {};
    closed.forEach(t => {
      const m = t.model || 'ללא מודל';
      if (!modelStats[m]) modelStats[m] = { total: 0, wins: 0, pnl: 0 };
      modelStats[m].total += 1;
      if (t.result === 'WIN') modelStats[m].wins += 1;
      modelStats[m].pnl += (parseFloat(t.pnl) || 0);
    });

    return { total, wins, winRate, totalPnl, avgR: (totalR / total).toFixed(1), modelStats };
  }, [trades]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#0a0d14] text-slate-100 font-sans p-4 lg:p-8 pb-12">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4 mb-8 bg-[#121724] p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-[#0a0d14] rounded-[10px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">ScalpConfluence AI & Cloud Journal</h1>
            <p className="text-xs text-slate-400">1% Percent Club Strategy (Brad) • Min 3R Target</p>
          </div>
        </div>

        {/* ACCOUNT BALANCE DISPLAY */}
        <div className="flex gap-4 items-center bg-[#182032] px-4 py-2 rounded-xl border border-slate-700">
          <div>
            <span className="text-[10px] text-slate-400 block">יתרת חשבון (התחלה $10,900)</span>
            <span className="text-lg font-bold font-mono text-emerald-400">${currentAccountBalance.toLocaleString()}</span>
          </div>
          <div className="border-r border-slate-700 pr-4">
            <span className="text-[10px] text-slate-400 block">סיכון מומלץ (1%)</span>
            <span className="text-lg font-bold font-mono text-cyan-400">${(currentAccountBalance * 0.01).toFixed(0)}</span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex gap-1 bg-[#0a0d14] p-1 rounded-xl border border-slate-800 text-xs">
          <button onClick={() => setActiveTab('calculator')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'calculator' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400'}`}>
            <Target className="w-4 h-4" />
            <span>מחשבון & תכנון</span>
          </button>
          <button onClick={() => setActiveTab('journal')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'journal' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400'}`}>
            <FileText className="w-4 h-4" />
            <span>יומן ({trades.length})</span>
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'analytics' ? 'bg-cyan-500 text-slate-9
