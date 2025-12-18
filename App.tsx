
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppState, FoodScan, FoodItem, Nutrients, StapleMeal } from './types';
import { analyzeFoodImage } from './services/geminiService';
import NutrientBadge from './components/NutrientBadge';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const Icons = {
  Camera: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>,
  Upload: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>,
  History: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>,
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>,
  Calories: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.213 3.536 3.751 3.751 0 0 0 1.218 3.932Z" /></svg>,
  Protein: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /></svg>,
  Carbs: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m0-18l-3 3m3-3l3 3m-9 6h12M9 12l3 3m-3-3l3-3m-3 9h6" /></svg>,
  Fat: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747c.224-.891.076-1.785-.417-2.46-.736-1.003-1.8-1.457-2.996-1.477l-1.042-.018c-1.291-.023-2.316-.902-2.316-2.195V4.75a.75.75 0 0 0-1.5 0v3.354c0 1.293-1.026 2.172-2.317 2.195l-1.042.018c-1.196.02-2.26.474-2.996 1.477-.493.675-.641 1.569-.417 2.46A9.004 9.004 0 0 0 12 21Z" /></svg>,
  XCircle: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>,
  ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>,
  ChevronUp: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>,
  Microphone: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09-3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
  Pencil: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>,
  Heart: (props: any) => <svg xmlns="http://www.w3.org/2000/svg" fill={props.fill || "none"} viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>,
  Sun: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M3 12h2.25m.386-6.364l1.591 1.591M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>,
  Angle: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-3.75 3.75M12 4.5l3.75 3.75M4.5 12l7.5-7.5 7.5 7.5M4.5 15l7.5 7.5 7.5-7.5" /></svg>,
};

const MODELS = {
  FLASH: 'gemini-3-flash-preview',
  PRO: 'gemini-3-pro-preview'
};

const CAMERA_TIPS = [
  { text: "尝试 45 度俯拍以获得最佳体积估算", icon: <Icons.Angle /> },
  { text: "确保光线充足，避免阴影遮挡食物", icon: <Icons.Sun /> },
  { text: "在旁边放一把勺子或手作为大小参考", icon: <Icons.Sparkles /> },
  { text: "尽量让所有食物都处于中心区域", icon: <Icons.Camera /> }
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [selectedModel, setSelectedModel] = useState(MODELS.PRO);
  const [history, setHistory] = useState<FoodScan[]>([]);
  const [staples, setStaples] = useState<StapleMeal[]>([]);
  const [currentScan, setCurrentScan] = useState<FoodScan | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  
  const [isSavingStaple, setIsSavingStaple] = useState(false);
  const [stapleNameInput, setStapleNameInput] = useState('');
  const [showStapleSuccess, setShowStapleSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('nutrilens_history_v4');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedStaples = localStorage.getItem('nutrilens_staples_v1');
    if (savedStaples) setStaples(JSON.parse(savedStaples));
  }, []);

  const saveToHistory = (scan: FoodScan) => {
    const newHistory = [scan, ...history].slice(0, 50);
    setHistory(newHistory);
    localStorage.setItem('nutrilens_history_v4', JSON.stringify(newHistory));
  };

  const confirmSaveStaple = () => {
    if (!currentScan || !stapleNameInput.trim()) return;
    const newStaple: StapleMeal = {
      id: Date.now().toString(),
      name: stapleNameInput.trim(),
      imageUrl: currentScan.imageUrl,
      items: currentScan.items.map(({ id, ...rest }) => rest),
      totalCalories: currentScan.items.reduce((acc, item) => acc + (item.nutrients.calories * (item.consumedPercentage / 100)), 0)
    };
    const newStaples = [newStaple, ...staples].slice(0, 20);
    setStaples(newStaples);
    localStorage.setItem('nutrilens_staples_v1', JSON.stringify(newStaples));
    
    setIsSavingStaple(false);
    setStapleNameInput('');
    setShowStapleSuccess(true);
    setTimeout(() => setShowStapleSuccess(false), 3000);
  };

  const logStaple = (staple: StapleMeal) => {
    const newScan: FoodScan = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      imageUrl: staple.imageUrl,
      description: `快速复用: ${staple.name}`,
      insight: `已快速复用常餐“${staple.name}”。数据已根据您的模版自动填充。`,
      globalScale: 100,
      items: staple.items.map((it, idx) => ({
        ...it,
        id: `item-${idx}-${Date.now()}`,
        consumedPercentage: 100
      }))
    };
    setCurrentScan(newScan);
    saveToHistory(newScan);
    setState(AppState.RESULT);
  };

  const startCamera = async () => {
    try {
      setError(null);
      setState(AppState.CAMERA);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError('无法访问摄像头');
      setState(AppState.IDLE);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    stopCamera();
    prepareAnalysis(base64);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => prepareAnalysis(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const prepareAnalysis = (imageUrl: string) => {
    setTempImageUrl(imageUrl);
    setIsConfirming(true);
    setState(AppState.IDLE);
  };

  const runAnalysis = async () => {
    if (!tempImageUrl) return;
    setIsLoading(true);
    setIsConfirming(false);
    setState(AppState.ANALYZING);
    try {
      const result = await analyzeFoodImage(tempImageUrl, additionalContext, selectedModel);
      const newScan: FoodScan = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        imageUrl: tempImageUrl,
        description: result.description,
        insight: result.insight,
        globalScale: 100,
        items: result.items.map((it, idx) => ({
          ...it,
          id: `item-${idx}-${Date.now()}`,
          consumedPercentage: 100
        }))
      };
      setCurrentScan(newScan);
      saveToHistory(newScan);
      setState(AppState.RESULT);
    } catch (err) {
      console.error(err);
      setError('分析失败，请重试');
      setState(AppState.IDLE);
    } finally {
      setIsLoading(false);
      setAdditionalContext('');
      setTempImageUrl(null);
    }
  };

  const startVoiceInput = () => {
    if (!SpeechRecognition) {
      alert("您的浏览器不支持语音识别。");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN'; 
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAdditionalContext(prev => (prev ? prev + ' ' : '') + transcript);
    };
    recognition.start();
  };

  const updateGlobalScale = (scale: number) => {
    if (!currentScan) return;
    const updated = {
      ...currentScan,
      globalScale: scale,
      items: currentScan.items.map(item => ({ ...item, consumedPercentage: scale }))
    };
    setCurrentScan(updated);
  };

  const updateItemScale = (itemId: string, percentage: number) => {
    if (!currentScan) return;
    const updatedItems = currentScan.items.map(item => 
      item.id === itemId ? { ...item, consumedPercentage: percentage } : item
    );
    const totalOriginalWeight = updatedItems.reduce((sum, item) => sum + item.estimatedWeightGrams, 0);
    const totalConsumedWeight = updatedItems.reduce((sum, item) => 
      sum + (item.estimatedWeightGrams * (item.consumedPercentage / 100)), 0
    );
    const newGlobalScale = totalOriginalWeight > 0 
      ? Math.round((totalConsumedWeight / totalOriginalWeight) * 100) 
      : percentage;

    setCurrentScan({ ...currentScan, items: updatedItems, globalScale: newGlobalScale });
  };

  const renameItem = (itemId: string, newName: string) => {
    if (!currentScan) return;
    const updatedItems = currentScan.items.map(item => 
      item.id === itemId ? { ...item, name: newName } : item
    );
    setCurrentScan({ ...currentScan, items: updatedItems });
  };

  const updateItemWeight = (itemId: string, newWeight: number) => {
    if (!currentScan || isNaN(newWeight)) return;
    const updatedItems = currentScan.items.map(item => 
      item.id === itemId ? { ...item, estimatedWeightGrams: newWeight } : item
    );
    setCurrentScan({ ...currentScan, items: updatedItems });
  };

  const updateTotalWeight = (newTotal: number) => {
    if (!currentScan || isNaN(newTotal) || newTotal <= 0) return;
    const currentTotal = currentScan.items.reduce((sum, item) => sum + item.estimatedWeightGrams, 0);
    if (currentTotal === 0) return;
    
    const ratio = newTotal / currentTotal;
    const updatedItems = currentScan.items.map(item => ({
      ...item,
      estimatedWeightGrams: Math.round(item.estimatedWeightGrams * ratio)
    }));
    setCurrentScan({ ...currentScan, items: updatedItems });
  };

  const totals = useMemo(() => {
    if (!currentScan) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, weight: 0 };
    return currentScan.items.reduce((acc, item) => {
      const factor = item.consumedPercentage / 100;
      return {
        calories: acc.calories + (item.nutrients.calories * factor),
        protein: acc.protein + (item.nutrients.protein * factor),
        carbs: acc.carbs + (item.nutrients.carbs * factor),
        fat: acc.fat + (item.nutrients.fat * factor),
        fiber: acc.fiber + (item.nutrients.fiber * factor),
        sugar: acc.sugar + (item.nutrients.sugar * factor),
        weight: acc.weight + (item.estimatedWeightGrams * factor)
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, weight: 0 });
  }, [currentScan]);

  const macroRatio = useMemo(() => {
    const totalGrams = totals.protein + totals.carbs + totals.fat;
    if (totalGrams === 0) return { p: 33, c: 33, f: 34 };
    return {
      p: (totals.protein / totalGrams) * 100,
      c: (totals.carbs / totalGrams) * 100,
      f: (totals.fat / totalGrams) * 100,
    };
  }, [totals]);

  const reset = () => {
    stopCamera();
    setCurrentScan(null);
    setState(AppState.IDLE);
    setIsConfirming(false);
    setIsSavingStaple(false);
    setError(null);
    setExpandedItemId(null);
  };

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItemId(prev => prev === itemId ? null : itemId);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
      
      <header className="fixed top-0 inset-x-0 bg-white/80 backdrop-blur-md z-40 px-6 py-4 flex items-center justify-between border-b border-gray-100 shadow-sm">
        <h1 className="text-xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">NutriLens</h1>
        <div className="flex items-center gap-4">
          {(state !== AppState.IDLE || isConfirming) && <button onClick={reset} className="text-gray-400 hover:text-gray-600 p-2"><Icons.XCircle /></button>}
        </div>
      </header>

      <main className="pt-24 px-4 max-w-lg mx-auto">
        {state === AppState.IDLE && !isConfirming && (
          <div className="space-y-8 py-6 animate-in fade-in">
            <div className="bg-white p-1 rounded-2xl flex items-center shadow-sm border border-gray-100 mx-auto w-fit">
              <button 
                onClick={() => setSelectedModel(MODELS.FLASH)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${selectedModel === MODELS.FLASH ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Gemini 3 Flash
              </button>
              <button 
                onClick={() => setSelectedModel(MODELS.PRO)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${selectedModel === MODELS.PRO ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Gemini 3 Pro
              </button>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-4xl font-black text-gray-800 tracking-tight">智能识餐。</h2>
              <p className="text-gray-500 font-medium px-4">口袋里的 AI 食物秤，精准分析每一口营养。</p>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <button onClick={startCamera} className="w-full bg-green-600 text-white rounded-[2.5rem] p-8 flex flex-col items-center gap-3 shadow-2xl shadow-green-100 transition-transform active:scale-95 group relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-4 bg-white/20 rounded-full"><Icons.Camera /></div>
                <span className="text-xl font-bold">立即拍照识别</span>
              </button>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    我的常用餐食 <Icons.Heart fill="currentColor" />
                  </h3>
                  {staples.length > 0 && <span className="text-[10px] text-green-600 font-bold">左右滑动快速记录</span>}
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
                  {staples.length > 0 ? (
                    staples.map(staple => (
                      <button 
                        key={staple.id} 
                        onClick={() => logStaple(staple)}
                        className="flex-shrink-0 w-28 space-y-2 text-left group"
                      >
                        <div className="relative aspect-square rounded-[1.5rem] overflow-hidden border-2 border-transparent group-hover:border-green-500 shadow-sm transition-all group-active:scale-90">
                          <img src={staple.imageUrl} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                          <div className="absolute bottom-2 left-2 right-2 text-[10px] font-black text-white truncate">
                            {staple.name}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="w-full bg-gray-100/50 border-2 border-dashed border-gray-200 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center space-y-2 text-gray-400 italic">
                      <div className="p-3 bg-white rounded-full text-gray-300"><Icons.Heart /></div>
                      <p className="text-xs font-medium">识别后点击爱心保存常餐<br/>下次吃饭一键复用，无需重拍</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-gray-100 rounded-[1.5rem] p-4 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-transform">
                  <div className="p-2 bg-gray-50 rounded-full text-gray-400"><Icons.Upload /></div>
                  <span className="text-xs font-bold text-gray-600">从相册上传</span>
                </button>
                <button onClick={() => setState(AppState.HISTORY)} className="bg-white border border-gray-100 rounded-[1.5rem] p-4 flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-transform">
                  <div className="p-2 bg-gray-50 rounded-full text-gray-400"><Icons.History /></div>
                  <span className="text-xs font-bold text-gray-600">查看历史</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {isConfirming && tempImageUrl && (
          <div className="animate-in slide-in-from-bottom-10 space-y-6 pb-32">
            <div className="relative rounded-3xl overflow-hidden shadow-xl">
              <img src={tempImageUrl} className="w-full aspect-video object-cover" />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-widest">
                {selectedModel === MODELS.PRO ? 'PRO 精度模式' : 'FLASH 极速模式'}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Icons.Sparkles /></div>
                <h3 className="text-xl font-black text-gray-800">补充细节</h3>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">提供更多上下文能显著提高识别准确率（如：这是我的 500ml 标准便当盒）。</p>
              
              <div className="relative">
                <textarea 
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="例如：这是学校食堂的大份，或者额外加了辣油..."
                  className="w-full bg-white border border-gray-200 rounded-2xl p-4 pr-12 min-h-[120px] text-gray-700 focus:ring-2 focus:ring-green-500 outline-none transition-shadow text-base"
                />
                <button 
                  onClick={startVoiceInput}
                  className={`absolute right-3 bottom-3 p-3 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-100' : 'bg-gray-50 text-gray-400 hover:text-green-600'}`}
                >
                  <Icons.Microphone />
                </button>
              </div>
              
              <button 
                onClick={runAnalysis}
                className="w-full bg-gray-900 text-white rounded-2xl py-5 font-bold shadow-2xl active:scale-95 transition-all text-lg"
              >
                {isLoading ? '正在深度分析...' : '确认并开始分析'}
              </button>
            </div>
          </div>
        )}

        {state === AppState.CAMERA && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-72 h-72 border-2 border-white/20 rounded-[3rem] relative">
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-green-500 rounded-tl-[1.5rem]"></div>
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-green-500 rounded-tr-[1.5rem]"></div>
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-green-500 rounded-bl-[1.5rem]"></div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-green-500 rounded-br-[1.5rem]"></div>
              </div>
            </div>
            <div className="absolute top-20 inset-x-4">
              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-3 text-white">
                <div className="text-green-400 shrink-0">{CAMERA_TIPS[currentTipIndex].icon}</div>
                <p className="text-sm font-medium">{CAMERA_TIPS[currentTipIndex].text}</p>
              </div>
            </div>
            <div className="absolute bottom-12 inset-x-0 flex items-center justify-center gap-8 px-10">
              <button onClick={reset} className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white active:scale-90 transition-transform"><Icons.ArrowLeft /></button>
              <div className="relative">
                <button onClick={captureImage} className="w-20 h-20 bg-white rounded-full border-8 border-white/30 active:scale-90 transition-transform flex items-center justify-center relative z-10" />
                <div className="absolute -inset-2 bg-green-500/20 rounded-full animate-ping pointer-events-none"></div>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white active:scale-90 transition-transform"><Icons.Upload /></button>
            </div>
          </div>
        )}

        {state === AppState.ANALYZING && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center text-center p-8 space-y-6">
            <div className="w-24 h-24 relative">
               <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center text-green-600"><Icons.Sparkles /></div>
            </div>
            <div className="space-y-2">
               <h3 className="text-2xl font-black text-gray-800 tracking-tight">AI 视觉扫描中...</h3>
               <p className="text-green-600 text-[10px] font-black uppercase tracking-[0.2em] mb-2">正在通过 {selectedModel === MODELS.PRO ? 'Gemini 3 Pro' : 'Gemini 3 Flash'} 分析</p>
               <p className="text-gray-500 max-w-[250px] mx-auto italic text-sm">正在深度解析食物体积与营养密度...</p>
            </div>
          </div>
        )}

        {state === AppState.RESULT && currentScan && (
          <div className="animate-in slide-in-from-bottom-10 space-y-8 pb-32">
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-white">
              <img src={currentScan.imageUrl} className="w-full aspect-square object-cover" />
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-[1.5rem] shadow-lg border border-white/50">
                 <div className="flex items-center gap-2 text-green-600 mb-1">
                    <Icons.Sparkles />
                    <span className="text-[10px] font-black uppercase tracking-widest">AI 健康透视</span>
                 </div>
                 <p className="text-xs text-gray-700 font-semibold leading-relaxed">"{currentScan.insight}"</p>
              </div>
              <button 
                onClick={() => setIsSavingStaple(true)}
                className={`absolute top-4 right-4 p-4 rounded-full backdrop-blur-md transition-all transform hover:scale-110 active:scale-90 shadow-lg ${showStapleSuccess ? 'bg-green-500 text-white' : 'bg-black/30 text-white'}`}
              >
                {showStapleSuccess ? <Icons.Check /> : <Icons.Heart fill={staples.some(s => s.imageUrl === currentScan.imageUrl) ? "currentColor" : "none"} />}
              </button>
            </div>

            {showStapleSuccess && (
              <div className="bg-green-600 text-white px-5 py-4 rounded-2xl text-xs font-black animate-in slide-in-from-top-4 flex items-center gap-3 shadow-xl shadow-green-100">
                <Icons.Check /> 已成功保存到常餐模版，下次可在首页快速复用。
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">营养统计</h2>
                <div className="text-right">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">总预估重量</span>
                  <div className="flex items-center gap-2 bg-green-50 px-4 py-1.5 rounded-full border border-green-100">
                    <input 
                      type="number"
                      value={Math.round(totals.weight)}
                      onChange={(e) => updateTotalWeight(parseInt(e.target.value))}
                      className="bg-transparent text-lg font-black text-green-600 w-16 text-right focus:outline-none border-none p-0"
                    />
                    <span className="text-green-600 font-bold text-sm">克</span>
                    <div className="text-green-300 ml-1"><Icons.Angle /></div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <NutrientBadge label="热量" value={totals.calories} unit="kcal" color="bg-orange-500" icon={<Icons.Calories />} />
                <NutrientBadge label="蛋白质" value={totals.protein} unit="g" color="bg-blue-600" icon={<Icons.Protein />} />
                <NutrientBadge label="总碳水" value={totals.carbs} unit="g" color="bg-yellow-500" icon={<Icons.Carbs />} />
                <NutrientBadge label="总脂肪" value={totals.fat} unit="g" color="bg-red-500" icon={<Icons.Fat />} />
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">包含成分 ({currentScan.items.length})</h3>
                <div className="space-y-3">
                  {currentScan.items.map((item) => {
                    const isExpanded = expandedItemId === item.id;
                    const factor = item.consumedPercentage / 100;
                    
                    return (
                      <div key={item.id} className="bg-white overflow-hidden rounded-[1.5rem] border border-gray-100 shadow-sm transition-all duration-300">
                        <div className="p-5 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 pr-4">
                              <input 
                                value={item.name} 
                                onChange={(e) => renameItem(item.id, e.target.value)}
                                className="font-black text-gray-800 leading-tight bg-transparent border-none focus:ring-0 p-0 w-full text-base"
                              />
                              {/* 条目重量修改区域 - 已恢复输入框 */}
                              <div className="flex items-center gap-1.5 text-xs mt-1.5">
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-100 hover:border-green-300 transition-colors group">
                                  <input 
                                    type="number"
                                    value={Math.round(item.estimatedWeightGrams)}
                                    onChange={(e) => updateItemWeight(item.id, parseInt(e.target.value))}
                                    className="w-12 bg-transparent font-bold text-gray-600 focus:outline-none border-none p-0"
                                  />
                                  <span className="text-gray-400 font-medium">g</span>
                                  <Icons.Pencil />
                                </div>
                                <span className="text-gray-300 font-light mx-0.5">|</span>
                                <span className="text-gray-400">当前计算: <strong className="text-gray-600 font-black">{Math.round(item.estimatedWeightGrams * factor)}g</strong></span>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <span className="block text-green-600 font-black whitespace-nowrap">{Math.round(item.nutrients.calories * factor)} kcal</span>
                              <button onClick={() => toggleItemExpansion(item.id)} className="text-gray-300 hover:text-gray-500 p-1">
                                 {isExpanded ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                             <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase">
                                <span>摄入比例</span>
                                <span>{item.consumedPercentage}%</span>
                             </div>
                             <input 
                              type="range" 
                              min="0" max="100" 
                              value={item.consumedPercentage} 
                              onChange={(e) => updateItemScale(item.id, parseInt(e.target.value))}
                              className="w-full h-2 bg-gray-50 rounded-lg appearance-none cursor-pointer accent-green-500"
                            />
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-5 pb-5 pt-0 animate-in fade-in slide-in-from-top-1">
                            <div className="border-t border-gray-50 pt-4 grid grid-cols-2 gap-2">
                              <div className="bg-gray-50/50 p-2 rounded-xl flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400">蛋白质</span>
                                <span className="text-xs font-black">{(item.nutrients.protein * factor).toFixed(1)}g</span>
                              </div>
                              <div className="bg-gray-50/50 p-2 rounded-xl flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400">碳水</span>
                                <span className="text-xs font-black">{(item.nutrients.carbs * factor).toFixed(1)}g</span>
                              </div>
                              <div className="bg-gray-50/50 p-2 rounded-xl flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400">脂肪</span>
                                <span className="text-xs font-black">{(item.nutrients.fat * factor).toFixed(1)}g</span>
                              </div>
                              <div className="bg-gray-50/50 p-2 rounded-xl flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400">纤维</span>
                                <span className="text-xs font-black">{(item.nutrients.fiber * factor).toFixed(1)}g</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button onClick={reset} className="w-full bg-gray-900 text-white rounded-[1.5rem] py-5 font-black shadow-xl active:scale-95 transition-all text-lg mt-4">确认记录并完成</button>
            </div>
          </div>
        )}

        {isSavingStaple && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10 bg-black/60 backdrop-blur-sm animate-in fade-in">
             <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in slide-in-from-bottom-10">
                <div className="space-y-2 text-center">
                   <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Icons.Heart fill="currentColor" /></div>
                   <h3 className="text-2xl font-black text-gray-800">存为常餐模版</h3>
                   <p className="text-sm text-gray-500">下次吃同样的食物，一键复用模版比例，无需再次拍摄。</p>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">餐食名称</label>
                   <input 
                      autoFocus
                      value={stapleNameInput}
                      onChange={(e) => setStapleNameInput(e.target.value)}
                      placeholder="例如：公司食堂鸡肉丸套餐..."
                      className="w-full bg-gray-50 border-none rounded-2xl p-5 text-lg font-bold text-gray-800 focus:ring-2 focus:ring-green-500 outline-none"
                   />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                   <button onClick={() => setIsSavingStaple(false)} className="py-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-50">取消</button>
                   <button onClick={confirmSaveStaple} className="py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-100 active:scale-95 transition-transform">确认保存</button>
                </div>
             </div>
          </div>
        )}

        {state === AppState.HISTORY && (
          <div className="animate-in slide-in-from-bottom-10 space-y-6 pb-20">
             <div className="flex items-center gap-4">
                <button onClick={() => setState(AppState.IDLE)} className="p-3 bg-white rounded-full text-gray-400 shadow-sm"><Icons.ArrowLeft /></button>
                <h2 className="text-2xl font-black text-gray-800">历史记录</h2>
             </div>
             <div className="space-y-4">
                {history.length > 0 ? history.map(h => (
                  <div key={h.id} onClick={() => { setCurrentScan(h); setState(AppState.RESULT); }} className="bg-white rounded-[1.5rem] p-4 flex items-center gap-4 border border-gray-100 shadow-sm cursor-pointer hover:border-green-500 transition-colors">
                     <img src={h.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
                     <div className="flex-1">
                        <p className="text-sm font-black text-gray-800 line-clamp-1">{h.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(h.timestamp).toLocaleDateString()} • {Math.round(h.items.reduce((acc, i) => acc + i.nutrients.calories, 0))} kcal</p>
                     </div>
                  </div>
                )) : (
                  <div className="py-20 text-center space-y-2 text-gray-300 italic">
                     <Icons.History />
                     <p>暂无识别历史</p>
                  </div>
                )}
             </div>
          </div>
        )}
      </main>

      <canvas ref={canvasRef} className="hidden" />

      {(state === AppState.IDLE || state === AppState.HISTORY) && (
        <nav className="fixed bottom-8 inset-x-0 w-[85%] max-w-sm mx-auto bg-gray-900/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-[3rem] px-8 py-4 flex items-center justify-around z-40">
          <button onClick={() => setState(AppState.IDLE)} className={`p-2 transition-all ${state === AppState.IDLE ? 'text-green-500' : 'text-white/50'}`}><Icons.Sparkles /></button>
          <button onClick={startCamera} className="w-16 h-16 bg-green-500 text-white rounded-full -mt-16 border-[6px] border-gray-900 shadow-xl flex items-center justify-center active:scale-90 transition-transform"><Icons.Camera /></button>
          <button onClick={() => setState(AppState.HISTORY)} className={`p-2 transition-all ${state === AppState.HISTORY ? 'text-green-500' : 'text-white/50'}`}><Icons.History /></button>
        </nav>
      )}
    </div>
  );
};

export default App;
