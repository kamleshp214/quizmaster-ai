"use client";

/**
 * QUIZMASTER ONYX v14.2 (Production Stable)
 * -----------------------------------
 * - Fixed: Missing 'startFlashcards' function definition
 * - Verified: All event handlers linked correctly
 * - UX: Validated Topic/PDF/Youtube switching logic
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Loader2, Check, X, FileText, Youtube, Trophy, 
  ArrowRight, Download, RefreshCcw, HelpCircle, 
  Baby, Sparkles, GraduationCap, Share2, GalleryVerticalEnd, RotateCcw, Key,
  Clock, Settings2, ImageIcon, Volume2, VolumeX, LogOut, AlertTriangle, Timer, Brain, CheckCircle2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import confetti from "canvas-confetti";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toPng } from 'html-to-image';

// --- TYPES ---
type QuizType = "mcq" | "tf" | "fib" | "mix";

interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  simple_explanation: string;
  type: QuizType;
}

interface HistoryItem {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
}

// --- AUDIO ENGINE ---
let audioCtx: AudioContext | null = null;

const playSound = (type: "click" | "success" | "error" | "flip" | "warning") => {
  if (typeof window === "undefined") return;
  if (!audioCtx) {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === "click") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  } 
  else if (type === "success") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } 
  else if (type === "error") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } 
  else if (type === "warning") {
    osc.type = "square";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(150, now + 0.2);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  }
  else if (type === "flip") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  }
};

const vibrate = (pattern = [10]) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

// --- VISUAL COMPONENTS ---

const NoiseOverlay = () => (
  <div className="pointer-events-none fixed inset-0 z-50 mix-blend-overlay opacity-[0.03]" 
       style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
  </div>
);

const Logo = () => (
  <div className="group flex items-center gap-3 select-none">
    <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-black shadow-black/20 shadow-xl transition-transform md:h-10 md:w-10 group-hover:scale-105">
      <div className="absolute inset-0 bg-gradient-to-tr from-zinc-800 to-black"></div>
      <Sparkles className="relative z-10 h-4 w-4 text-white md:h-5 md:w-5 group-hover:animate-pulse" />
    </div>
    <div className="flex flex-col leading-none">
      <span className="text-lg font-black tracking-tighter text-black uppercase md:text-xl">QuizMaster</span>
      <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase md:text-[10px]">Onyx Edition</span>
    </div>
  </div>
);

export default function Home() {
  // App States
  const [view, setView] = useState<"HOME" | "QUIZ" | "RESULTS" | "FLASHCARDS">("HOME");
  const [activeTab, setActiveTab] = useState<string>("pdf");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [apiKey, setApiKey] = useState("");
  
  // Configuration
  const [quizType, setQuizType] = useState<string>("mix");
  const [difficulty, setDifficulty] = useState<string>("normal");
  const [questionCount, setQuestionCount] = useState([5]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [topicInput, setTopicInput] = useState(""); 
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Quiz Content
  const [subject, setSubject] = useState("General");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); 

  // Interaction & Telemetry
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [history, setHistory] = useState<(HistoryItem | null)[]>([]);
  const [showEli5, setShowEli5] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [studyTimeSeconds, setStudyTimeSeconds] = useState<number>(0);
  
  // Modals
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Helper: Component-level Feedback
  const triggerFeedback = (type: "click" | "success" | "error" | "flip" | "warning") => {
    if (soundEnabled) playSound(type);
    vibrate(type === "error" ? [50, 50] : [10]);
  };

  useEffect(() => {
    const storedKey = localStorage.getItem("groq_api_key");
    if (storedKey) setApiKey(storedKey);
  }, []);

  // Timer logic
  useEffect(() => {
    if (view === "QUIZ" && isMockMode && timeLeft > 0 && !showExitConfirm) {
      const timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && isMockMode && view === "QUIZ") finishQuiz();
  }, [timeLeft, view, isMockMode, showExitConfirm]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // --- BUSINESS LOGIC ---

  const handleStart = async () => {
    triggerFeedback("click");
    if (!apiKey) return toast.error("API Key required");
    localStorage.setItem("groq_api_key", apiKey);
    
    // Payload Logic
    const formData = new FormData();
    if (activeTab === "pdf" && selectedFile) {
        formData.append("file", selectedFile);
    } else if (activeTab === "youtube" && youtubeUrl) {
        formData.append("youtubeUrl", youtubeUrl);
    } else if (activeTab === "topic" && topicInput) {
        formData.append("topic", topicInput);
    } else {
        triggerFeedback("error");
        return toast.error("Please provide a source content.");
    }
    
    setIsLoading(true);
    setLoadingStep("Reading Content...");
    formData.append("apiKey", apiKey);
    formData.append("quizType", quizType);
    formData.append("difficulty", difficulty);
    formData.append("amount", questionCount[0].toString());

    try {
      setTimeout(() => setLoadingStep("Deep Learning Scan..."), 1500);
      setTimeout(() => setLoadingStep("Generating Assessment..."), 3000);

      const res = await fetch("/api/quiz/generate", { method: "POST", body: formData });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Generation failed");
      
      setQuestions(data.questions);
      setSubject(data.subject || (activeTab === 'topic' ? topicInput : "Session"));
      setHistory(new Array(data.questions.length).fill(null));
      
      setTimeout(() => {
         setView("QUIZ");
         setCurrentQ(0);
         setScore(0);
         setIsAnswered(false);
         setQuizStartTime(Date.now());
         if (isMockMode) setTimeLeft(data.questions.length * 60);
         setIsLoading(false);
      }, 500);

    } catch (err: any) {
      toast.error(err.message);
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (isAnswered && !isMockMode) return;
    triggerFeedback("click");
    setSelectedOption(option);
    if (!isMockMode) submitAnswer(option);
  };

  const submitAnswer = (finalAnswer: string | null) => {
    if (!finalAnswer) return;
    const q = questions[currentQ];
    const isCorrect = finalAnswer.toLowerCase().trim() === q.answer.toLowerCase().trim();
    
    setHistory(prev => {
      const newHist = [...prev];
      newHist[currentQ] = {
        question: q.question, userAnswer: finalAnswer,
        correctAnswer: q.answer, explanation: q.explanation, isCorrect
      };
      return newHist;
    });

    if (isCorrect) setScore(s => s + 1);
    setIsAnswered(true);
    
    if (!isMockMode) {
      if (isCorrect) {
        triggerFeedback("success");
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 }, colors: ['#000000', '#555555'] });
      } else triggerFeedback("error");
    } else triggerFeedback("click");
  };

  const nextQuestion = () => {
    triggerFeedback("click");
    if (currentQ < questions.length - 1) {
      setCurrentQ(p => p + 1);
      setIsAnswered(false);
      setShowEli5(false);
      setSelectedOption(null);
      setTextAnswer("");
      setIsFlipped(false);
    } else finishQuiz();
  };

  const finishQuiz = () => {
    setStudyTimeSeconds(Math.floor((Date.now() - quizStartTime) / 1000));
    setView("RESULTS");
    if (score / questions.length > 0.6) {
      setTimeout(() => {
        triggerFeedback("success");
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ['#000000', '#333333', '#666666'] });
      }, 300);
    }
  };

  const executeExit = () => { triggerFeedback("click"); setShowExitConfirm(false); setView("HOME"); };
  const confirmExit = () => { triggerFeedback("warning"); setShowExitConfirm(true); };

  const restartQuiz = () => {
    triggerFeedback("click");
    setView("QUIZ");
    setCurrentQ(0);
    setScore(0);
    setIsAnswered(false);
    setShowEli5(false);
    setSelectedOption(null);
    setTextAnswer("");
    setShowExitConfirm(false);
    setQuizStartTime(Date.now());
    if (isMockMode) setTimeLeft(questions.length * 60);
  };

  // --- MISSING FUNCTION ADDED HERE ---
  const startFlashcards = () => {
    triggerFeedback("click");
    setCurrentQ(0);
    setIsFlipped(false);
    setView("FLASHCARDS");
  };

  const generateShareImage = async () => {
    if (!shareCardRef.current) return;
    triggerFeedback("click");
    try {
      const dataUrl = await toPng(shareCardRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#000000' });
      const link = document.createElement('a');
      link.download = `Onyx_Score_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Saved to Gallery");
    } catch (err) { toast.error("Image generation failed"); }
  };

  const downloadPDF = () => {
    triggerFeedback("click");
    const doc = new jsPDF();
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 210, 45, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("QuizMaster Onyx", 14, 20);
    doc.setFontSize(10);
    doc.text(`Subject: ${subject} | Difficulty: ${difficulty.toUpperCase()}`, 14, 28);
    doc.text(`Time: ${formatTime(studyTimeSeconds)} | Date: ${new Date().toLocaleDateString()}`, 14, 34);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(`Final Score: ${score} / ${questions.length}`, 14, 60);
    const tableData = history.filter(h => h).map((h, i) => [i + 1, h!.question, h!.userAnswer, h!.correctAnswer, h!.isCorrect ? "PASS" : "FAIL"]);
    // @ts-ignore
    autoTable(doc, { head: [['#', 'Question', 'Answer', 'Correct', 'Result']], body: tableData, startY: 65, theme: 'grid', headStyles: { fillColor: [0, 0, 0] } });
    doc.save(`QuizMaster_${subject}_Report.pdf`);
  };

  // --- VIEWS ---

  if (isLoading) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white font-mono overflow-hidden relative">
      <NoiseOverlay />
      <div className="z-10 flex flex-col items-center p-6 text-center">
        <motion.div animate={{ scale: [1, 1.1, 1], rotate: 360 }} transition={{ duration: 3, repeat: Infinity }} className="mb-8 h-16 w-16 rounded-full border-4 border-zinc-100 border-t-black shadow-xl" />
        <h2 className="text-xl font-black tracking-tighter text-black uppercase animate-pulse">{loadingStep}</h2>
      </div>
    </div>
  );

  if (view === "HOME") return (
    <div className="bg-[#FAFAFA] flex min-h-screen flex-col font-sans relative overflow-x-hidden pb-12 md:items-center md:justify-center">
      <NoiseOverlay />
      <div className="fixed top-[-20%] left-[-10%] z-0 h-[50%] w-[80%] rounded-full bg-zinc-200/40 blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] z-0 h-[40%] w-[60%] rounded-full bg-zinc-300/20 blur-[100px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="z-10 grid w-full max-w-5xl gap-8 p-6 pt-12 md:p-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-5 md:space-y-12">
          <div className="flex w-full items-center justify-between">
            <Logo />
            <Dialog>
               <DialogTrigger asChild>
                  <button className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-[10px] font-bold tracking-widest text-zinc-500 uppercase transition-colors hover:text-black lg:hidden">
                     <Key size={12}/> API Key
                  </button>
               </DialogTrigger>
               <DialogContent className="max-w-sm rounded-2xl font-sans">
                  <DialogHeader><DialogTitle className="font-bold">Groq Configuration</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                     <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="gsk_..." className="h-14 font-mono text-sm shadow-inner" />
                     <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-xs font-bold text-zinc-500 underline">Get free key &rarr;</a>
                  </div>
               </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black leading-[0.9] tracking-tighter md:text-7xl">Train<br/>Your<br/>Brain.</h1>
            <p className="max-w-xs text-base font-medium leading-relaxed text-zinc-500 md:text-lg">Upload docs, paste links, or <span className="font-bold text-black">generate from topics.</span></p>
          </div>
          <div className="hidden space-y-4 lg:block">
             <div className="max-w-xs space-y-2">
                <label className="ml-1 text-[10px] font-black tracking-widest text-zinc-400 uppercase">Master API Key</label>
                <div className="relative group">
                  <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="gsk_..." className="h-14 rounded-xl border-zinc-200 bg-white pl-12 font-mono text-base shadow-sm transition-all focus:ring-2 focus:ring-black placeholder:text-zinc-300" />
                  <Key size={20} className="absolute left-4 top-4 text-zinc-400" />
                  {apiKey.startsWith("gsk_") && <Check size={20} className="absolute right-4 top-4 text-green-500" />}
                </div>
             </div>
          </div>
          <div onClick={() => { triggerFeedback("click"); setSoundEnabled(!soundEnabled); }} className="flex w-fit cursor-pointer items-center gap-3 opacity-50 transition select-none hover:opacity-100">
             {soundEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}
             <span className="text-xs font-bold tracking-wide uppercase">Audio {soundEnabled ? "On" : "Off"}</span>
          </div>
        </div>

        <div className="lg:col-span-7">
          <Card className="rounded-[32px] border-0 bg-white/80 p-1.5 shadow-zinc-200 shadow-2xl backdrop-blur-xl md:p-2">
            <div className="space-y-8 rounded-[28px] border border-zinc-100 bg-white p-6 md:p-8">
              <div className="space-y-3">
                 <label className="ml-1 flex items-center gap-2 text-xs font-black tracking-widest text-black uppercase">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] text-white">1</span> Select Source
                 </label>
                 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                   <TabsList className="grid h-14 w-full grid-cols-3 rounded-2xl bg-zinc-100 p-1.5">
                     <TabsTrigger value="pdf" className="rounded-xl text-[10px] font-bold tracking-widest uppercase h-full transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm md:text-xs">PDF</TabsTrigger>
                     <TabsTrigger value="youtube" className="rounded-xl text-[10px] font-bold tracking-widest uppercase h-full transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm md:text-xs">YouTube</TabsTrigger>
                     <TabsTrigger value="topic" className="rounded-xl text-[10px] font-bold tracking-widest uppercase h-full transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm md:text-xs">Topic</TabsTrigger>
                   </TabsList>
                   <TabsContent value="pdf" className="mt-4">
                     <div className="flex h-32 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 transition-colors hover:bg-zinc-100 hover:border-black relative">
                        {selectedFile ? (
                           <div className="flex w-full flex-col items-center gap-3 px-6 text-center">
                              <CheckCircle2 size={32} className="text-green-500" />
                              <span className="w-full truncate text-xs font-bold">{selectedFile.name}</span>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold text-red-500 uppercase hover:bg-red-50 hover:text-red-600" onClick={() => setSelectedFile(null)}>Remove</Button>
                           </div>
                        ) : (
                           <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2">
                              <input type="file" accept=".pdf" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="hidden" />
                              <FileText size={24} className="text-zinc-400" />
                              <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Browse PDF</span>
                           </label>
                        )}
                     </div>
                   </TabsContent>
                   <TabsContent value="youtube" className="mt-4">
                     <div className="relative">
                        <Input placeholder="Paste YouTube Link..." value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} className="h-16 rounded-2xl border-zinc-200 bg-zinc-50 pl-12 text-sm font-medium focus:bg-white" />
                        <Youtube size={20} className="absolute left-4 top-5 text-zinc-400" />
                     </div>
                   </TabsContent>
                   <TabsContent value="topic" className="mt-4">
                     <div className="relative">
                        <Input placeholder="e.g. World War 2, React.js..." value={topicInput} onChange={e => setTopicInput(e.target.value)} className="h-16 rounded-2xl border-zinc-200 bg-zinc-50 pl-12 text-sm font-medium focus:bg-white" />
                        <Brain size={20} className="absolute left-4 top-5 text-zinc-400" />
                     </div>
                   </TabsContent>
                 </Tabs>
              </div>

              <div className="space-y-4 border-t border-zinc-100 pt-4">
                 <label className="ml-1 flex items-center gap-2 text-xs font-black tracking-widest text-black uppercase">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] text-white">2</span> Configuration
                 </label>
                 <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-2">
                       <label className="ml-1 text-[10px] font-black tracking-widest text-zinc-400 uppercase">Level</label>
                       <Select value={difficulty} onValueChange={setDifficulty}>
                         <SelectTrigger className="h-14 rounded-xl border-zinc-200 bg-zinc-50 font-bold text-sm"><SelectValue /></SelectTrigger>
                         <SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-2">
                       <label className="ml-1 text-[10px] font-black tracking-widest text-zinc-400 uppercase">Format</label>
                       <Select value={quizType} onValueChange={setQuizType}>
                         <SelectTrigger className="h-14 rounded-xl border-zinc-200 bg-zinc-50 font-bold text-sm"><SelectValue /></SelectTrigger>
                         <SelectContent><SelectItem value="mix">Mixed</SelectItem><SelectItem value="mcq">MCQ</SelectItem><SelectItem value="tf">True/False</SelectItem><SelectItem value="fib">Blanks</SelectItem></SelectContent>
                       </Select>
                    </div>
                 </div>
                 <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
                    <div className="mb-4 flex items-center justify-between">
                       <label className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Count</label>
                       <span className="rounded-md border border-zinc-100 bg-white px-3 py-1 text-xl font-black shadow-sm">{questionCount}</span>
                    </div>
                    <Slider value={questionCount} onValueChange={setQuestionCount} min={5} max={15} step={5} className="cursor-pointer" />
                 </div>
                 <div onClick={() => { triggerFeedback("click"); setIsMockMode(!isMockMode); }} className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition-all active:scale-[0.98] select-none ${isMockMode ? "border-black bg-black text-white shadow-md" : "border-zinc-200 bg-white text-black hover:border-zinc-300"}`}>
                   <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${isMockMode ? "border-zinc-700 bg-zinc-800" : "border-zinc-200 bg-zinc-50"}`}>
                         {isMockMode ? <Clock size={18} /> : <Settings2 size={18} />}
                      </div>
                      <div className="flex flex-col text-left">
                         <span className="text-sm font-bold tracking-wide">Mock Mode</span>
                         <span className={`mt-0.5 text-[10px] font-bold tracking-widest uppercase ${isMockMode ? "text-zinc-400" : "text-zinc-500"}`}>{isMockMode ? "Timer ON" : "Feedback ON"}</span>
                      </div>
                   </div>
                   <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${isMockMode ? "border-white bg-white" : "border-zinc-300"}`}>
                      {isMockMode && <Check size={14} className="text-black" />}
                   </div>
                 </div>
              </div>
              <div className="border-t border-zinc-100 pt-4">
                 <Button onClick={handleStart} className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-black text-lg font-black tracking-widest text-white uppercase transition-all hover:bg-zinc-800 active:scale-95 shadow-xl shadow-black/10">
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Sparkles size={20}/> Generate</>}
                 </Button>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  );

  if (view === "QUIZ" && questions.length > 0) {
    const q = questions[currentQ];
    return (
      <div className="flex min-h-screen flex-col bg-white font-sans overflow-x-hidden relative text-black">
        <NoiseOverlay />
        <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <DialogContent className="max-w-md rounded-2xl font-sans">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-500"><AlertTriangle size={20} /> End Session?</DialogTitle></DialogHeader>
            <div className="space-y-6 pt-2">
               <p className="text-sm font-medium leading-relaxed text-zinc-600">Your current progress will be lost.</p>
               <div className="flex gap-3">
                  <Button variant="outline" className="h-12 flex-1 rounded-xl font-bold" onClick={() => setShowExitConfirm(false)}>Cancel</Button>
                  <Button variant="destructive" className="h-12 flex-1 rounded-xl bg-red-500 font-bold text-white hover:bg-red-600" onClick={executeExit}>Exit</Button>
               </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-100 bg-white/80 px-6 py-4 backdrop-blur-md">
          <Button variant="ghost" size="icon" onClick={confirmExit} className="h-10 w-10 text-zinc-400 transition-colors active:scale-95 hover:bg-zinc-100 hover:text-black"><LogOut className="h-5 w-5" /></Button>
          <div className="mx-4 flex flex-1 flex-col items-center">
             <span className="mb-2 max-w-[150px] truncate text-[8px] font-black tracking-widest text-zinc-400 uppercase md:max-w-[300px]">{subject}</span>
             <div className="flex w-full max-w-[200px] justify-center gap-1">
                {history.map((h, i) => (<div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentQ ? "max-w-[32px] flex-1 bg-black" : "w-2 bg-zinc-200"} ${h ? (h.isCorrect ? "w-2 bg-green-500" : "w-2 bg-red-500") : ""}`} />))}
             </div>
          </div>
          {isMockMode ? (<div className="flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 font-mono text-[10px] font-bold text-white shadow-sm"><Clock size={12} />{Math.floor(timeLeft/60)}:{timeLeft%60 < 10 ? '0' : ''}{timeLeft%60}</div>) : <div className="w-10"/>}
        </div>

        <div className="flex-1 overflow-y-auto p-6 pb-48">
          <div className="mx-auto max-w-xl pt-4 md:pt-10">
            <h2 className="mb-8 text-2xl font-black leading-tight tracking-tight md:mb-12 md:text-3xl">{q.question}</h2>
            <div className="space-y-3 md:space-y-4">
              {q.type === "fib" ? (
                <Input value={textAnswer} onChange={e => setTextAnswer(e.target.value)} placeholder="Type answer..." className="h-16 rounded-none border-b-2 border-zinc-200 bg-transparent p-6 text-xl font-bold shadow-none focus:border-black focus-visible:ring-0 md:text-2xl" autoFocus />
              ) : (
                q.options.map((opt, i) => (
                  <button key={i} onClick={() => handleOptionSelect(opt)} disabled={isAnswered && !isMockMode} className={`group flex w-full items-start gap-4 rounded-2xl border-2 p-5 text-left text-base font-bold transition-all active:scale-[0.98] duration-200 md:text-lg ${isAnswered && !isMockMode ? (opt === q.answer ? "border-black bg-black text-white" : (selectedOption === opt ? "border-red-500 bg-white text-red-500" : "border-zinc-100 bg-white opacity-50")) : (selectedOption === opt ? "border-black bg-black text-white shadow-md" : "border-zinc-100 bg-white hover:border-black")}`}>
                    <div className={`mt-0.5 flex h-6 min-w-[24px] items-center justify-center rounded-md border text-[10px] font-bold transition-colors ${isAnswered && !isMockMode ? (opt === q.answer ? "border-white bg-white text-black" : (selectedOption === opt ? "border-red-500 bg-red-100 text-red-500" : "border-zinc-200 bg-zinc-100 text-zinc-400")) : (selectedOption === opt ? "border-white bg-white text-black" : "border-zinc-200 bg-zinc-50 text-zinc-400 group-hover:border-black group-hover:bg-black group-hover:text-white")}`}>{String.fromCharCode(65+i)}</div>
                    <span className="leading-snug">{opt}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-100 bg-white/90 p-6 pb-8 backdrop-blur-xl md:pb-6">
           <div className="mx-auto max-w-xl">
              {isAnswered && !isMockMode ? (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="flex items-center justify-between">
                       <div className={`flex items-center gap-2 text-sm font-black tracking-widest uppercase ${selectedOption === q.answer || textAnswer.toLowerCase() === q.answer.toLowerCase() ? "text-black" : "text-zinc-400"}`}>
                         {selectedOption === q.answer || textAnswer.toLowerCase() === q.answer.toLowerCase() ? <Check size={20}/> : <X size={20}/>}
                         {selectedOption === q.answer || textAnswer.toLowerCase() === q.answer.toLowerCase() ? "Correct" : "Incorrect"}
                       </div>
                       <div onClick={() => { triggerFeedback("click"); setShowEli5(!showEli5); }} className="flex cursor-pointer items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 transition select-none active:scale-95">
                          <Baby size={16} className={showEli5 ? "text-black" : "text-zinc-400"} />
                          <span className="text-[10px] font-bold tracking-widest uppercase">ELI5 MODE</span>
                       </div>
                    </div>
                    <div className="custom-scrollbar max-h-[180px] overflow-y-auto rounded-2xl border border-zinc-100 bg-zinc-50 p-5 text-sm font-medium leading-relaxed text-zinc-700 md:text-base">
                       {showEli5 ? q.simple_explanation : q.explanation}
                    </div>
                    <Button onClick={nextQuestion} className="h-16 w-full rounded-2xl bg-black text-lg font-black tracking-widest text-white uppercase shadow-xl transition-transform active:scale-95">Continue &rarr;</Button>
                 </motion.div>
              ) : (
                 <Button onClick={() => isMockMode && isAnswered ? nextQuestion() : submitAnswer(isMockMode ? selectedOption : textAnswer)} disabled={!selectedOption && !textAnswer && !isAnswered} className="h-16 w-full rounded-2xl bg-black text-lg font-black tracking-widest text-white uppercase shadow-xl transition-transform active:scale-95">{isMockMode && isAnswered ? "Next Question &rarr;" : "Submit Answer"}</Button>
              )}
           </div>
        </div>
      </div>
    );
  }

  if (view === "FLASHCARDS" && questions.length > 0) {
    const q = questions[currentQ];
    return (
      <div className="bg-[#09090B] flex min-h-screen flex-col p-6 font-sans overflow-hidden select-none text-white">
        <div className="z-10 mb-10 flex items-center justify-between">
           <Button variant="ghost" className="flex items-center gap-2 rounded-full px-4 py-6 text-white hover:bg-white/10" onClick={() => { triggerFeedback("click"); setView("RESULTS"); }}>
              <LogOut size={18}/><span className="text-xs font-bold tracking-widest uppercase hidden md:inline-block">Exit Cards</span>
           </Button>
           <div className="flex items-center gap-3">
              <div className="flex gap-1">{questions.map((_, i) => (<div key={i} className={`h-1.5 rounded-full transition-all ${i === currentQ ? "w-6 bg-white" : "w-1.5 bg-zinc-700"}`} />))}</div>
              <span className="w-8 text-right text-xs font-bold tracking-widest text-zinc-500">{currentQ + 1}/{questions.length}</span>
           </div>
        </div>
        <div className="relative flex flex-1 flex-col items-center justify-center w-full max-w-sm mx-auto" style={{ perspective: "1500px" }}>
           <motion.div className="relative aspect-[3/4] w-full cursor-pointer group" onClick={() => { triggerFeedback("flip"); setIsFlipped(!isFlipped); }} animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }} style={{ transformStyle: "preserve-3d" }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[40px] border border-zinc-800 bg-black p-8 text-center shadow-2xl transition-colors md:p-10 group-hover:border-zinc-700" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                 <span className="mb-8 text-[10px] font-black tracking-[0.2em] text-zinc-600 uppercase">Question</span>
                 <h2 className="text-2xl font-bold leading-relaxed md:text-3xl">{q.question}</h2>
                 <div className="absolute bottom-10 animate-pulse flex flex-col items-center gap-2"><span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Tap to Reveal</span></div>
              </div>
              <div className="no-scrollbar absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[40px] bg-white p-8 text-center shadow-2xl md:p-10" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: "rotateY(180deg)" }}>
                 <span className="mb-6 shrink-0 text-[10px] font-black tracking-[0.2em] text-zinc-400 uppercase">Answer</span>
                 <div className="no-scrollbar flex w-full flex-col items-center justify-center overflow-y-auto pr-2">
                    <h2 className="mb-6 text-3xl font-black leading-tight text-black">{q.answer}</h2>
                    <p className="text-sm font-medium leading-relaxed text-zinc-600">{q.simple_explanation}</p>
                 </div>
              </div>
           </motion.div>
        </div>
        <div className="z-10 mx-auto mt-12 flex w-full max-w-sm items-center justify-between px-2">
           <button onClick={() => { triggerFeedback("click"); setIsFlipped(false); if(currentQ > 0) setCurrentQ(c => c - 1); }} disabled={currentQ === 0} className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-white shadow-lg transition-colors active:scale-95 disabled:opacity-20 hover:bg-zinc-700"><ArrowRight className="rotate-180" size={24}/></button>
           <span className="hidden text-[10px] font-bold tracking-widest text-zinc-600 uppercase md:block">Navigation</span>
           <button onClick={() => { triggerFeedback("click"); setIsFlipped(false); if (currentQ < questions.length - 1) setCurrentQ(c => c + 1); else setView("RESULTS"); }} className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-white shadow-lg transition-colors active:scale-95 hover:bg-zinc-700">{currentQ === questions.length - 1 ? <Check size={24}/> : <ArrowRight size={24}/>}</button>
        </div>
      </div>
    )
  }

  if (view === "RESULTS") return (
    <div className="bg-white flex min-h-screen flex-col items-center justify-center font-sans p-6 relative overflow-x-hidden text-black">
      <NoiseOverlay />
      <div style={{ position: "fixed", top: 0, left: 0, zIndex: -50, opacity: 0, pointerEvents: "none" }}>
        <div ref={shareCardRef} className="relative flex h-[800px] w-[600px] flex-col justify-between overflow-hidden bg-black p-12 text-white font-sans">
           <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-800/50 to-black" />
           <div className="relative z-10">
              <div className="mb-8 flex items-center gap-4">
                 <div className="rounded-lg bg-white p-2 text-black"><Sparkles size={32} /></div>
                 <span className="text-3xl font-black tracking-tighter uppercase">QuizMaster Onyx</span>
              </div>
              <h1 className="mb-4 text-5xl font-bold leading-tight text-zinc-100">{subject}</h1>
              <div className="inline-block rounded-full border border-zinc-700 bg-zinc-800 px-6 py-2 text-lg font-bold tracking-wide text-zinc-300 uppercase">{difficulty} Mode</div>
           </div>
           <div className="relative z-10 w-full">
              <div className="flex items-baseline gap-2"><span className="text-[180px] font-black leading-none tracking-tighter text-white">{Math.round((score / questions.length) * 100)}</span><span className="text-6xl font-bold text-zinc-500">%</span></div>
              <div className="mb-6 mt-8 h-3 w-full overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-white" style={{ width: `${(score/questions.length)*100}%` }}/></div>
              <div className="flex justify-between font-mono text-xl tracking-widest text-zinc-500 uppercase"><span>{new Date().toLocaleDateString()}</span><span>AI Assessment</span></div>
           </div>
        </div>
      </div>

      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="z-10 w-full max-w-md">
        <Card className="rounded-[40px] border-2 border-black bg-white overflow-hidden text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <div className="relative bg-zinc-50 p-10 pb-8">
             <div className="absolute right-6 top-6 flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 shadow-sm text-zinc-400">
                <Timer size={14} /><span className="font-mono text-xs font-bold">{formatTime(studyTimeSeconds)}</span>
             </div>
             <div className="mx-auto mb-6 mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-black text-white shadow-2xl"><Trophy size={32} /></div>
             <h1 className="mb-1 text-3xl font-black tracking-tighter">Session Complete</h1>
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Analysis Report</p>
             <div className="mb-2 mt-4 text-8xl font-black tracking-tighter">{Math.round((score / questions.length) * 100)}%</div>
          </div>
          <div className="grid grid-cols-2 border-t-2 border-zinc-200 divide-x-2 divide-zinc-200">
             <div className="bg-white p-6"><div className="text-4xl font-black">{score}</div><div className="mt-1 text-[10px] font-black tracking-widest text-zinc-400 uppercase">Right</div></div>
             <div className="bg-white p-6"><div className="text-4xl font-black text-zinc-300">{questions.length - score}</div><div className="mt-1 text-[10px] font-black tracking-widest text-zinc-400 uppercase">Wrong</div></div>
          </div>
          <div className="space-y-3 bg-white p-6">
            <div className="grid grid-cols-2 gap-3">
               <Button onClick={generateShareImage} variant="outline" className="h-14 gap-2 rounded-xl border-2 border-zinc-200 text-[10px] font-bold transition-all uppercase hover:bg-zinc-50 hover:border-black"><ImageIcon size={16} /> Save Score</Button>
               <Button onClick={startFlashcards} variant="outline" className="h-14 gap-2 rounded-xl border-2 border-zinc-200 text-[10px] font-bold transition-all uppercase hover:bg-zinc-50 hover:border-black"><GalleryVerticalEnd size={16} /> Flashcards</Button>
            </div>
            <Button onClick={downloadPDF} variant="outline" className="h-14 w-full rounded-xl border-2 border-black text-xs font-bold tracking-wide transition-all uppercase hover:bg-zinc-50 hover:border-black"><Download size={16} className="mr-2" /> Download Report</Button>
            <Button onClick={restartQuiz} className="h-14 w-full rounded-xl bg-black text-xs font-bold tracking-wide text-white transition-transform active:scale-95 shadow-lg uppercase"> <RotateCcw size={16} className="mr-2" /> Retake Quiz</Button>
            <div className="pt-2"><Button onClick={() => window.location.reload()} variant="ghost" className="h-10 w-full rounded-xl text-[10px] font-bold text-zinc-400 transition-colors uppercase hover:text-black">Start New Session</Button></div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
