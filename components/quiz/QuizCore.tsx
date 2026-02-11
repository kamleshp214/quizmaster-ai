"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface QuizCoreProps {
  questions: Question[];
}

export default function QuizCore({ questions }: QuizCoreProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleOptionSelect = (value: string) => {
    if (isSubmitted) return;
    setSelectedOption(value);
  };

  const handleSubmit = () => {
    if (!selectedOption) {
      toast.warning("Please select an option first!");
      return;
    }

    setIsSubmitted(true);
    if (selectedOption === currentQuestion.answer) {
      setScore(score + 1);
      toast.success("Correct!");
    } else {
      toast.error("Incorrect!");
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption("");
      setIsSubmitted(false);
    } else {
      setShowResults(true);
    }
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setScore(0);
    setShowResults(false);
    setSelectedOption("");
    setIsSubmitted(false);
  };

  if (showResults) {
    return (
      <Card className="w-full max-w-2xl mx-auto text-center py-10">
        <CardHeader>
          <CardTitle className="text-3xl">Quiz Completed! 🎉</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl mb-4">You scored:</p>
          <div className="text-6xl font-bold text-blue-600 mb-2">
            {score} / {questions.length}
          </div>
          <p className="text-muted-foreground">
            {score === questions.length
              ? "Perfect Score! 🏆"
              : "Good effort! Keep learning."}
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={restartQuiz} size="lg">
            <RotateCcw className="mr-2 h-4 w-4" /> Restart Quiz
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium text-blue-600">
            Score: {score}
          </span>
        </div>
        <CardTitle className="text-xl">{currentQuestion.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selectedOption} onValueChange={handleOptionSelect}>
          {currentQuestion.options.map((option, index) => (
            <div
              key={index}
              className={`flex items-center space-x-2 border rounded-lg p-4 transition-all ${
                isSubmitted && option === currentQuestion.answer
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : isSubmitted &&
                      option === selectedOption &&
                      option !== currentQuestion.answer
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : selectedOption === option
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
            >
              <RadioGroupItem
                value={option}
                id={`option-${index}`}
                disabled={isSubmitted}
              />
              <Label
                htmlFor={`option-${index}`}
                className="flex-grow cursor-pointer text-base"
              >
                {option}
              </Label>
              {isSubmitted && option === currentQuestion.answer && (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              {isSubmitted &&
                option === selectedOption &&
                option !== currentQuestion.answer && (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
            </div>
          ))}
        </RadioGroup>

        {isSubmitted && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
            <span className="font-bold">Explanation: </span>
            {currentQuestion.explanation}
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-end">
        {!isSubmitted ? (
          <Button onClick={handleSubmit} disabled={!selectedOption}>
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNext}>
            {currentIndex < questions.length - 1 ? (
              <>
                Next Question <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              "View Results"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
