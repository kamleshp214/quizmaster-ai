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
  Terminal,
  HelpCircle,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// --- TYPES ---
type Question = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  type: "mcq" | "tf" | "fib";
};

type HistoryItem = {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
};

export default function Home() {
  const [view, setView] = useState<"HOME" | "QUIZ" | "RESULTS">("HOME");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");

  // Settings
  const [quizType, setQuizType] = useState("mix");
  const [questionCount, setQuestionCount] = useState([5]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isMockMode, setIsMockMode] = useState(false);

  // Quiz State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  // Answers State
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [history, setHistory] = useState<(HistoryItem | null)[]>([]);

  useEffect(() => {
    const storedKey = localStorage.getItem("groq_api_key");
    if (storedKey) setApiKey(storedKey);
  }, []);

  // Timer Logic
  useEffect(() => {
    if (view === "QUIZ" && isMockMode && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && isMockMode && view === "QUIZ") {
      finishQuiz();
    }
  }, [timeLeft, view, isMockMode]);

  const handleStart = async (file?: File) => {
    if (!apiKey) return toast.error("API Key required");
    localStorage.setItem("groq_api_key", apiKey);

    setIsLoading(true);
    const formData = new FormData();
    if (file) formData.append("file", file);
    if (youtubeUrl) formData.append("youtubeUrl", youtubeUrl);

    formData.append("apiKey", apiKey);
    formData.append("quizType", quizType);
    formData.append("amount", questionCount[0].toString());

    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (!data.questions || data.questions.length === 0)
        throw new Error("No questions generated");

      setQuestions(data.questions);
      setHistory(new Array(data.questions.length).fill(null));
      startQuiz(data.questions.length);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startQuiz = (count: number) => {
    setView("QUIZ");
    setCurrentQ(0);
    setScore(0);
    setIsAnswered(false);
    setSelectedOption(null);
    setTextAnswer("");
    if (isMockMode) setTimeLeft(count * 60);
  };

  const handleAnswer = (answer: string) => {
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

    if (!isMockMode) {
      if (isCorrect) setScore((s) => s + 1);
      setIsAnswered(true);
    } else {
      if (isCorrect) setScore((s) => s + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((p) => p + 1);
      setIsAnswered(false);
      setSelectedOption(null);
      setTextAnswer("");
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    setView("RESULTS");
  };

  const downloadResults = () => {
    const validHistory = history.filter((h): h is HistoryItem => h !== null);
    if (validHistory.length === 0) {
      toast.error("No answers to download yet!");
      return;
    }

    const content = validHistory
      .map(
        (h, i) =>
          `Q${i + 1}: ${h.question}\nYour Answer: ${h.userAnswer}\nCorrect: ${h.correctAnswer}\nResult: ${h.isCorrect ? "PASS" : "FAIL"}\nExplanation: ${h.explanation}\n\n`,
      )
      .join("");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "QuizMaster_Results.txt";
    a.click();
  };

  // --- RENDERERS ---

  if (isLoading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 relative overflow-hidden font-mono">
        <div className="flex flex-col items-center z-10">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-6"
          >
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </motion.div>
          <h2 className="text-xl font-bold tracking-tight text-black">
            PROCESSING...
          </h2>
          <p className="text-zinc-500 text-sm mt-2">Analyzing Text Patterns</p>
        </div>
      </div>
    );

  // 1. HOME SCREEN
  if (view === "HOME")
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-black flex items-center justify-center p-4 font-sans selection:bg-black selection:text-white">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl"
        >
          <div className="grid md:grid-cols-12 gap-8">
            {/* Left: Headline */}
            <div className="md:col-span-5 flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-black/10 bg-white shadow-sm w-fit">
                  <Terminal size={12} className="text-black" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">
                    QuizMaster v2.0
                  </span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
                  Study
                  <br />
                  Smarter.
                </h1>
                <p className="text-zinc-500 font-medium leading-relaxed">
                  Turn PDFs and YouTube videos into strict, exam-style quizzes
                  instantly.
                </p>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-fit gap-2 border-black/10 hover:bg-zinc-100 rounded-full h-10 px-4 text-xs font-bold uppercase tracking-wide"
                  >
                    <HelpCircle size={14} /> How to get API Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Get your Free Groq API Key</DialogTitle>
                    <DialogDescription>
                      Groq provides the fastest AI inference for free
                      (currently).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 text-sm">
                    <ol className="list-decimal list-inside space-y-2 text-zinc-600">
                      <li>
                        Go to{" "}
                        <a
                          href="https://console.groq.com/keys"
                          target="_blank"
                          className="underline text-black font-bold"
                        >
                          console.groq.com/keys
                        </a>
                      </li>
                      <li>Login with Google or GitHub.</li>
                      <li>
                        Click <strong>Create API Key</strong>.
                      </li>
                      <li>
                        Copy the key starting with <code>gsk_...</code>
                      </li>
                      <li>Paste it into the app below.</li>
                    </ol>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Right: Interface */}
            <div className="md:col-span-7">
              <Card className="border-0 shadow-2xl shadow-zinc-200 bg-white rounded-[32px] p-2">
                <div className="border border-zinc-100 rounded-[28px] p-6 md:p-8 space-y-8">
                  {/* API Key */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                      Groq API Key
                    </label>
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="gsk_..."
                      className="bg-zinc-50 border-transparent focus:border-black focus:ring-0 rounded-xl h-12 font-mono text-sm"
                    />
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                        Length
                      </label>
                      <div className="bg-zinc-50 rounded-xl p-3 border border-transparent hover:border-zinc-200 transition-colors">
                        <div className="flex justify-between mb-2">
                          <span className="text-xs font-bold">
                            {questionCount} Qs
                          </span>
                        </div>
                        <Slider
                          value={questionCount}
                          onValueChange={setQuestionCount}
                          min={5}
                          max={15}
                          step={5}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                        Mode
                      </label>
                      <Select value={quizType} onValueChange={setQuizType}>
                        <SelectTrigger className="bg-zinc-50 border-transparent focus:ring-0 rounded-xl h-[70px] font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-zinc-100 shadow-xl font-medium">
                          <SelectItem value="mix">Mixed</SelectItem>
                          <SelectItem value="mcq">MCQ</SelectItem>
                          <SelectItem value="tf">True / False</SelectItem>
                          <SelectItem value="fib">Blanks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Input Tabs */}
                  <Tabs defaultValue="pdf" className="w-full">
                    <TabsList className="w-full bg-zinc-100 p-1 rounded-xl mb-4 h-12">
                      <TabsTrigger
                        value="pdf"
                        className="flex-1 rounded-lg text-xs font-bold py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-zinc-500 data-[state=active]:text-black"
                      >
                        PDF
                      </TabsTrigger>
                      <TabsTrigger
                        value="youtube"
                        className="flex-1 rounded-lg text-xs font-bold py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-zinc-500 data-[state=active]:text-black"
                      >
                        YouTube
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pdf" className="mt-0">
                      <div className="relative group cursor-pointer overflow-hidden rounded-xl">
                        <div className="relative border-2 border-dashed border-zinc-200 hover:border-black bg-zinc-50/50 hover:bg-zinc-50 rounded-xl h-32 flex flex-col items-center justify-center gap-2 transition-all">
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => handleStart(e.target.files?.[0])}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          <div className="w-10 h-10 bg-white border border-zinc-200 rounded-full flex items-center justify-center shadow-sm">
                            <FileText size={18} />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Upload Document
                          </span>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="youtube" className="mt-0">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder="Paste YouTube Link..."
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            className="bg-zinc-50 border-transparent focus:border-black rounded-xl h-14 pl-4 font-medium"
                          />
                        </div>
                        <Button
                          onClick={() => handleStart()}
                          disabled={!youtubeUrl}
                          className="h-14 w-14 rounded-xl bg-black hover:bg-zinc-800 text-white shadow-lg"
                        >
                          <ArrowRight size={20} />
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div
                    onClick={() => setIsMockMode(!isMockMode)}
                    className="flex items-center justify-center gap-3 cursor-pointer group py-2"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${isMockMode ? "bg-black border-black" : "border-zinc-300 group-hover:border-zinc-400"}`}
                    >
                      {isMockMode && <Check size={12} className="text-white" />}
                    </div>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider transition-colors ${isMockMode ? "text-black" : "text-zinc-400 group-hover:text-zinc-600"}`}
                    >
                      Mock Exam Mode
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    );

  // 2. QUIZ SCREEN
  if (view === "QUIZ" && questions.length > 0) {
    const q = questions[currentQ];

    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4 font-sans text-black">
        {/* Progress */}
        <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.location.reload()}
            className="hover:bg-zinc-100 rounded-full"
          >
            <X className="text-zinc-400" />
          </Button>

          <div className="flex gap-1.5">
            {history.map((h, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === currentQ
                    ? "scale-150 bg-black"
                    : h === null
                      ? "bg-zinc-200"
                      : h.isCorrect
                        ? "bg-green-500"
                        : "bg-red-500"
                }`}
              />
            ))}
          </div>
          <div className="w-10" />
        </div>

        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-2xl"
        >
          <Card className="border-0 shadow-2xl shadow-zinc-200 bg-white rounded-[40px] overflow-hidden">
            <div className="p-8 md:p-12">
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <span className="text-[10px] font-black tracking-widest uppercase bg-zinc-100 px-3 py-1.5 rounded-full text-zinc-500">
                  {q.type}
                </span>
                {isMockMode && (
                  <span className="font-mono text-sm font-bold bg-black text-white px-3 py-1 rounded-full">
                    {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? "0" : ""}
                    {timeLeft % 60}
                  </span>
                )}
              </div>

              {/* Question */}
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-10 text-black">
                {q.question}
              </h2>

              {/* Interaction Area */}
              <div className="space-y-4">
                {q.type === "fib" ? (
                  <div className="space-y-4">
                    <Input
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      placeholder="Type your answer..."
                      className="text-2xl p-8 rounded-2xl border-2 border-zinc-100 focus:border-black focus:ring-0 h-24 text-center font-medium placeholder:text-zinc-200"
                      autoFocus
                    />
                    <Button
                      onClick={() =>
                        isMockMode ? nextQuestion() : handleAnswer(textAnswer)
                      }
                      disabled={!textAnswer}
                      className="w-full h-14 rounded-2xl bg-black hover:bg-zinc-800 text-white font-bold tracking-wide"
                    >
                      SUBMIT ANSWER
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {q.options.map((opt, i) => (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleAnswer(opt)}
                        disabled={isAnswered && !isMockMode}
                        className={`w-full text-left p-6 rounded-2xl text-lg font-medium transition-all duration-200 border-2 ${
                          isMockMode
                            ? selectedOption === opt
                              ? "bg-black text-white border-black"
                              : "bg-white border-zinc-100 hover:bg-zinc-50"
                            : isAnswered
                              ? opt === q.answer
                                ? "bg-white border-green-500 text-green-600" // Correct: Green Border, Green Text
                                : selectedOption === opt
                                  ? "bg-white border-red-500 text-red-600" // Wrong: Red Border, Red Text
                                  : "opacity-40 bg-zinc-50 border-transparent"
                              : "bg-white border-zinc-100 hover:border-black hover:shadow-lg hover:shadow-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${
                              isAnswered && opt === q.answer
                                ? "bg-green-100 border-green-500 text-green-700"
                                : isAnswered && selectedOption === opt
                                  ? "bg-red-100 border-red-500 text-red-700"
                                  : "bg-zinc-50 border-zinc-200 text-zinc-500"
                            }`}
                          >
                            {String.fromCharCode(65 + i)}
                          </div>
                          <span
                            className={
                              isAnswered &&
                              selectedOption === opt &&
                              opt !== q.answer
                                ? "line-through decoration-2"
                                : ""
                            }
                          >
                            {opt}
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Explanation Drawer */}
            <AnimatePresence>
              {!isMockMode && isAnswered && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="bg-zinc-50 border-t border-zinc-100"
                >
                  <div className="p-8 md:p-10">
                    <div className="flex items-center gap-3 mb-4">
                      {selectedOption === q.answer ||
                      textAnswer.toLowerCase() === q.answer.toLowerCase() ? (
                        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                          Correct
                        </div>
                      ) : (
                        <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                          Incorrect
                        </div>
                      )}
                      <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                        Explanation
                      </span>
                    </div>

                    <p className="text-zinc-700 leading-relaxed mb-8 font-medium">
                      {q.explanation}
                    </p>

                    <Button
                      onClick={nextQuestion}
                      className="w-full h-14 rounded-2xl bg-black text-white hover:bg-zinc-800 font-bold tracking-wide shadow-xl shadow-zinc-200"
                    >
                      CONTINUE <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isMockMode && (
              <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end">
                <Button
                  onClick={nextQuestion}
                  className="h-12 px-8 rounded-xl bg-black text-white hover:bg-zinc-800 font-bold tracking-wide"
                >
                  NEXT <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    );
  }

  // 3. RESULTS
  if (view === "RESULTS")
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6 text-black font-sans">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm"
        >
          <Card className="border-0 shadow-2xl shadow-zinc-300 bg-white rounded-[40px] overflow-hidden text-center">
            <div className="p-10 pb-6">
              <div className="w-20 h-20 mx-auto bg-black rounded-full flex items-center justify-center mb-6 shadow-xl shadow-zinc-300">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black tracking-tight mb-1">
                Session Complete
              </h1>
              <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">
                Accuracy
              </p>
              <div className="text-8xl font-black tracking-tighter mt-4 mb-2">
                {Math.round((score / questions.length) * 100)}
                <span className="text-4xl text-zinc-200 align-top">%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-zinc-100 border-y border-zinc-100">
              <div className="p-6 bg-zinc-50/50">
                <div className="text-3xl font-black text-green-600">
                  {score}
                </div>
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                  Right
                </div>
              </div>
              <div className="p-6 bg-zinc-50/50">
                <div className="text-3xl font-black text-red-500">
                  {questions.length - score}
                </div>
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">
                  Wrong
                </div>
              </div>
            </div>

            <div className="p-8 space-y-3 bg-white">
              <Button
                onClick={downloadResults}
                variant="outline"
                className="w-full h-14 rounded-2xl border-2 border-zinc-100 hover:bg-zinc-50 hover:border-black text-zinc-900 font-bold tracking-wide transition-all"
              >
                <Download size={18} className="mr-2" /> SAVE REPORT
              </Button>

              <Button
                onClick={() => window.location.reload()}
                className="w-full h-14 rounded-2xl bg-black hover:bg-zinc-800 text-white font-bold tracking-wide shadow-xl shadow-zinc-200"
              >
                <RefreshCcw size={18} className="mr-2" /> NEW QUIZ
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
}
