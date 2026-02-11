"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Save, Wand2 } from "lucide-react";

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setGeminiKey(localStorage.getItem("gemini_api_key") || "");
    setOpenaiKey(localStorage.getItem("openai_api_key") || "");
  }, []);

  const handleSave = () => {
    setIsLoading(true);
    try {
      if (geminiKey) localStorage.setItem("gemini_api_key", geminiKey);
      if (openaiKey) localStorage.setItem("openai_api_key", openaiKey);

      toast.success("API Keys saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-10 mx-auto">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>AI Providers</CardTitle>
          <CardDescription>Configure which AI you want to use.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OpenAI Section */}
          <div className="space-y-2">
            <Label>OpenAI API Key (Recommended 🚀)</Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-gray-500"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Uses <code>gpt-4o-mini</code>. Best performance and stability.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          {/* Gemini Section */}
          <div className="space-y-2">
            <Label>Google Gemini API Key</Label>
            <Input
              type={showKey ? "text" : "password"}
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Free tier has strict rate limits.
            </p>
          </div>

          <Button onClick={handleSave} disabled={isLoading} className="w-full">
            {isLoading ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Save Configuration
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
