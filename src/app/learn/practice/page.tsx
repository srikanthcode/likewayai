"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, X, RotateCcw, Award, Brain, Zap, BookOpen, ChevronRight, Trophy, Star, Mic, Send, Keyboard, Loader2, Sparkles } from "lucide-react";
import { getCourseById, Course, Module, Question, Difficulty } from "@/lib/learn/subjects";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/Toast";

type PracticeState = "select" | "practice" | "result" | "loading";

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
      <PracticeContent />
    </Suspense>
  );
}

function PracticeContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("course");

  const [course, setCourse] = useState<Course | null>(null);
  const [state, setState] = useState<PracticeState>("select");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("beginner");
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [_answers, setAnswers] = useState<{ questionId: string; correct: boolean; xp: number }[]>([]);
  
  // Interaction states
  const [inputMode, setInputMode] = useState<"click" | "type" | "voice">("click");
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (courseId) {
      const c = getCourseById(courseId);
      if (c) setCourse(c);
    }
  }, [courseId]);

  const fetchAIQuestions = async (mod: Module) => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/learn/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course?.id,
          moduleTitle: mod.title,
          difficulty: selectedDifficulty,
          count: 10
        })
      });
      const data = await res.json();
      return data.questions || [];
    } catch (err) {
      console.error("AI question gen failed", err);
      return [];
    } finally {
      setIsGenerating(false);
    }
  };

  const startPractice = useCallback(async (mod: Module) => {
    setSelectedModule(mod);
    setState("loading");
    
    // Combine local questions with AI generated ones to ensure variety
    const localQs = mod.questions.filter(q => q.difficulty === selectedDifficulty);
    
    // Always fetch some AI questions to keep it fresh
    const aiQs = await fetchAIQuestions(mod);
    
    const combined = [...localQs, ...aiQs].sort(() => Math.random() - 0.5).slice(0, 10);
    
    if (combined.length === 0) {
      // Fallback
      setQuestions(mod.questions.slice(0, 10));
    } else {
      setQuestions(combined);
    }

    setCurrentQ(0);
    setScore(0);
    setXpEarned(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setState("practice");
  }, [selectedDifficulty, course]);

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;
    
    const currentQuestion = questions[currentQ];
    const normalizedSelected = answer.trim().toLowerCase();
    const normalizedCorrect = currentQuestion.answer.trim().toLowerCase();
    
    // Smart matching for text/voice (check if correct answer is contained in selection)
    const isCorrect = normalizedSelected === normalizedCorrect || 
                     (currentQuestion.type === "fill_blank" && normalizedSelected.includes(normalizedCorrect));

    setSelectedAnswer(answer);
    setIsAnswered(true);

    if (isCorrect) {
      setScore(s => s + 1);
      setXpEarned(x => x + currentQuestion.xp);
    }
    setAnswers(a => [...a, { questionId: currentQuestion.id, correct: isCorrect, xp: isCorrect ? currentQuestion.xp : 0 }]);
  };

  const toggleVoiceInput = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast("Voice input is not supported in this browser.", "warning");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTypedAnswer(transcript);
      handleAnswer(transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(c => c + 1);
      setSelectedAnswer(null);
      setTypedAnswer("");
      setIsAnswered(false);
    } else {
      setState("result");
    }
  };

  const resetPractice = () => {
    setCurrentQ(0);
    setScore(0);
    setXpEarned(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setState("select");
    setSelectedModule(null);
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-[#0a0e16] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4 text-sm font-medium">Course not found</p>
          <Link href="/learn" className="text-cyan-400 hover:underline text-sm font-bold">Go back to subjects</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e16] text-gray-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0e16]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/learn" className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">{course.icon} {course.name}</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                {state === "practice" ? `Q${currentQ + 1} / ${questions.length}` : "Practice Path"}
              </p>
            </div>
          </div>
          {state === "practice" && (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={10} className="fill-current" />
                {xpEarned} XP
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                {score} Correct
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* ── Loading State ─────────────────────────────────────── */}
          {state === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <Loader2 size={40} className="text-cyan-500 animate-spin" />
                <Sparkles size={16} className="absolute -top-1 -right-1 text-amber-400 animate-pulse" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-white mb-1">AI generating your path...</h3>
                <p className="text-xs text-gray-500 italic">Finding the best questions for your level</p>
              </div>
            </motion.div>
          )}

          {/* ── Module Selection ──────────────────────────────────── */}
          {state === "select" && (
            <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex flex-col gap-6">
                {/* Difficulty Selector */}
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">Difficulty level</p>
                  <div className="flex gap-2 p-1.5 bg-white/5 border border-white/5 rounded-2xl w-fit">
                    {(["beginner", "intermediate", "master"] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setSelectedDifficulty(d)}
                        className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                          selectedDifficulty === d
                            ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modules */}
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">Learning Modules</p>
                  <div className="grid grid-cols-1 gap-3">
                    {course.modules.map((mod, i) => (
                      <button
                        key={mod.id}
                        onClick={() => startPractice(mod)}
                        className="group w-full text-left p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-500/20 transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-lg font-black group-hover:scale-110 transition-transform">
                              {i + 1}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">{mod.title}</h3>
                              <p className="text-xs text-gray-500 mt-0.5">{mod.description}</p>
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-gray-600 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
                        </div>
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-4xl group-hover:scale-125 transition-transform group-hover:text-cyan-500">
                          {course.icon}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Practice Mode ────────────────────────────────────── */}
          {state === "practice" && questions.length > 0 && (
            <motion.div key="practice" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col">
              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-white/5 rounded-full mb-8 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                  animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "circOut" }}
                />
              </div>

              {/* Question */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    questions[currentQ].difficulty === "beginner" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    questions[currentQ].difficulty === "intermediate" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}>
                    {questions[currentQ].difficulty}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    +{questions[currentQ].xp} XP potential
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight whitespace-pre-wrap">{questions[currentQ].question}</h2>
              </div>

              {/* Interaction Modes */}
              <div className="flex gap-2 sm:gap-4 mb-6">
                <button onClick={() => setInputMode("click")} className={`flex-1 py-2.5 sm:py-2 rounded-xl text-[11px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border transition-all min-h-[44px] ${inputMode === "click" ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"}`}>
                  Selection
                </button>
                <button onClick={() => setInputMode("type")} className={`flex-1 py-2.5 sm:py-2 rounded-xl text-[11px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border transition-all min-h-[44px] ${inputMode === "type" ? "bg-purple-500/10 border-purple-500/30 text-purple-400" : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"}`}>
                  <Keyboard size={12} /> Type
                </button>
                <button onClick={() => setInputMode("voice")} className={`flex-1 py-2.5 sm:py-2 rounded-xl text-[11px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border transition-all min-h-[44px] ${inputMode === "voice" ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"}`}>
                  <Mic size={12} /> Voice
                </button>
              </div>

              {/* Input: Selection (MCQ) */}
              {inputMode === "click" && questions[currentQ].options && (
                <div className="space-y-3 mb-8">
                  {questions[currentQ].options.map((opt, i) => {
                    const isSelected = selectedAnswer === opt;
                    const isCorrect = opt === questions[currentQ].answer;
                    const showCorrect = isAnswered && isCorrect;
                    const showWrong = isAnswered && isSelected && !isCorrect;

                    return (
                      <button
                        key={i}
                        onClick={() => handleAnswer(opt)}
                        disabled={isAnswered}
                        className={`group w-full text-left p-4 rounded-2xl border transition-all relative ${
                          showCorrect
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                            : showWrong
                            ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
                            : isSelected
                            ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                            : "border-white/5 bg-white/[0.02] text-gray-300 hover:border-white/20 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors",
                            showCorrect ? "bg-emerald-500 text-white" : showWrong ? "bg-rose-500 text-white" : "bg-white/5 text-gray-500 group-hover:text-white"
                          )}>
                            {showCorrect ? <Check size={16} strokeWidth={3} /> : showWrong ? <X size={16} strokeWidth={3} /> : String.fromCharCode(65 + i)}
                          </span>
                          <span className="text-sm font-medium">{opt}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Input: Type / Voice */}
              {(inputMode === "type" || inputMode === "voice") && (
                <div className="mb-8 space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAnswer(typedAnswer)}
                      disabled={isAnswered}
                      placeholder={inputMode === "voice" ? "Tap mic to speak..." : "Type your answer here..."}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/50 transition-all pr-14"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {inputMode === "voice" ? (
                        <button
                          onClick={toggleVoiceInput}
                          disabled={isAnswered}
                          className={cn(
                            "p-2.5 rounded-xl transition-all",
                            isRecording ? "bg-rose-500 text-white animate-pulse" : "bg-white/5 text-gray-400 hover:text-white"
                          )}
                        >
                          <Mic size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAnswer(typedAnswer)}
                          disabled={isAnswered || !typedAnswer.trim()}
                          className="p-2.5 rounded-xl bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-50 transition-all"
                        >
                          <Send size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                  {isRecording && <p className="text-center text-[10px] text-rose-400 font-bold uppercase tracking-widest animate-pulse">Listening...</p>}
                </div>
              )}

              {/* True/False (Fallback for non-option) */}
              {!questions[currentQ].options && inputMode === "click" && (
                <div className="flex gap-4 mb-8">
                  {["True", "False"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      disabled={isAnswered}
                      className={cn(
                        "flex-1 p-5 rounded-2xl border text-sm font-black uppercase tracking-wider transition-all",
                        isAnswered && opt === questions[currentQ].answer ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" :
                        isAnswered && selectedAnswer === opt ? "border-rose-500/50 bg-rose-500/10 text-rose-400" :
                        "border-white/5 bg-white/[0.02] text-gray-400 hover:text-white hover:border-white/20"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* AI Tutor Explanation */}
              <AnimatePresence>
                {isAnswered && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-8">
                    <div className={cn(
                      "p-6 rounded-3xl border relative overflow-hidden",
                      selectedAnswer?.toLowerCase() === questions[currentQ].answer.toLowerCase() || (questions[currentQ].type === "fill_blank" && selectedAnswer?.toLowerCase().includes(questions[currentQ].answer.toLowerCase()))
                        ? "border-emerald-500/20 bg-emerald-500/[0.02]"
                        : "border-amber-500/20 bg-amber-500/[0.02]"
                    )}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn(
                          "p-2 rounded-xl",
                          selectedAnswer?.toLowerCase() === questions[currentQ].answer.toLowerCase() ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                        )}>
                           <Brain size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest opacity-60">AI Tutor Breakdown</p>
                          <h4 className="text-sm font-bold text-white">
                            {selectedAnswer?.toLowerCase() === questions[currentQ].answer.toLowerCase() ? "Brilliant! You nailed it." : "Not quite, but here's why:"}
                          </h4>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed mb-4">{questions[currentQ].explanation}</p>
                      
                      <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                         <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Correct Answer: <span className="text-emerald-400">{questions[currentQ].answer}</span></div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Next Button */}
              {isAnswered && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={nextQuestion}
                  className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl"
                >
                  {currentQ < questions.length - 1 ? (
                    <>CONTINUE TO NEXT <ArrowRight size={18} /></>
                  ) : (
                    <>COMPLETE PRACTICE <Trophy size={18} /></>
                  )}
                </motion.button>
              )}
            </motion.div>
          )}

          {/* ── Results ──────────────────────────────────────────── */}
          {state === "result" && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <div className="relative w-32 h-32 mx-auto mb-8">
                 <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
                 <div className="relative w-full h-full rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center">
                    <Trophy size={60} className="text-cyan-400" />
                 </div>
                 <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }} className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white border-4 border-[#0a0e16]">
                    <Star size={18} fill="currentColor" />
                 </motion.div>
              </div>

              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Mission Accomplished!</h2>
              <p className="text-sm text-gray-400 mb-10 font-medium">You completed {course.name} module</p>

              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-10">
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">XP EARNED</div>
                  <div className="text-3xl font-black text-amber-400">{xpEarned}</div>
                </div>
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">ACCURACY</div>
                  <div className="text-3xl font-black text-cyan-400">{Math.round((score / questions.length) * 100)}%</div>
                </div>
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">SCORE</div>
                  <div className="text-3xl font-black text-white">{score}/{questions.length}</div>
                </div>
              </div>

              {/* Certificate Check */}
              {Math.round((score / questions.length) * 100) >= 70 ? (
                <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 max-w-lg mx-auto mb-10 flex items-center gap-5 text-left">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Award size={32} className="text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-emerald-400">Certificate Unlocked!</h4>
                    <p className="text-xs text-gray-400">High accuracy maintained. Your certificate has been issued to your profile.</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 max-w-lg mx-auto mb-10 text-left flex items-center gap-5">
                   <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                    <BookOpen size={32} className="text-gray-500" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-300">Keep grinding!</h4>
                    <p className="text-xs text-gray-500">Score 70% or higher to unlock the certificate for this module.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-4 max-w-lg mx-auto">
                <button
                  onClick={resetPractice}
                  className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} /> REPLAY
                </button>
                <button
                  onClick={resetPractice}
                  className="flex-1 py-4 rounded-2xl bg-cyan-500 text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20 transition-all"
                >
                  NEXT MODULE
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

