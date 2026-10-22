import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Target, FileText, Activity, Trash2, Award, Plus, Sparkles, RefreshCw, 
  Upload, Cpu, BarChart2, DollarSign, Layers, ShieldAlert, Zap, Clock
} from 'lucide-react';

const PAIR_OPTIONS = [
  'EUR/USD', 'USD/CHF', 'NZD/USD', 'XAU/USD', 'USD/JPY',
  'EUR/GBP', 'GBP/USD', 'USD/CAD', 'EUR/CHF', 'EUR/JPY', 'AUD/USD', 'CUSTOM'
];

function App() {
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
  const [session, setSession] = useState('London');
  const [accountSize] = useState('10900');
  const [riskAmount, setRiskAmount] = useState('109');
  const [tradeResult, setTradeResult] = useState('WIN');
  const [pnlAmount, setPnlAmount] = useState('');
  const [notes, setNotes] = useState('');

  // CONFLUENCE STATE
  const [htfTrend, setHtfTrend] = useState(false);
  const [mtfTrend, setMtfTrend] = useState(false);
  const [ltfTrend, setLtfTrend] = useState(false);
  const [zoneType, setZoneType] = useState('none'); 
  const [hasImbalance, setHasImbalance] = useState(false);
  const [liquidityType, setLiquidityType] = useState('none');
  const [vShapeLiq, setVShapeLiq] = useState(false);
  const [shiftType, setShiftType] = useState('none');
  const [trapsCount, setTrapsCount] = useState(0);
  const [selectedModel, setSelectedModel] = useState('none');

  // SCREENSHOTS STATE (INCLUDES MODEL SCREENSHOT)
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

  // CONFLUENCE SCORE CALCULATION
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
- צמד: ${pair === 'CUSTOM' ? customPair : pair} | כיוון: ${tradeType} | סשן: ${session}
- ציון Confluence: ${calculatedScore}%
- מגמות: HTF שעתי=${htfTrend}, MTF 15m=${mtfTrend}, LTF 1m=${ltfTrend}
- סוג אזור: ${zoneType}, Imbalance (FVG): ${hasImbalance}
- נזילות: ${liquidityType}, V-Shape: ${vShapeLiq}
- שיפט: ${shiftType}, מלכודות: ${trapsCount}, מודל כניסה: ${selectedModel}
- גודל חשבון נוכחי: $${currentAccountBalance}, סיכון 1%: $${riskAmount}

אנא עיין בתמונות (כולל תמונת המודל והכניסה אם צורפו) וספק ייעוץ ממוקד לפני ביצוע העסקה:
1. האם מודל הכניסה המצולם תואם את המבנה והסשן (${session})?
2. האם העסקה עומדת בחוק של 1% סיכון ויעד מינימום 3R?
3. המלצה סופית האם להיכנס או להמתין לאישור נוסף.`;

      const parts = [{ text: promptText }, ...activeImageParts];
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] })
      });

      const result = await response.json();
      const answer = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (answer) {
        setAiFeedback({ summary: answer, confidence: calculatedScore >= 75 ? 'גבוהה (Vision Verified)' : 'בינונית' });
      } else {
        throw new Error('API Error');
      }
    } catch (err) {
      setAiFeedback({
        summary: `ניתוח תכנון (הערכה ללא API Key): Setup בציון ${calculatedScore}%.
• סנכרון מגמות: ${htfTrend && mtfTrend ? 'תקין' : 'חלקי'}.
• וודא שתמונת מודל הכניסה הדגימה שבירת מבנה ברורה ושתיית נזילות.
• לפי כללי 1% Percent Club, וודא יעד של לפחות 3R ($${(parseFloat(riskAmount) * 3).toFixed(0)} רווח).`,
        confidence: 'סטנדרטי'
      });
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleSaveTrade = () => {
    const finalPair = pair === 'CUSTOM' ? customPair.toUpperCase() : pair;
    if (!finalPair) return alert('נא להזין צמד מטבעות');

    const risk = parseFloat(riskAmount) || (currentAccountBalance * 0.01);
    let pnl = 0;
    let rMult = '0.0';

    if (tradeStatus === 'CLOSED') {
      pnl = parseFloat(pnlAmount) || (tradeResult === 'WIN' ? risk * 3 : tradeResult === 'LOSS' ? -risk : 0);
      rMult = (pnl / risk).toFixed(1);
    }

    const newTrade = {
      id: `tr-${Date.now()}`,
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
          <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${activeTab === 'analytics' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400'}`}>
            <BarChart2 className="w-4 h-4" />
            <span>אנליטיקה</span>
          </button>
        </div>
      </header>

      {/* TAB 1: CALCULATOR & STAGING */}
      {activeTab === 'calculator' && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CONFLUENCE FORM (8 COLS) */}
          <div className="lg:col-span-8 space-y-6">
            {/* 01: TRENDS & SCREENSHOTS */}
            <div className="bg-[#121724] p-5 rounded-2xl border border-slate-800 space-y-4">
              <h2 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-3 flex justify-between">
                <span>01. סנכרון מגמות + צילומי מסך</span>
                <span className="text-xs text-cyan-400 font-mono">משקל: 25%</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* HTF */}
                <div className={`p-3 rounded-xl border space-y-2 ${htfTrend ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-[#182032] border-slate-800'}`}>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input type="checkbox" checked={htfTrend} onChange={(e) => setHtfTrend(e.target.checked)} className="accent-cyan-500" />
                    <span>HTF שעתי (1H) +10%</span>
                  </label>
                  <div className="relative aspect-video bg-[#0d1117] rounded-lg border border-dashed border-slate-700 flex items-center justify-center">
                    {images.htf ? <img src={images.htf} className="w-full h-full object-cover rounded-lg" /> : <Upload className="w-4 h-4 text-slate-500" />}
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload('htf', e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>

                {/* MTF */}
                <div className={`p-3 rounded-xl border space-y-2 ${mtfTrend ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-[#182032] border-slate-800'}`}>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input type="checkbox" checked={mtfTrend} onChange={(e) => setMtfTrend(e.target.checked)} className="accent-cyan-500" />
                    <span>MTF 15 דקות +10%</span>
                  </label>
                  <div className="relative aspect-video bg-[#0d1117] rounded-lg border border-dashed border-slate-700 flex items-center justify-center">
                    {images.mtf ? <img src={images.mtf} className="w-full h-full object-cover rounded-lg" /> : <Upload className="w-4 h-4 text-slate-500" />}
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload('mtf', e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>

                {/* LTF */}
                <div className={`p-3 rounded-xl border space-y-2 ${ltfTrend ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-[#182032] border-slate-800'}`}>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input type="checkbox" checked={ltfTrend} onChange={(e) => setLtfTrend(e.target.checked)} className="accent-cyan-500" />
                    <span>LTF 1 דקה +5%</span>
                  </label>
                  <div className="relative aspect-video bg-[#0d1117] rounded-lg border border-dashed border-slate-700 flex items-center justify-center">
                    {images.ltf ? <img src={images.ltf} className="w-full h-full object-cover rounded-lg" /> : <Upload className="w-4 h-4 text-slate-500" />}
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload('ltf', e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>

            {/* 02: KEY ZONES & IMBALANCE */}
            <div className="bg-[#121724] p-5 rounded-2xl border border-slate-800 space-y-4">
              <h2 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-3 flex justify-between">
                <span>02. אזורי מפתח ואימבאלנס (FVG)</span>
                <span className="text-xs text-emerald-400 font-mono">משקל: 45%</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-2">סוג האזור:</label>
                  <div className="space-y-1.5">
                    <button onClick={() => setZoneType('none')} className={`w-full p-2.5 rounded-xl border text-right ${zoneType === 'none' ? 'bg-slate-800 border-slate-600' : 'bg-[#182032] border-slate-800'}`}>ללא אזור מיועד (0%)</button>
                    <button onClick={() => setZoneType('standard')} className={`w-full p-2.5 rounded-xl border text-right ${zoneType === 'standard' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-[#182032] border-slate-800'}`}>Demand / Supply Zone (+10%)</button>
                    <button onClick={() => setZoneType('extreme')} className={`w-full p-2.5 rounded-xl border text-right ${zoneType === 'extreme' ? 'bg-emerald-500/30 border-emerald-400 font-bold' : 'bg-[#182032] border-slate-800'}`}>Extreme Zone בקצה המבנה (+20%)</button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-400 block mb-1">FVG / Imbalance:</label>
                  <label onClick={() => setHasImbalance(!hasImbalance)} className={`cursor-pointer p-4 rounded-xl border flex items-center gap-3 transition-all ${hasImbalance ? 'bg-emerald-500/20 border-emerald-500' : 'bg-[#182032] border-slate-800'}`}>
                    <input type="checkbox" checked={hasImbalance} onChange={() => {}} className="accent-emerald-500" />
                    <div>
                      <span className="font-bold block">Imbalance / FVG קיים</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">+25% משקל הסתברות</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* 03: MODEL SCREENSHOT & SELECTION */}
            <div className="bg-[#121724] p-5 rounded-2xl border border-slate-800 space-y-4">
              <h2 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-3 flex justify-between">
                <span>03. מודל כניסה ייעודי + צילום הגרף של המודל</span>
                <span className="text-xs text-purple-400 font-mono">משקל: 15%</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-2">מודלי כניסה (Brad / SMC):</label>
                  <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="w-full bg-[#182032] border border-slate-700 rounded-xl p-2.5 text-xs text-purple-200 font-semibold">
                    <option value="none">ללא מודל ספציפי (0%)</option>
                    <option value="model3">מודל 3 - Fake Market Shift (+15%)</option>
                    <option value="model4">מודל 4 - Equal Highs / Lows (+15%)</option>
                    <option value="model5">מודל 5 - Fake Flip (+15%)</option>
                  </select>

                  <div className="mt-3">
                    <label className="text-slate-400 block mb-1">מלכודות MS (+5% לכל מלכודת):</label>
                    <div className="grid grid-cols-4 gap-1 bg-[#182032] p-1 rounded-xl border border-slate-700 text-center">
                      {[0, 1, 2, 3].map((num) => (
                        <button key={num} onClick={() => setTrapsCount(num)} className={`py-1.5 rounded-lg font-bold ${trapsCount === num ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>
                          {num === 0 ? 'ללא' : `${num}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* MODEL SCREENSHOT UPLOAD */}
                <div>
                  <label className="text-slate-400 block mb-1">צילום גרף מודל הכניסה (Model Chart):</label>
                  <div className="relative aspect-video bg-[#0d1117] rounded-xl border border-dashed border-purple-500/40 flex items-center justify-center">
                    {images.model ? <img src={images.model} className="w-full h-full object-cover rounded-xl" /> : (
                      <div className="text-center p-2">
                        <Upload className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                        <span className="text-[10px] text-slate-400 block">העלה תמונת מודל</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload('model', e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: SCORE & ACTION (4 COLS) */}
          <div className="lg:col-span-4 space-y-6">
            {/* SCORE CARD */}
            <div className="bg-[#121724] p-6 rounded-2xl border border-slate-800 text-center space-y-4 shadow-xl">
              <span className="text-xs text-slate-400 uppercase tracking-wider block">ציון Confluence מחושב</span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-6xl font-black font-mono text-cyan-400">{calculatedScore}%</span>
              </div>

              {/* GEMINI AI BUTTON */}
              <button onClick={runAiAnalysis} disabled={aiAnalyzing} className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2">
                {aiAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>ניתוח תכנון ב-Gemini AI</span>
              </button>
            </div>

            {/* AI FEEDBACK POPUP */}
            {aiFeedback && (
              <div className="bg-[#121724] p-4 rounded-2xl border border-purple-500/40 space-y-2">
                <div className="flex justify-between items-center border-b border-purple-500/20 pb-2">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    חוות דעת Gemini AI
                  </span>
                  <span className="text-[10px] text-purple-400 font-mono">{aiFeedback.confidence}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 whitespace-pre-line">
                  {aiFeedback.summary}
                </p>
              </div>
            )}

            {/* SAVE FORM */}
            <div className="bg-[#121724] p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <h3 className="font-bold text-slate-200 border-b border-slate-800 pb-2">פרטי העסקה והזנה</h3>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">צמד מטבעות</label>
                  <select value={pair} onChange={(e) => setPair(e.target.value)} className="w-full bg-[#182032] border border-slate-700 rounded-xl p-2 text-white font-mono">
                    {PAIR_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">סשן מסחר</label>
                  <select value={session} onChange={(e) => setSession(e.target.value)} className="w-full bg-[#182032] border border-slate-700 rounded-xl p-2 text-white">
                    <option value="London">London Session</option>

                    <option value="London Killzone">London Killzone</option>
                    <option value="New York">New York Session</option>
                    <option value="NY Killzone">NY Killzone</option>
                    <option value="Asia">Asia Session</option>
                  </select>
                </div>
              </div>

              {pair === 'CUSTOM' && (
                <input type="text" placeholder="הכנס שם צמד (למשל US30)" value={customPair} onChange={(e) => setCustomPair(e.target.value)} className="w-full bg-[#182032] border border-slate-700 rounded-xl p-2 text-white font-mono" />
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">כיוון</label>
                  <div className="grid grid-cols-2 gap-1 bg-[#182032] p-1 rounded-xl border border-slate-700">
                    <button onClick={() => setTradeType('LONG')} className={`py-1 font-bold rounded-lg ${tradeType === 'LONG' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}>LONG</button>
                    <button onClick={() => setTradeType('SHORT')} className={`py-1 font-bold rounded-lg ${tradeType === 'SHORT' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}>SHORT</button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">סיכון (1%)</label>
                  <input type="number" value={riskAmount} onChange={(e) => setRiskAmount(e.target.value)} className="w-full bg-[#182032] border border-slate-700 rounded-xl p-2 text-white font-mono" />
                </div>
              </div>

              {/* ENTRY SCREENSHOT */}
              <div>
                <label className="text-slate-400 block mb-1">צילום כניסה (cTrader/TWS):</label>
                <div className="relative aspect-video bg-[#0d1117] rounded-xl border border-dashed border-slate-700 flex items-center justify-center">
                  {images.entry ? <img src={images.entry} className="w-full h-full object-cover rounded-xl" /> : <Upload className="w-4 h-4 text-slate-500" />}
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload('entry', e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>

              <button onClick={handleSaveTrade} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>שמור עסקה ביומן</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JOURNAL */}
      {activeTab === 'journal' && (
        <div className="max-w-7xl mx-auto bg-[#121724] p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="font-bold text-base text-white">יומן עסקאות (1% Percent Club)</h2>
          {trades.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">אין עסקאות שמורות ביומן.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs font-mono">
                <thead>
                  <tr className="bg-[#182032] text-slate-400 border-b border-slate-800">
                    <th className="p-3">תאריך</th>
                    <th className="p-3">צמד</th>
                    <th className="p-3">סשן</th>
                    <th className="p-3">ציון</th>
                    <th className="p-3">סיכון</th>
                    <th className="p-3">PnL ($)</th>
                    <th className="p-3">R:R</th>
                    <th className="p-3 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {trades.map(t => (
                    <tr key={t.id}>
                      <td className="p-3 text-slate-300">{t.date}</td>
                      <td className="p-3 font-bold text-white">{t.pair}</td>
                      <td className="p-3">{t.session}</td>
                      <td className="p-3 text-cyan-400 font-bold">{t.score}%</td>
                      <td className="p-3">${t.riskAmount}</td>
                      <td className={`p-3 font-bold ${parseFloat(t.pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>${t.pnl}</td>
                      <td className="p-3 text-cyan-400 font-bold">{t.rMultiple}R</td>
                      <td className="p-3 text-center">
                        <button onClick={() => handleDeleteTrade(t.id)} className="p-1 text-slate-500 hover:text-rose-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#121724] p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">אחוז ניצחונות (Win Rate)</span>
              <span className={`text-3xl font-black font-mono ${analytics.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{analytics.winRate}%</span>
              <span className="text-[10px] text-slate-500 block mt-1">עסקאות: {analytics.total}</span>
            </div>

            <div className="bg-[#121724] p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">רווח מצטבר ($)</span>
              <span className={`text-3xl font-black font-mono ${analytics.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>${analytics.totalPnl}</span>
            </div>

            <div className="bg-[#121724] p-5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">ממוצע R:R</span>
              <span className="text-3xl font-black font-mono text-cyan-400">{analytics.avgR}R</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
