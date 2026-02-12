"use client";

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
  Clock,
  Trophy,
  ArrowRight,
  Download,
  RefreshCcw,
  HelpCircle,
  ChevronRight,
  Baby,
  Sparkles,
  GraduationCap,
  Zap,
  Brain,
  LayoutTemplate,
  Key,
  Settings2,
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

// --- TYPES ---
type Question = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  simple_explanation: string;
  type: "mcq" | "tf" | "fib";
};

type HistoryItem = {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
};

// --- UTILS ---
const vibrate = (pattern = [10]) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

// --- COMPONENTS ---
const NoiseOverlay = () => (
  <div
    className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 mix-blend-overlay"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    }}
  ></div>
);

const Logo = () => (
  <div className="flex items-center gap-3 select-none">
    <div className="relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-black rounded-xl shadow-xl shadow-black/20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-zinc-800 to-black"></div>
      <Sparkles className="relative z-10 text-white w-4 h-4 md:w-5 md:h-5" />
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

export default function Home() {
  const [view, setView] = useState<"HOME" | "QUIZ" | "RESULTS">("HOME");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [apiKey, setApiKey] = useState("");

  // Settings
  const [quizType, setQuizType] = useState("mix");
  const [difficulty, setDifficulty] = useState("normal");
  const [questionCount, setQuestionCount] = useState([5]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isMockMode, setIsMockMode] = useState(false);

  // Quiz Data
  const [subject, setSubject] = useState("General");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  // Interaction State
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [history, setHistory] = useState<(HistoryItem | null)[]>([]);
  const [showEli5, setShowEli5] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem("groq_api_key");
    if (storedKey) setApiKey(storedKey);
  }, []);

  // Keyboard Shortcuts (Desktop only)
  useEffect(() => {
    if (view === "QUIZ" && !isAnswered) {
      const handleKeyDown = (e: KeyboardEvent) => {
        const q = questions[currentQ];
        if (q?.type === "mcq" || q?.type === "tf") {
          const index = parseInt(e.key) - 1;
          if (!isNaN(index) && index >= 0 && index < q.options.length)
            handleAnswer(q.options[index]);
        }
        if (e.key === "Enter" && q?.type === "fib" && textAnswer)
          handleAnswer(textAnswer);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    } else if (view === "QUIZ" && isAnswered) {
      const handleNext = (e: KeyboardEvent) => {
        if (e.key === "Enter") nextQuestion();
      };
      window.addEventListener("keydown", handleNext);
      return () => window.removeEventListener("keydown", handleNext);
    }
  }, [view, isAnswered, currentQ, textAnswer, questions]);

  // Timer
  useEffect(() => {
    if (view === "QUIZ" && isMockMode && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && isMockMode && view === "QUIZ") finishQuiz();
  }, [timeLeft, view, isMockMode]);

  // --- ACTIONS ---

  const handleStart = async (file?: File) => {
    vibrate([20]);
    if (!apiKey) return toast.error("API Key required");
    localStorage.setItem("groq_api_key", apiKey);

    setIsLoading(true);
    setLoadingStep("Extracting...");

    const formData = new FormData();
    if (file) formData.append("file", file);
    if (youtubeUrl) formData.append("youtubeUrl", youtubeUrl);

    formData.append("apiKey", apiKey);
    formData.append("quizType", quizType);
    formData.append("difficulty", difficulty);
    formData.append("amount", questionCount[0].toString());

    try {
      setTimeout(() => setLoadingStep("Analyzing..."), 1500);
      setTimeout(() => setLoadingStep("Generating..."), 3000);

      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Generation failed");

      setQuestions(data.questions);
      setSubject(data.subject || "Session");
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
    if (isMockMode) setTimeLeft(count * 60);
  };

  const handleAnswer = (answer: string) => {
    vibrate([10]);

    // Prevent double answering in normal mode, but allow changing selection in Mock mode before submitting?
    // Actually simpler: In mock mode, selecting effectively "locks" it for this session step.
    if (isAnswered) return;

    const q = questions[currentQ];
    const isCorrect =
      answer.toLowerCase().trim() === q.answer.toLowerCase().trim();

    setSelectedOption(answer);

    // Update history
    setHistory((prev) => {
      const newHist = [...prev];
      newHist[currentQ] = {
        question: q.question,
        userAnswer: answer,
        correctAnswer: q.answer,
        explanation: q.explanation,
        isCorrect,
      };
      return newHist;
    });

    // Score update happens immediately but is hidden in Mock Mode
    if (isCorrect) setScore((s) => s + 1);

    // In Normal Mode -> Show feedback immediately
    // In Mock Mode -> Show "Selected" state immediately, require Next click
    setIsAnswered(true);

    // Play sound/confetti only in Normal mode
    if (!isMockMode && isCorrect) {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.8 },
        colors: ["#000000", "#555555"],
      });
    } else if (!isMockMode && !isCorrect) {
      vibrate([50, 50, 50]);
    }
  };

  const nextQuestion = () => {
    vibrate([10]);
    if (currentQ < questions.length - 1) {
      setCurrentQ((p) => p + 1);
      setIsAnswered(false);
      setShowEli5(false);
      setSelectedOption(null);
      setTextAnswer("");
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    setView("RESULTS");
    if (score / questions.length > 0.6) {
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ["#000000", "#333333", "#666666"],
        });
      }, 300);
    }
  };

  const downloadPDF = () => {
    vibrate([20]);
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
      30,
    );

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(`Final Score: ${score} / ${questions.length}`, 14, 55);

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
            className="w-16 h-16 border-4 border-zinc-100 border-t-black rounded-full mb-6"
          />
          <h2 className="text-lg font-black tracking-widest text-black uppercase">
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

        {/* Background Ambience */}
        <div className="fixed top-[-20%] left-[-10%] w-[80%] h-[50%] bg-zinc-200/40 rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-zinc-300/20 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-5xl z-10 grid lg:grid-cols-12 gap-8 p-6 pt-12 md:p-8"
        >
          {/* Branding Column - Stacks on top on mobile */}
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
                Upload documents. Get grilled by AI. <br />
                <span className="text-black font-bold">
                  Simple. Fast. Brutal.
                </span>
              </p>
            </div>

            <div className="hidden md:grid grid-cols-1 gap-3 pr-8">
              {/* Desktop Feature Pills */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-zinc-100 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center">
                  <Baby size={16} />
                </div>
                <div className="text-xs font-bold uppercase tracking-wide">
                  ELI5 Mode Included
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-zinc-100 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center">
                  <LayoutTemplate size={16} />
                </div>
                <div className="text-xs font-bold uppercase tracking-wide">
                  PDF Analysis
                </div>
              </div>
            </div>
          </div>

          {/* Controls Column */}
          <div className="lg:col-span-7 pb-10 md:pb-0">
            <Card className="border-0 shadow-2xl shadow-zinc-200 bg-white/80 backdrop-blur-xl rounded-[32px] p-1.5 md:p-2">
              <div className="border border-zinc-100 rounded-[28px] p-6 md:p-8 space-y-6 md:space-y-8 bg-white">
                {/* API Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                      Groq API Key
                    </label>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="text-[10px] font-bold text-black border-b border-dotted border-black">
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

                {/* Grid Settings */}
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
                    <Select value={quizType} onValueChange={setQuizType}>
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

                {/* Slider */}
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
                    className="py-2"
                  />
                </div>

                {/* Inputs */}
                <Tabs defaultValue="pdf" className="w-full">
                  <TabsList className="w-full bg-zinc-100 p-1 rounded-xl h-12 mb-4">
                    <TabsTrigger
                      value="pdf"
                      className="flex-1 rounded-lg text-[10px] md:text-xs font-bold uppercase h-10 data-[state=active]:bg-black data-[state=active]:text-white transition-all"
                    >
                      Document
                    </TabsTrigger>
                    <TabsTrigger
                      value="youtube"
                      className="flex-1 rounded-lg text-[10px] md:text-xs font-bold uppercase h-10 data-[state=active]:bg-black data-[state=active]:text-white transition-all"
                    >
                      YouTube
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
                        Upload PDF
                      </span>
                    </div>
                  </TabsContent>

                  <TabsContent value="youtube" className="mt-0 flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="YouTube URL..."
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
                </Tabs>

                {/* Mock Toggle - Improved UI */}
                <div
                  onClick={() => {
                    vibrate();
                    setIsMockMode(!isMockMode);
                  }}
                  className={`w-full p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] ${isMockMode ? "border-black bg-black text-white" : "border-zinc-100 bg-white text-black"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border ${isMockMode ? "border-zinc-700 bg-zinc-800" : "border-zinc-200 bg-zinc-50"}`}
                    >
                      <Settings2 size={16} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold uppercase tracking-wide">
                        Mock Exam Mode
                      </span>
                      <span
                        className={`text-[10px] ${isMockMode ? "text-zinc-400" : "text-zinc-400"}`}
                      >
                        Timer On • Feedback Off
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

        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.reload()}
            className="hover:bg-zinc-100 rounded-full h-8 w-8"
          >
            <X className="text-zinc-400 w-5 h-5" />
          </Button>
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
              {subject}
            </span>
            <div className="flex gap-1 mt-1">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${i === currentQ ? "w-6 bg-black" : "w-1.5 bg-zinc-200"} ${h ? (h.isCorrect ? "bg-black w-1.5" : "bg-zinc-300 w-1.5") : ""}`}
                />
              ))}
            </div>
          </div>
          {isMockMode ? (
            <div className="bg-black text-white px-2 py-1 rounded font-mono text-[10px] font-bold">
              {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? "0" : ""}
              {timeLeft % 60}
            </div>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {/* Question Area - Scrollable */}
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
                    onClick={() => handleAnswer(opt)}
                    disabled={isAnswered && !isMockMode}
                    className={`w-full text-left p-5 rounded-2xl text-base md:text-lg font-bold border-2 transition-all active:scale-[0.98] duration-200 group ${
                      isAnswered
                        ? isMockMode
                          ? selectedOption === opt
                            ? "bg-black text-white border-black"
                            : "bg-white border-zinc-100 opacity-50"
                          : opt === q.answer
                            ? "bg-black text-white border-black"
                            : selectedOption === opt
                              ? "bg-white border-zinc-200 text-zinc-300 line-through"
                              : "opacity-30 border-transparent"
                        : "bg-white border-zinc-100 hover:border-black"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`mt-0.5 min-w-[24px] h-6 rounded-md flex items-center justify-center text-[10px] font-bold border transition-colors ${
                          isAnswered
                            ? isMockMode && selectedOption === opt
                              ? "bg-white text-black"
                              : opt === q.answer
                                ? "bg-white text-black border-white"
                                : "bg-zinc-100 border-zinc-200 text-zinc-400"
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

        {/* Bottom Action Area (Sticky) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-zinc-100 p-6 z-30 pb-8 md:pb-6">
          <div className="max-w-xl mx-auto">
            {isAnswered ? (
              isMockMode ? (
                <Button
                  onClick={nextQuestion}
                  className="w-full h-14 rounded-2xl bg-black text-white font-bold text-lg shadow-lg active:scale-95 transition-transform"
                >
                  Next Question
                </Button>
              ) : (
                // Feedback Drawer Content
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
                        vibrate();
                        setShowEli5(!showEli5);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 cursor-pointer active:scale-95 transition"
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
                  <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 text-sm md:text-base text-zinc-700 leading-relaxed">
                    {showEli5 ? q.simple_explanation : q.explanation}
                  </div>
                  <Button
                    onClick={nextQuestion}
                    className="w-full h-14 rounded-2xl bg-black text-white font-bold tracking-wide shadow-lg active:scale-95 transition-transform text-lg"
                  >
                    Continue
                  </Button>
                </motion.div>
              )
            ) : (
              // Unanswered State (Only for FIB where button is needed)
              q.type === "fib" && (
                <Button
                  onClick={() => handleAnswer(textAnswer)}
                  disabled={!textAnswer}
                  className="w-full h-14 rounded-2xl bg-black text-white font-bold tracking-wide shadow-lg active:scale-95 transition-transform text-lg"
                >
                  Submit
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. RESULTS
  if (view === "RESULTS")
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center p-6 font-sans relative">
        <NoiseOverlay />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm z-10"
        >
          <Card className="border-2 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-white rounded-[40px] overflow-hidden text-center">
            <div className="p-10 pb-6 bg-zinc-50">
              <div className="w-20 h-20 mx-auto bg-black rounded-full flex items-center justify-center mb-6 shadow-2xl">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter mb-1">
                Session Complete
              </h1>
              <div className="text-8xl font-black tracking-tighter mt-4 mb-2">
                {Math.round((score / questions.length) * 100)}%
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x-2 divide-zinc-200 border-t-2 border-zinc-200">
              <div className="p-6 bg-white">
                <div className="text-3xl font-black">{score}</div>
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                  Right
                </div>
              </div>
              <div className="p-6 bg-white">
                <div className="text-3xl font-black text-zinc-300">
                  {questions.length - score}
                </div>
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                  Missed
                </div>
              </div>
            </div>

            <div className="p-8 space-y-4 bg-white">
              <Button
                onClick={downloadPDF}
                variant="outline"
                className="w-full h-14 rounded-xl border-2 border-black text-black font-bold tracking-wide hover:bg-zinc-50 uppercase text-xs"
              >
                <Download size={16} className="mr-2" /> Download PDF
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="w-full h-14 rounded-xl bg-black text-white font-bold tracking-wide shadow-lg hover:scale-105 transition-transform uppercase text-xs"
              >
                <RefreshCcw size={16} className="mr-2" /> New Session
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
}
