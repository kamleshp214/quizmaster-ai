"use client";

import { useState, useEffect } from "react";
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
    <div className="relative w-10 h-10 flex items-center justify-center bg-black rounded-xl shadow-xl shadow-black/20 overflow-hidden group cursor-pointer">
      <div className="absolute inset-0 bg-gradient-to-tr from-zinc-800 to-black group-hover:scale-110 transition-transform duration-500"></div>
      <Sparkles className="relative z-10 text-white w-5 h-5" />
    </div>
    <div className="flex flex-col leading-none">
      <span className="text-xl font-black tracking-tighter uppercase text-black">
        QuizMaster
      </span>
      <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">
        Onyx Edition
      </span>
    </div>
  </div>
);

// Feature Teaser Card Component
const FeaturePill = ({
  icon: Icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) => (
  <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-zinc-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
    <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center border border-zinc-100 shrink-0">
      <Icon size={18} className="text-black" />
    </div>
    <div>
      <h3 className="text-xs font-black uppercase tracking-wide text-black mb-1">
        {title}
      </h3>
      <p className="text-[11px] text-zinc-500 font-medium leading-tight">
        {desc}
      </p>
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

  // Keyboard Shortcuts
  useEffect(() => {
    if (view === "QUIZ" && !isAnswered) {
      const handleKeyDown = (e: KeyboardEvent) => {
        const q = questions[currentQ];
        if (q?.type === "mcq" || q?.type === "tf") {
          const index = parseInt(e.key) - 1;
          if (!isNaN(index) && index >= 0 && index < q.options.length) {
            handleAnswer(q.options[index]);
          }
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
    setLoadingStep("Reading Content...");

    const formData = new FormData();
    if (file) formData.append("file", file);
    if (youtubeUrl) formData.append("youtubeUrl", youtubeUrl);

    formData.append("apiKey", apiKey);
    formData.append("quizType", quizType);
    formData.append("difficulty", difficulty);
    formData.append("amount", questionCount[0].toString());

    try {
      setTimeout(() => setLoadingStep("Consulting Llama 3..."), 1500);
      setTimeout(() => setLoadingStep("Crafting Questions..."), 3000);

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
    if (isAnswered && !isMockMode) return;

    const q = questions[currentQ];
    const isCorrect =
      answer.toLowerCase().trim() === q.answer.toLowerCase().trim();

    setSelectedOption(answer);

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

    if (isCorrect) {
      setScore((s) => s + 1);
      if (!isMockMode)
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.8 },
          colors: ["#000000", "#555555"],
        });
    } else {
      if (!isMockMode) vibrate([50, 50, 50]);
    }

    if (!isMockMode) setIsAnswered(true);
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
    doc.setFont("helvetica", "bold");
    doc.text("QuizMaster Onyx", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(`Subject: ${subject}`, 14, 28);
    doc.text(
      `Difficulty: ${difficulty.toUpperCase()} | Date: ${new Date().toLocaleDateString()}`,
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
      startY: 70,
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
        <div className="z-10 flex flex-col items-center text-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: 360 }}
            transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
            className="w-20 h-20 border-4 border-zinc-100 border-t-black rounded-full mb-8"
          />
          <h2 className="text-xl font-black tracking-tight text-black uppercase">
            {loadingStep}
          </h2>
          <p className="text-zinc-400 text-xs font-bold tracking-widest mt-2">
            AI IS THINKING
          </p>
        </div>
      </div>
    );

  // 1. DASHBOARD
  if (view === "HOME")
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-black p-4 font-sans flex flex-col items-center justify-center relative overflow-hidden">
        <NoiseOverlay />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-zinc-200/50 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-zinc-300/30 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-6xl z-10 grid md:grid-cols-12 gap-12 items-center"
        >
          {/* Branding Column */}
          <div className="md:col-span-5 space-y-12">
            <Logo />
            <div className="space-y-6">
              <h1 className="text-6xl md:text-7xl font-black tracking-tighter leading-[0.85]">
                Train
                <br />
                Your
                <br />
                Brain.
              </h1>
              <p className="text-lg font-medium text-zinc-500 max-w-xs leading-relaxed">
                Transform passive reading into active mastery with Adaptive AI.
              </p>
            </div>

            {/* FEATURE TEASERS (Bento Style) */}
            <div className="grid grid-cols-1 gap-3 pr-8">
              <FeaturePill
                icon={Baby}
                title="Explain like I'm 5 Mode"
                desc="Toggle between Academic & Simplified explanations instantly."
              />
              <FeaturePill
                icon={LayoutTemplate}
                title="PDF Reporting"
                desc="Export university-grade analysis of your weak points."
              />
              <FeaturePill
                icon={Zap}
                title="Groq Engine"
                desc="Sub-second question generation using Llama 3."
              />
            </div>
          </div>

          {/* Controls Column */}
          <div className="md:col-span-7">
            <Card className="border-0 shadow-2xl shadow-zinc-200 bg-white/60 backdrop-blur-xl rounded-[40px] p-2">
              <div className="border border-zinc-100 rounded-[32px] p-6 md:p-8 space-y-8 bg-white/80">
                {/* API Input */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                      Groq API Key
                    </label>

                    {/* Better API Guide Dialog */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="text-[10px] font-bold text-black border-b border-dotted border-black hover:text-zinc-600 transition-colors">
                          Where do I get this?
                        </button>
                      </DialogTrigger>
                      <DialogContent className="font-sans sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="font-bold">
                            Setup Guide
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 text-sm text-zinc-600 mb-4">
                            This app uses the <strong>Groq Cloud</strong> to run
                            AI models for free.
                          </div>
                          <ol className="list-decimal list-inside space-y-3 text-sm font-medium">
                            <li>
                              Go to{" "}
                              <a
                                href="https://console.groq.com/keys"
                                target="_blank"
                                className="underline font-bold"
                              >
                                console.groq.com/keys
                              </a>
                            </li>
                            <li>Login with your Google Account.</li>
                            <li>Click "Create API Key".</li>
                            <li>
                              Copy the code starting with <code>gsk_</code> and
                              paste it below.
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
                      className="bg-zinc-50 border-0 focus:ring-2 focus:ring-black rounded-xl h-14 font-mono text-sm pl-12 shadow-inner transition-all"
                    />
                    <div className="absolute left-4 top-4 text-zinc-400">
                      <Key size={18} />
                    </div>
                    <div className="absolute right-4 top-4 text-green-500">
                      {apiKey.startsWith("gsk_") && <Check size={18} />}
                    </div>
                  </div>
                </div>

                {/* Grid Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                      Complexity
                    </label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger className="bg-zinc-50 border-0 h-14 rounded-xl font-bold">
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
                      Format
                    </label>
                    <Select value={quizType} onValueChange={setQuizType}>
                      <SelectTrigger className="bg-zinc-50 border-0 h-14 rounded-xl font-bold">
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
                <div className="space-y-4 bg-zinc-50 p-5 rounded-2xl border border-zinc-100">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      Questions
                    </label>
                    <span className="text-2xl font-black">{questionCount}</span>
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
                  <TabsList className="w-full bg-zinc-100 p-1 rounded-xl h-14 mb-4">
                    <TabsTrigger
                      value="pdf"
                      className="flex-1 rounded-lg text-xs font-bold uppercase h-12 data-[state=active]:bg-black data-[state=active]:text-white transition-all"
                    >
                      Document
                    </TabsTrigger>
                    <TabsTrigger
                      value="youtube"
                      className="flex-1 rounded-lg text-xs font-bold uppercase h-12 data-[state=active]:bg-black data-[state=active]:text-white transition-all"
                    >
                      YouTube
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pdf" className="mt-0">
                    <div className="relative border-2 border-dashed border-zinc-300 hover:border-black bg-zinc-50/50 hover:bg-white rounded-2xl h-32 flex flex-col items-center justify-center gap-3 transition-all group cursor-pointer active:scale-[0.98]">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleStart(e.target.files?.[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-12 h-12 bg-white shadow-sm rounded-full flex items-center justify-center group-hover:scale-110 transition duration-300 border border-zinc-100">
                        <FileText size={24} className="text-zinc-600" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wide text-zinc-500 group-hover:text-black">
                        Drop PDF File
                      </span>
                    </div>
                  </TabsContent>

                  <TabsContent value="youtube" className="mt-0 flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Paste YouTube URL..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="h-16 rounded-xl bg-zinc-50 border-0 pl-12 font-medium"
                      />
                      <Youtube className="absolute left-4 top-5 text-zinc-400" />
                    </div>
                    <Button
                      onClick={() => handleStart()}
                      disabled={!youtubeUrl}
                      className="h-16 w-16 rounded-xl bg-black text-white hover:scale-105 transition-transform"
                    >
                      <ArrowRight />
                    </Button>
                  </TabsContent>
                </Tabs>

                <div
                  onClick={() => {
                    vibrate();
                    setIsMockMode(!isMockMode);
                  }}
                  className="flex items-center justify-center gap-2 cursor-pointer py-2 opacity-60 hover:opacity-100 transition"
                >
                  <div
                    className={`w-5 h-5 rounded border-2 border-black flex items-center justify-center transition-colors ${isMockMode ? "bg-black" : "bg-white"}`}
                  >
                    {isMockMode && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-black">
                    Enable Mock Exam
                  </span>
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
      <div className="min-h-screen bg-white text-black flex flex-col p-6 font-sans relative overflow-x-hidden">
        <NoiseOverlay />

        <div className="w-full max-w-2xl mx-auto mb-8 flex items-center justify-between z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.reload()}
            className="hover:bg-zinc-100 rounded-full"
          >
            <X className="text-zinc-400" />
          </Button>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
              {subject}
            </span>
            <div className="flex gap-1">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${i === currentQ ? "w-8 bg-black" : "w-2 bg-zinc-200"} ${h ? (h.isCorrect ? "bg-green-500 w-2" : "bg-red-500 w-2") : ""}`}
                />
              ))}
            </div>
          </div>
          {isMockMode ? (
            <div className="bg-black text-white px-3 py-1 rounded-full font-mono text-xs font-bold">
              {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? "0" : ""}
              {timeLeft % 60}
            </div>
          ) : (
            <div className="w-10" />
          )}
        </div>

        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="flex-1 flex flex-col max-w-2xl mx-auto w-full z-10 pb-24"
        >
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight mb-8 md:mb-12">
              {q.question}
            </h2>

            <div className="space-y-4">
              {q.type === "fib" ? (
                <div className="space-y-6">
                  <Input
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    className="text-3xl p-8 rounded-none border-b-4 border-zinc-100 focus:border-black bg-transparent h-24 text-center font-bold placeholder:text-zinc-200"
                    autoFocus
                  />
                  <Button
                    onClick={() => handleAnswer(textAnswer)}
                    disabled={!textAnswer}
                    className="w-full h-16 rounded-2xl bg-black text-white font-bold tracking-wide shadow-xl active:scale-95 transition-transform text-lg"
                  >
                    SUBMIT ANSWER
                  </Button>
                </div>
              ) : (
                q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    disabled={isAnswered && !isMockMode}
                    className={`w-full text-left p-6 rounded-2xl text-lg font-bold border-2 transition-all active:scale-95 duration-200 group ${
                      isAnswered
                        ? opt === q.answer
                          ? "bg-black text-white border-black"
                          : selectedOption === opt
                            ? "bg-white border-zinc-200 text-zinc-300 line-through"
                            : "opacity-30 border-transparent"
                        : "bg-white border-zinc-100 hover:border-black hover:shadow-lg"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors ${
                          isAnswered
                            ? opt === q.answer
                              ? "bg-white text-black border-white"
                              : "bg-zinc-100 border-zinc-200 text-zinc-400"
                            : "bg-zinc-50 border-zinc-200 text-zinc-400 group-hover:bg-black group-hover:text-white group-hover:border-black"
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span>{opt}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {!isMockMode && isAnswered && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black p-6 md:p-8 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-[32px]"
            >
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                  <div
                    className={`text-lg font-black uppercase tracking-wider flex items-center gap-2 ${selectedOption === q.answer || textAnswer.toLowerCase() === q.answer.toLowerCase() ? "text-black" : "text-zinc-400"}`}
                  >
                    {selectedOption === q.answer ||
                    textAnswer.toLowerCase() === q.answer.toLowerCase() ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <X className="w-6 h-6" />
                    )}
                    {selectedOption === q.answer ||
                    textAnswer.toLowerCase() === q.answer.toLowerCase()
                      ? "Correct"
                      : "Incorrect"}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      ELI5
                    </span>
                    <div
                      onClick={() => {
                        vibrate();
                        setShowEli5(!showEli5);
                      }}
                      className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${showEli5 ? "bg-black" : "bg-zinc-200"}`}
                    >
                      <motion.div
                        layout
                        className="w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                  <p className="text-zinc-800 font-medium leading-relaxed text-lg">
                    {showEli5 ? (
                      <span className="flex gap-2">
                        <Baby className="shrink-0 text-zinc-400" />{" "}
                        {q.simple_explanation}
                      </span>
                    ) : (
                      <span className="flex gap-2">
                        <GraduationCap className="shrink-0 text-zinc-400" />{" "}
                        {q.explanation}
                      </span>
                    )}
                  </p>
                </div>

                <Button
                  onClick={nextQuestion}
                  className="w-full h-16 rounded-2xl bg-black text-white font-bold tracking-wide shadow-xl active:scale-95 transition-transform text-lg"
                >
                  Next Question <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isMockMode && (
          <div className="fixed bottom-8 left-0 right-0 px-8 max-w-2xl mx-auto">
            <Button
              onClick={nextQuestion}
              className="w-full h-16 rounded-2xl bg-black text-white font-bold text-lg shadow-xl"
            >
              Next
            </Button>
          </div>
        )}
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
              <div className="w-24 h-24 mx-auto bg-black rounded-full flex items-center justify-center mb-6 shadow-2xl">
                <Trophy className="w-10 h-10 text-white" />
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
                  Correct
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
