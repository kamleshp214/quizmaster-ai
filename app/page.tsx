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
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  BrainCircuit,
  Download,
  ArrowRight,
  Play,
  Trophy,
} from "lucide-react";

type Question = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

export default function Home() {
  // App State
  const [view, setView] = useState<"HOME" | "QUIZ" | "RESULTS">("HOME");
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");

  // Quiz Data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [quizType, setQuizType] = useState("mcq");

  // User Answers (for results analysis)
  const [userAnswers, setUserAnswers] = useState<
    { question: string; user: string; correct: string; explanation: string }[]
  >([]);

  // Current Question State
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem("groq_api_key");
    if (storedKey) setApiKey(storedKey);
  }, []);

  const handleStart = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!apiKey) return toast.error("Please enter your Groq API Key first!");

    // Save key for next time
    localStorage.setItem("groq_api_key", apiKey);

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("apiKey", apiKey);
    formData.append("quizType", quizType);

    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setQuestions(data.questions);
      setView("QUIZ");
      setCurrentQ(0);
      setScore(0);
      setUserAnswers([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;

    const q = questions[currentQ];
    let isCorrect = false;

    // Check logic
    if (quizType === "fib") {
      isCorrect = answer.toLowerCase().trim() === q.answer.toLowerCase().trim();
    } else {
      isCorrect = answer === q.answer;
    }

    // Update state
    if (isCorrect) setScore((prev) => prev + 1);
    setSelectedOption(answer);
    setIsAnswered(true);
    setFeedback(q.explanation);

    // Save for results
    setUserAnswers((prev) => [
      ...prev,
      {
        question: q.question,
        user: answer,
        correct: q.answer,
        explanation: q.explanation,
      },
    ]);
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1);
      setIsAnswered(false);
      setSelectedOption(null);
      setTextAnswer("");
      setFeedback(null);
    } else {
      setView("RESULTS");
    }
  };

  const downloadResults = () => {
    const content = userAnswers
      .map(
        (a, i) =>
          `Q${i + 1}: ${a.question}\nYour Answer: ${a.user} | Correct: ${a.correct}\nNote: ${a.explanation}\n\n`,
      )
      .join("");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "QuizMaster-Study-Guide.txt";
    a.click();
  };

  // --- VIEWS ---

  if (isLoading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50">
        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">
          Reading PDF & Generating Quiz...
        </h2>
        <p className="text-gray-500 mt-2">Powered by Llama 3 on Groq</p>
      </div>
    );

  if (view === "HOME")
    return (
      <div className="min-h-screen bg-white text-gray-900 font-sans">
        {/* Hero */}
        <div className="max-w-4xl mx-auto pt-20 pb-12 px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
            <BrainCircuit size={16} /> New: Groq Engine Integration
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900">
            Turn your <span className="text-indigo-600">Notes</span> into{" "}
            <span className="text-indigo-600">Quizzes</span>.
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Upload any PDF. Our AI reads it, understands it, and challenges you
            with custom questions instantly.
          </p>
        </div>

        {/* Main Action Card */}
        <div className="max-w-md mx-auto px-6 mb-20">
          <Card className="shadow-2xl border-0 ring-1 ring-gray-200">
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  1. Enter Groq API Key
                </label>
                <Input
                  type="password"
                  placeholder="gsk_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  2. Select Mode
                </label>
                <Select value={quizType} onValueChange={setQuizType}>
                  <SelectTrigger className="bg-gray-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                    <SelectItem value="tf">True / False</SelectItem>
                    <SelectItem value="fib">Fill in Blanks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition duration-1000"></div>
                <div className="relative flex items-center justify-center w-full h-16 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer overflow-hidden">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleStart}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <span className="flex items-center gap-2 text-gray-600 font-medium">
                    <FileText size={20} /> Upload PDF to Start
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <div className="bg-gray-50 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h3 className="text-2xl font-bold text-center mb-10">
              How it works
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: FileText,
                  title: "Upload",
                  desc: "Drag & drop your study material PDF.",
                },
                {
                  icon: BrainCircuit,
                  title: "Generate",
                  desc: "AI analyzes text and creates questions.",
                },
                {
                  icon: Trophy,
                  title: "Master",
                  desc: "Test yourself and review mistakes.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center text-center space-y-3"
                >
                  <div className="w-12 h-12 bg-white rounded-xl shadow flex items-center justify-center text-indigo-600">
                    <item.icon size={24} />
                  </div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );

  if (view === "QUIZ") {
    const q = questions[currentQ];
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center text-sm font-medium text-gray-500">
            <span>
              Question {currentQ + 1}/{questions.length}
            </span>
            <span className="bg-white px-3 py-1 rounded-full shadow-sm">
              Score: {score}
            </span>
          </div>

          {/* Progress */}
          <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          <Card className="shadow-lg border-0">
            <CardContent className="p-8 space-y-8">
              <h2 className="text-2xl font-bold text-gray-800 leading-snug">
                {q.question}
              </h2>

              {/* Options Area */}
              <div className="space-y-3">
                {quizType === "fib" ? (
                  <div className="flex gap-3">
                    <Input
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      placeholder="Type your answer..."
                      className="text-lg p-6"
                      disabled={isAnswered}
                    />
                    <Button
                      onClick={() => handleAnswer(textAnswer)}
                      disabled={!textAnswer || isAnswered}
                      className="h-auto px-6"
                    >
                      Submit
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {q.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnswer(opt)}
                        disabled={isAnswered}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium ${
                          isAnswered
                            ? opt === q.answer
                              ? "border-green-500 bg-green-50 text-green-700"
                              : selectedOption === opt
                                ? "border-red-500 bg-red-50 text-red-700"
                                : "border-gray-100 bg-gray-50 opacity-50"
                            : "border-gray-100 hover:border-indigo-600 hover:bg-indigo-50"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Feedback Area */}
              {isAnswered && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <div
                    className={`p-4 rounded-xl border-l-4 ${selectedOption === q.answer || textAnswer.toLowerCase() === q.answer.toLowerCase() ? "bg-green-50 border-green-500" : "bg-red-50 border-red-500"}`}
                  >
                    <p className="font-bold flex items-center gap-2 mb-1">
                      {selectedOption === q.answer ||
                      textAnswer.toLowerCase() === q.answer.toLowerCase() ? (
                        <CheckCircle className="text-green-600" size={20} />
                      ) : (
                        <XCircle className="text-red-600" size={20} />
                      )}
                      Explanation
                    </p>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {feedback}
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={nextQuestion}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
                    >
                      {currentQ < questions.length - 1
                        ? "Next Question"
                        : "See Results"}{" "}
                      <ArrowRight className="ml-2" size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (view === "RESULTS")
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full shadow-2xl border-0 overflow-hidden">
          <div className="bg-indigo-600 p-10 text-center text-white">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
            <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1>
            <p className="opacity-90">You scored</p>
            <div className="text-6xl font-black mt-2">
              {Math.round((score / questions.length) * 100)}%
            </div>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="text-2xl font-bold text-green-600">{score}</div>
                <div className="text-xs text-green-800 uppercase font-bold tracking-wider">
                  Correct
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <div className="text-2xl font-bold text-red-600">
                  {questions.length - score}
                </div>
                <div className="text-xs text-red-800 uppercase font-bold tracking-wider">
                  Incorrect
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={downloadResults}
                variant="outline"
                className="w-full border-2 border-indigo-100 text-indigo-700 hover:bg-indigo-50 py-6"
              >
                <Download className="mr-2" size={18} /> Download Study Guide
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6"
              >
                Start New Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
}
