"use client";

/**
 * QUIZMASTER ONYX v13.0
 * -----------------------------------
 * - Added Zero-Shot Topic Generation Tab
 * - Preserved Telemetry, Audio, and Safety Engines
 * - Multi-modal payload handling (PDF, YT, Topic)
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  Check,
  X,
  FileText,
  Youtube,
  Trophy,
  ArrowRight,
  Download,
  RefreshCcw,
  HelpCircle,
  Baby,
  Sparkles,
  GraduationCap,
  Share2,
  GalleryVerticalEnd,
  RotateCcw,
  Key,
  Clock,
  Settings2,
  ImageIcon,
  Volume2,
  VolumeX,
  LogOut,
  AlertTriangle,
  Timer,
  Info,
  Brain,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import confetti from "canvas-confetti";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toPng } from "html-to-image";

// --- TYPES ---
type QuizType = "mcq" | "tf" | "fib" | "mix";
type Difficulty = "easy" | "normal" | "hard";

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

const playSound = (
  type: "click" | "success" | "error" | "flip" | "warning",
) => {
  if (typeof window === "undefined") return;

  if (!audioCtx) {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === "click") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  } else if (type === "success") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === "error") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === "warning") {
    osc.type = "square";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(150, now + 0.2);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === "flip") {
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
  <div
    className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 mix-blend-overlay"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    }}
  ></div>
);

const Logo = () => (
  <div className="flex items-center gap-3 select-none group">
    <div className="relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-black rounded-xl shadow-xl shadow-black/20 overflow-hidden transition-transform group-hover:scale-105">
      <div className="absolute inset-0 bg-gradient-to-tr from-zinc-800 to-black"></div>
      <Sparkles className="relative z-10 text-white w-4 h-4 md:w-5 md:h-5 group-hover:animate-pulse" />
    </div>
    <div className="flex flex-col leading-none">
      <span className="text-lg md:text-xl font-black tracking-tighter uppercase text-black">
        QuizMaster
      </span>
      <span className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-zinc-400">
        Onyx Edition
      </span>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export default function Home() {
  const [view, setView] = useState<"HOME" | "QUIZ" | "RESULTS" | "FLASHCARDS">(
    "HOME",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [apiKey, setApiKey] = useState("");

  // Configuration
  const [quizType, setQuizType] = useState<string>("mix");
  const [difficulty, setDifficulty] = useState<string>("normal");
  const [questionCount, setQuestionCount] = useState([5]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [topicInput, setTopicInput] = useState(""); // NEW: Topic Generation State
  const [isMockMode, setIsMockMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Quiz State
  const [subject, setSubject] = useState("General");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  // Telemetry
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [studyTimeSeconds, setStudyTimeSeconds] = useState<number>(0);

  // Interaction State
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [history, setHistory] = useState<(HistoryItem | null)[]>([]);
  const [showEli5, setShowEli5] = useState(false);

  // Safety State
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Flashcard State
  const [isFlipped, setIsFlipped] = useState(false);

  // Refs
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem("groq_api_key");
    if (storedKey) setApiKey(storedKey);
  }, []);

  // --- KEYBOARD LISTENERS ---

  // Quiz Keyboard Shortcuts
  useEffect(() => {
    if (view === "QUIZ" && !isAnswered && !showExitConfirm) {
      const handleKeyDown = (e: KeyboardEvent) => {
        const q = questions[currentQ];
        if (q?.type === "mcq" || q?.type === "tf") {
          const index = parseInt(e.key) - 1;
          if (!isNaN(index) && index >= 0 && index < q.options.length) {
            handleOptionSelect(q.options[index]);
          }
        }
        if (e.key === "Enter" && q?.type === "fib" && textAnswer)
          submitAnswer(textAnswer);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    } else if (view === "QUIZ" && isAnswered && !showExitConfirm) {
      const handleNext = (e: KeyboardEvent) => {
        if (e.key === "Enter") nextQuestion();
      };
      window.addEventListener("keydown", handleNext);
      return () => window.removeEventListener("keydown", handleNext);
    }
  }, [view, isAnswered, currentQ, textAnswer, questions, showExitConfirm]);

  // Flashcard Keyboard Shortcuts
  useEffect(() => {
    if (view === "FLASHCARDS") {
      const handleFlashcardKeys = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") {
          setIsFlipped(false);
          if (currentQ < questions.length - 1) setCurrentQ((c) => c + 1);
          else setView("RESULTS");
        }
        if (e.key === "ArrowLeft") {
          setIsFlipped(false);
          if (currentQ > 0) setCurrentQ((c) => c - 1);
        }
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          triggerFeedback("flip");
          setIsFlipped((f) => !f);
        }
        if (e.key === "Escape") {
          triggerFeedback("click");
          setView("RESULTS");
        }
      };
      window.addEventListener("keydown", handleFlashcardKeys);
      return () => window.removeEventListener("keydown", handleFlashcardKeys);
    }
  }, [view, currentQ, questions.length]);

  // Timer
  useEffect(() => {
    if (view === "QUIZ" && isMockMode && timeLeft > 0 && !showExitConfirm) {
      const timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && isMockMode && view === "QUIZ") finishQuiz();
  }, [timeLeft, view, isMockMode, showExitConfirm]);

  // Format Timer
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  // --- ACTIONS ---

  const triggerFeedback = (
    type: "click" | "success" | "error" | "flip" | "warning",
  ) => {
    if (soundEnabled) playSound(type);
    vibrate(type === "error" ? [50, 50] : [10]);
  };

  const handleStart = async (file?: File) => {
    triggerFeedback("click");
    if (!apiKey) return toast.error("API Key required");
    localStorage.setItem("groq_api_key", apiKey);

    setIsLoading(true);
    setLoadingStep("Connecting to AI...");

    const formData = new FormData();
    if (file) formData.append("file", file);
    else if (youtubeUrl) formData.append("youtubeUrl", youtubeUrl);
    else if (topicInput) formData.append("topic", topicInput); // NEW: Topic injection

    formData.append("apiKey", apiKey);
    formData.append("quizType", quizType);
    formData.append("difficulty", difficulty);
    formData.append("amount", questionCount[0].toString());

    try {
      setTimeout(() => setLoadingStep("Structuring Knowledge..."), 1500);
      setTimeout(() => setLoadingStep("Finalizing Assessment..."), 3000);

      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Generation failed");

      setQuestions(data.questions);
      setSubject(data.subject || topicInput || "Session");
      setHistory(new Array(data.questions.length).fill(null));

      setTimeout(() => {
        startQuiz(data.questions.length);
        setIsLoading(false);
      }, 500);
    } catch (err: any) {
      toast.error(err.message);
      setIsLoading(false);
    }
  };

  const startQuiz = (count: number) => {
    setView("QUIZ");
    setCurrentQ(0);
    setScore(0);
    setIsAnswered(false);
    setShowEli5(false);
    setSelectedOption(null);
    setTextAnswer("");
    setShowExitConfirm(false);
    setQuizStartTime(Date.now());
    if (isMockMode) setTimeLeft(count * 60);
  };

  const restartQuiz = () => {
    triggerFeedback("click");
    startQuiz(questions.length);
  };

  const startFlashcards = () => {
    triggerFeedback("click");
    setCurrentQ(0);
    setIsFlipped(false);
    setView("FLASHCARDS");
  };

  const confirmExit = () => {
    triggerFeedback("warning");
    setShowExitConfirm(true);
  };

  const executeExit = () => {
    triggerFeedback("click");
    setShowExitConfirm(false);
    setView("HOME");
  };

  const handleOptionSelect = (option: string) => {
    if (isAnswered && !isMockMode) return;

    triggerFeedback("click");
    setSelectedOption(option);

    if (!isMockMode) {
      submitAnswer(option);
    }
  };

  const submitAnswer = (finalAnswer: string | null) => {
    if (!finalAnswer) return;

    const q = questions[currentQ];
    const isCorrect =
      finalAnswer.toLowerCase().trim() === q.answer.toLowerCase().trim();

    setHistory((prev) => {
      const newHist = [...prev];
      newHist[currentQ] = {
        question: q.question,
        userAnswer: finalAnswer,
        correctAnswer: q.answer,
        explanation: q.explanation,
        isCorrect,
      };
      return newHist;
    });

    if (isCorrect) setScore((s) => s + 1);
    setIsAnswered(true);

    if (!isMockMode) {
      if (isCorrect) {
        triggerFeedback("success");
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#000000", "#555555"],
        });
      } else {
        triggerFeedback("error");
      }
    } else {
      triggerFeedback("click");
    }
  };

  const nextQuestion = () => {
    triggerFeedback("click");
    if (currentQ < questions.length - 1) {
      setCurrentQ((p) => p + 1);
      setIsAnswered(false);
      setShowEli5(false);
      setSelectedOption(null);
      setTextAnswer("");
      setIsFlipped(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    const endTime = Date.now();
    const elapsedSeconds = Math.floor((endTime - quizStartTime) / 1000);
    setStudyTimeSeconds(elapsedSeconds);

    setView("RESULTS");
    if (score / questions.length > 0.6) {
      setTimeout(() => {
        triggerFeedback("success");
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ["#000000", "#333333", "#666666"],
        });
      }, 300);
    }
  };

  // --- EXPORT TOOLS ---

  const generateShareImage = async () => {
    if (shareCardRef.current === null) return;
    triggerFeedback("click");

    try {
      const dataUrl = await toPng(shareCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#000000",
      });
      const link = document.createElement("a");
      link.download = `Onyx_Score_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Image Saved to Gallery");
    } catch (err) {
      console.error(err);
      toast.error("Could not generate image");
    }
  };

  const downloadPDF = () => {
    triggerFeedback("click");
    const doc = new jsPDF();
    const validHistory = history.filter((h): h is HistoryItem => h !== null);

    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 210, 45, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("QuizMaster Onyx", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(
      `Subject: ${subject} | Difficulty: ${difficulty.toUpperCase()}`,
      14,
      28,
    );
    doc.text(
      `Time Spent: ${formatTime(studyTimeSeconds)} | Date: ${new Date().toLocaleDateString()}`,
      14,
      34,
    );

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(`Final Score: ${score} / ${questions.length}`, 14, 60);

    const tableData = validHistory.map((h, i) => [
      i + 1,
      h.question,
      h.userAnswer,
      h.correctAnswer,
      h.isCorrect ? "PASS" : "FAIL",
    ]);

    // @ts-ignore
    autoTable(doc, {
      head: [["#", "Question", "Your Answer", "Correct", "Result"]],
      body: tableData,
      startY: 65,
      theme: "grid",
      headStyles: { fillColor: [0, 0, 0] },
      columnStyles: { 4: { fontStyle: "bold" } },
      didParseCell: (data: any) => {
        if (data.column.index === 4) {
          data.cell.styles.textColor =
            data.cell.raw === "PASS" ? [0, 150, 0] : [200, 0, 0];
        }
      },
    });

    doc.save(`QuizMaster_${subject}_Report.pdf`);
    toast.success("Report Downloaded");
  };

  // --- RENDERERS ---

  if (isLoading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white font-mono relative overflow-hidden">
        <NoiseOverlay />
        <div className="z-10 flex flex-col items-center text-center p-6">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: 360 }}
            transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
            className="w-20 h-20 border-4 border-zinc-100 border-t-black rounded-full mb-8 shadow-xl"
          />
          <h2 className="text-xl font-black tracking-tighter text-black uppercase animate-pulse">
            {loadingStep}
          </h2>
        </div>
      </div>
    );

  // 1. DASHBOARD
  if (view === "HOME")
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-black font-sans flex flex-col md:items-center md:justify-center relative overflow-x-hidden">
        <NoiseOverlay />
        <div className="fixed top-[-20%] left-[-10%] w-[80%] h-[50%] bg-zinc-200/40 rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-zinc-300/20 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-5xl z-10 grid lg:grid-cols-12 gap-8 p-6 pt-12 md:p-8"
        >
          <div className="lg:col-span-5 space-y-8 md:space-y-12">
            <Logo />
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9]">
                Train
                <br />
                Your
                <br />
                Brain.
              </h1>
              <p className="text-base md:text-lg font-medium text-zinc-500 max-w-xs leading-relaxed">
                Upload documents, paste links, or{" "}
                <span className="text-black font-bold">
                  generate from raw topics.
                </span>
              </p>
            </div>

            <div
              onClick={() => {
                triggerFeedback("click");
                setSoundEnabled(!soundEnabled);
              }}
              className="flex items-center gap-3 cursor-pointer opacity-50 hover:opacity-100 transition select-none w-fit"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="text-xs font-bold uppercase tracking-wide">
                Sound Effects {soundEnabled ? "On" : "Off"}
              </span>
            </div>
          </div>

          <div className="lg:col-span-7 pb-10 md:pb-0">
            <Card className="border-0 shadow-2xl shadow-zinc-200 bg-white/80 backdrop-blur-xl rounded-[32px] p-1.5 md:p-2">
              <div className="border border-zinc-100 rounded-[28px] p-6 md:p-8 space-y-6 md:space-y-8 bg-white">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                      Groq API Key
                    </label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="text-[10px] font-bold text-black border-b border-dotted border-black hover:text-zinc-600 transition-colors">
                          Get Key
                        </button>
                      </DialogTrigger>
                      <DialogContent className="font-sans max-w-sm rounded-2xl">
                        <DialogHeader>
                          <DialogTitle className="font-bold">
                            Groq Cloud (Free)
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <ol className="list-decimal list-inside space-y-3 text-sm font-medium">
                            <li>
                              Visit{" "}
                              <a
                                href="https://console.groq.com/keys"
                                target="_blank"
                                className="underline font-bold"
                              >
                                console.groq.com
                              </a>
                            </li>
                            <li>Login & Click "Create API Key"</li>
                            <li>
                              Paste the <code>gsk_...</code> key here.
                            </li>
                          </ol>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="relative group">
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="gsk_..."
                      className="bg-zinc-50 border-0 focus:ring-2 focus:ring-black rounded-xl h-14 font-mono text-base pl-12 shadow-inner transition-all placeholder:text-zinc-300"
                    />
                    <div className="absolute left-4 top-4 text-zinc-400">
                      <Key size={20} />
                    </div>
                    <div className="absolute right-4 top-4 text-green-500">
                      {apiKey.startsWith("gsk_") && <Check size={20} />}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                      Level
                    </label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger className="bg-zinc-50 border-0 h-12 rounded-xl font-bold text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                      Type
                    </label>
                    <Select
                      value={quizType}
                      onValueChange={(v) => setQuizType(v as string)}
                    >
                      <SelectTrigger className="bg-zinc-50 border-0 h-12 rounded-xl font-bold text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mix">Mixed</SelectItem>
                        <SelectItem value="mcq">MCQ</SelectItem>
                        <SelectItem value="tf">True/False</SelectItem>
                        <SelectItem value="fib">Blanks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      Questions
                    </label>
                    <span className="text-xl font-black">{questionCount}</span>
                  </div>
                  <Slider
                    value={questionCount}
                    onValueChange={setQuestionCount}
                    min={5}
                    max={15}
                    step={5}
                    className="py-2 cursor-pointer"
                  />
                </div>

                {/* NEW TAB STRUCTURE */}
                <Tabs defaultValue="pdf" className="w-full">
                  <TabsList className="w-full bg-zinc-100 p-1 rounded-xl h-12 mb-4 grid grid-cols-3">
                    <TabsTrigger
                      value="pdf"
                      className="rounded-lg text-[10px] md:text-xs font-bold uppercase h-10 data-[state=active]:bg-black data-[state=active]:text-white transition-all"
                    >
                      PDF
                    </TabsTrigger>
                    <TabsTrigger
                      value="youtube"
                      className="rounded-lg text-[10px] md:text-xs font-bold uppercase h-10 data-[state=active]:bg-black data-[state=active]:text-white transition-all"
                    >
                      YouTube
                    </TabsTrigger>
                    <TabsTrigger
                      value="topic"
                      className="rounded-lg text-[10px] md:text-xs font-bold uppercase h-10 data-[state=active]:bg-black data-[state=active]:text-white transition-all"
                    >
                      Topic
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pdf" className="mt-0">
                    <div className="relative border-2 border-dashed border-zinc-300 hover:border-black bg-zinc-50/50 hover:bg-white rounded-2xl h-28 flex flex-col items-center justify-center gap-2 transition-all group cursor-pointer active:scale-[0.98]">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleStart(e.target.files?.[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <FileText
                        size={24}
                        className="text-zinc-400 group-hover:text-black transition-colors"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 group-hover:text-black">
                        Upload Document
                      </span>
                    </div>
                  </TabsContent>

                  <TabsContent value="youtube" className="mt-0 flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Paste YouTube Link..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="h-14 rounded-xl bg-zinc-50 border-0 pl-10 font-medium text-sm"
                      />
                      <Youtube
                        className="absolute left-3 top-4 text-zinc-400"
                        size={20}
                      />
                    </div>
                    <Button
                      onClick={() => handleStart()}
                      disabled={!youtubeUrl}
                      className="h-14 w-14 rounded-xl bg-black text-white hover:scale-105 transition-transform"
                    >
                      <ArrowRight />
                    </Button>
                  </TabsContent>

                  <TabsContent value="topic" className="mt-0 flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="e.g. World War 2, React.js..."
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        className="h-14 rounded-xl bg-zinc-50 border-0 pl-10 font-medium text-sm"
                      />
                      <Brain
                        className="absolute left-3 top-4 text-zinc-400"
                        size={20}
                      />
                    </div>
                    <Button
                      onClick={() => handleStart()}
                      disabled={!topicInput}
                      className="h-14 w-14 rounded-xl bg-black text-white hover:scale-105 transition-transform"
                    >
                      <ArrowRight />
                    </Button>
                  </TabsContent>
                </Tabs>

                <div
                  onClick={() => {
                    triggerFeedback("click");
                    setIsMockMode(!isMockMode);
                  }}
                  className={`w-full p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] ${isMockMode ? "border-black bg-black text-white" : "border-zinc-100 bg-white text-black"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border ${isMockMode ? "border-zinc-700 bg-zinc-800" : "border-zinc-200 bg-zinc-50"}`}
                    >
                      {isMockMode ? (
                        <Clock size={16} />
                      ) : (
                        <Settings2 size={16} />
                      )}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold uppercase tracking-wide">
                        Mock Exam Mode
                      </span>
                      <span
                        className={`text-[10px] ${isMockMode ? "text-zinc-400" : "text-zinc-400"}`}
                      >
                        {isMockMode
                          ? "Timer Active • Feedback Hidden"
                          : "Feedback On • No Timer"}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isMockMode ? "border-white bg-white" : "border-zinc-300"}`}
                  >
                    {isMockMode && <Check size={12} className="text-black" />}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      </div>
    );

  // 2. QUIZ
  if (view === "QUIZ" && questions.length > 0) {
    const q = questions[currentQ];
    return (
      <div className="min-h-screen bg-white text-black flex flex-col font-sans relative overflow-x-hidden">
        <NoiseOverlay />

        {/* Safety Exit Modal */}
        <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <DialogContent className="sm:max-w-md font-sans rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-500">
                <AlertTriangle size={20} /> End Session?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-2">
              <p className="text-sm text-zinc-600 font-medium leading-relaxed">
                Are you sure you want to exit? Your current progress and score
                will be permanently lost.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl h-12 border-zinc-200 font-bold"
                  onClick={() => setShowExitConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 rounded-xl h-12 bg-red-500 hover:bg-red-600 text-white font-bold"
                  onClick={executeExit}
                >
                  Exit Quiz
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={confirmExit}
            className="hover:bg-zinc-100 rounded-full h-8 w-8 text-zinc-400 hover:text-black transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </Button>
          <div className="flex flex-col items-center flex-1 mx-4">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2 truncate max-w-[150px] md:max-w-[300px]">
              {subject}
            </span>
            <div className="flex gap-1 w-full max-w-[200px] justify-center">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === currentQ ? "flex-1 max-w-[32px] bg-black" : "w-2 bg-zinc-200"} ${h ? (h.isCorrect ? "bg-green-500 w-2" : "bg-red-500 w-2") : ""}`}
                />
              ))}
            </div>
          </div>
          {isMockMode ? (
            <div className="bg-black text-white px-2 py-1 rounded font-mono text-[10px] font-bold flex items-center gap-1">
              <Clock size={10} />
              {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? "0" : ""}
              {timeLeft % 60}
            </div>
          ) : (
            <div className="w-8" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 pb-40">
          <div className="max-w-xl mx-auto pt-4 md:pt-10">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight mb-8 md:mb-12">
              {q.question}
            </h2>

            <div className="space-y-3 md:space-y-4">
              {q.type === "fib" ? (
                <div className="space-y-6">
                  <Input
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Type answer..."
                    className="text-2xl p-6 rounded-none border-b-2 border-zinc-200 focus:border-black bg-transparent h-16 font-bold placeholder:text-zinc-300 shadow-none focus-visible:ring-0"
                    autoFocus
                  />
                </div>
              ) : (
                q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleOptionSelect(opt)}
                    disabled={isAnswered && !isMockMode}
                    className={`w-full text-left p-5 rounded-2xl text-base md:text-lg font-bold border-2 transition-all active:scale-[0.98] duration-200 group ${
                      isAnswered && !isMockMode
                        ? opt === q.answer
                          ? "bg-black text-white border-black"
                          : selectedOption === opt
                            ? "bg-white border-red-500 text-red-500"
                            : "bg-white border-zinc-100 opacity-50"
                        : selectedOption === opt
                          ? "bg-black text-white border-black"
                          : "bg-white border-zinc-100 hover:border-black"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`mt-0.5 min-w-[24px] h-6 rounded-md flex items-center justify-center text-[10px] font-bold border transition-colors ${
                          isAnswered && !isMockMode
                            ? opt === q.answer
                              ? "bg-white text-black border-white"
                              : selectedOption === opt
                                ? "bg-red-100 border-red-500 text-red-500"
                                : "bg-zinc-100 border-zinc-200 text-zinc-400"
                            : selectedOption === opt
                              ? "bg-white text-black border-white"
                              : "bg-zinc-50 border-zinc-200 text-zinc-400 group-hover:bg-black group-hover:text-white group-hover:border-black"
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="leading-snug">{opt}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Sticky Action Area */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-zinc-100 p-6 z-30 pb-8 md:pb-6 safe-area-pb">
          <div className="max-w-xl mx-auto">
            {isAnswered && !isMockMode ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div
                    className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${selectedOption === q.answer || textAnswer.toLowerCase() === q.answer.toLowerCase() ? "text-black" : "text-zinc-400"}`}
                  >
                    {selectedOption === q.answer ||
                    textAnswer.toLowerCase() === q.answer.toLowerCase() ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <X className="w-5 h-5" />
                    )}
                    {selectedOption === q.answer ||
                    textAnswer.toLowerCase() === q.answer.toLowerCase()
                      ? "Correct"
                      : "Incorrect"}
                  </div>
                  <div
                    onClick={() => {
                      triggerFeedback("click");
                      setShowEli5(!showEli5);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 cursor-pointer active:scale-95 transition select-none"
                  >
                    <Baby
                      size={14}
                      className={showEli5 ? "text-black" : "text-zinc-400"}
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      ELI5
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 text-sm md:text-base text-zinc-700 leading-relaxed max-h-[200px] overflow-y-auto">
                  {showEli5 ? q.simple_explanation : q.explanation}
                </div>
                <Button
                  onClick={nextQuestion}
                  className="w-full h-14 rounded-2xl bg-black text-white font-bold tracking-wide shadow-lg active:scale-95 transition-transform text-lg"
                >
                  Continue
                </Button>
              </motion.div>
            ) : (
              <Button
                onClick={() =>
                  isMockMode && isAnswered
                    ? nextQuestion()
                    : submitAnswer(isMockMode ? selectedOption : textAnswer)
                }
                disabled={!selectedOption && !textAnswer && !isAnswered}
                className="w-full h-14 rounded-2xl bg-black text-white font-bold tracking-wide shadow-lg active:scale-95 transition-transform text-lg"
              >
                {isMockMode && isAnswered ? "Next Question" : "Submit Answer"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. FLASHCARDS
  if (view === "FLASHCARDS" && questions.length > 0) {
    const q = questions[currentQ];
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex flex-col font-sans p-6 overflow-hidden select-none">
        <div className="flex justify-between items-center mb-10 z-10">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/20 rounded-full flex items-center gap-2 px-4"
            onClick={() => {
              triggerFeedback("click");
              setView("RESULTS");
            }}
          >
            <LogOut size={16} />{" "}
            <span className="text-xs font-bold uppercase tracking-widest hidden md:inline-block">
              Exit
            </span>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full ${i === currentQ ? "w-4 bg-white" : "w-1 bg-zinc-700"}`}
                />
              ))}
            </div>
            <span className="font-bold text-zinc-500 tracking-widest text-xs w-8 text-right">
              {currentQ + 1}/{questions.length}
            </span>
          </div>
        </div>

        <div
          className="flex-1 flex flex-col items-center justify-center relative"
          style={{ perspective: "1500px" }}
        >
          <motion.div
            className="w-full max-w-sm aspect-[3/4] relative cursor-pointer group"
            onClick={() => {
              triggerFeedback("flip");
              setIsFlipped(!isFlipped);
            }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{
              duration: 0.6,
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* FRONT */}
            <div
              className="absolute inset-0 bg-black border border-zinc-700 rounded-[32px] p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-colors group-hover:border-zinc-500"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              <span className="text-zinc-500 font-black uppercase tracking-widest text-[10px] mb-6 tracking-[0.2em]">
                Question
              </span>
              <h2 className="text-2xl md:text-3xl font-bold leading-relaxed">
                {q.question}
              </h2>
              <div className="absolute bottom-8 flex flex-col items-center gap-2 animate-pulse">
                <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                  Tap or Space to Reveal
                </span>
              </div>
            </div>

            {/* BACK */}
            <div
              className="absolute inset-0 bg-white text-black rounded-[32px] p-8 flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <span className="text-zinc-400 font-black uppercase tracking-widest text-[10px] mb-6 tracking-[0.2em]">
                Answer
              </span>
              <div className="w-full h-full flex flex-col items-center justify-center overflow-y-auto no-scrollbar">
                <h2 className="text-3xl font-black leading-tight mb-6">
                  {q.answer}
                </h2>
                <p className="text-sm text-zinc-600 font-medium leading-relaxed">
                  {q.simple_explanation}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex justify-between items-center mt-12 px-4 max-w-sm mx-auto w-full z-10">
          <button
            onClick={() => {
              triggerFeedback("click");
              setIsFlipped(false);
              if (currentQ > 0) setCurrentQ((c) => c - 1);
            }}
            disabled={currentQ === 0}
            className="bg-transparent border-2 border-zinc-700 text-white hover:bg-white hover:text-black disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white rounded-full h-16 w-16 flex items-center justify-center transition-colors active:scale-95"
          >
            <ArrowRight className="rotate-180" size={24} />
          </button>

          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest hidden md:block">
            Use Arrow Keys
          </span>

          <button
            onClick={() => {
              triggerFeedback("click");
              setIsFlipped(false);
              if (currentQ < questions.length - 1) setCurrentQ((c) => c + 1);
              else setView("RESULTS");
            }}
            className="bg-transparent border-2 border-zinc-700 text-white hover:bg-white hover:text-black rounded-full h-16 w-16 flex items-center justify-center transition-colors active:scale-95"
          >
            {currentQ === questions.length - 1 ? (
              <Check size={24} />
            ) : (
              <ArrowRight size={24} />
            )}
          </button>
        </div>
      </div>
    );
  }

  // 4. RESULTS
  if (view === "RESULTS")
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center p-6 font-sans relative overflow-x-hidden">
        <NoiseOverlay />

        {/* Hidden Share Card Render Target */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: -50,
            opacity: 0,
            pointerEvents: "none",
          }}
        >
          <div
            ref={shareCardRef}
            className="w-[600px] h-[800px] bg-black text-white p-12 flex flex-col justify-between font-sans relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 to-black z-0" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-white p-2 rounded-lg">
                  <Sparkles className="text-black w-8 h-8" />
                </div>
                <span className="text-3xl font-black uppercase tracking-tighter">
                  QuizMaster Onyx
                </span>
              </div>
              <h1 className="text-5xl font-bold leading-tight mb-4 text-zinc-100">
                {subject}
              </h1>
              <div className="inline-block bg-zinc-800 border border-zinc-700 px-6 py-2 rounded-full text-lg font-bold uppercase tracking-wide text-zinc-300">
                {difficulty} Mode
              </div>
            </div>

            <div className="relative z-10 w-full">
              <div className="flex items-baseline gap-2">
                <span className="text-[180px] font-black leading-none tracking-tighter text-white">
                  {Math.round((score / questions.length) * 100)}
                </span>
                <span className="text-6xl font-bold text-zinc-500">%</span>
              </div>
              <div className="w-full h-3 bg-zinc-800 mt-8 mb-6 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{ width: `${(score / questions.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-zinc-500 font-mono text-xl uppercase tracking-widest">
                <span>{new Date().toLocaleDateString()}</span>
                <span>AI Generated Assessment</span>
              </div>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md z-10"
        >
          <Card className="border-2 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-white rounded-[40px] overflow-hidden text-center">
            <div className="p-10 pb-8 bg-zinc-50 relative">
              <div className="absolute top-6 right-6 flex items-center gap-2 text-zinc-400 bg-white px-3 py-1.5 rounded-full border border-zinc-200 shadow-sm">
                <Timer size={14} />
                <span className="font-mono text-xs font-bold">
                  {formatTime(studyTimeSeconds)}
                </span>
              </div>

              <div className="w-20 h-20 mx-auto bg-black rounded-full flex items-center justify-center mb-6 shadow-2xl mt-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter mb-1">
                Session Complete
              </h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Analysis Report
              </p>
              <div className="text-8xl font-black tracking-tighter mt-4 mb-2">
                {Math.round((score / questions.length) * 100)}%
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x-2 divide-zinc-200 border-t-2 border-zinc-200">
              <div className="p-6 bg-white">
                <div className="text-4xl font-black">{score}</div>
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                  Right
                </div>
              </div>
              <div className="p-6 bg-white">
                <div className="text-4xl font-black text-zinc-300">
                  {questions.length - score}
                </div>
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                  Missed
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3 bg-white">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={generateShareImage}
                  variant="outline"
                  className="h-14 rounded-xl border-2 border-zinc-200 hover:border-black hover:bg-zinc-50 text-black font-bold uppercase text-[10px] gap-2 transition-all"
                >
                  <ImageIcon size={16} /> Save Score
                </Button>
                <Button
                  onClick={startFlashcards}
                  variant="outline"
                  className="h-14 rounded-xl border-2 border-zinc-200 hover:border-black hover:bg-zinc-50 text-black font-bold uppercase text-[10px] gap-2 transition-all"
                >
                  <GalleryVerticalEnd size={16} /> Flashcards
                </Button>
              </div>

              <Button
                onClick={downloadPDF}
                variant="outline"
                className="w-full h-14 rounded-xl border-2 border-black text-black font-bold tracking-wide hover:bg-zinc-50 uppercase text-xs transition-all"
              >
                <Download size={16} className="mr-2" /> Download Report
              </Button>

              <Button
                onClick={restartQuiz}
                className="w-full h-14 rounded-xl bg-black text-white font-bold tracking-wide shadow-lg active:scale-95 transition-transform uppercase text-xs"
              >
                <RotateCcw size={16} className="mr-2" /> Retake Quiz (Drill)
              </Button>

              <div className="pt-2">
                <Button
                  onClick={() => window.location.reload()}
                  variant="ghost"
                  className="w-full h-10 rounded-xl text-zinc-400 hover:text-black font-bold uppercase text-[10px] transition-colors"
                >
                  Start New Session
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    );
}
