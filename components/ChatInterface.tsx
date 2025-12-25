"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Mic, Cpu, LogIn, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useSession, signIn, signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ScheduleView from "./ScheduleView";

type Message = {
    id: string;
    role: "user" | "model";
    text: string;
    timestamp: Date;
};

export default function ChatInterface() {
    const { data: session } = useSession();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "model",
            text: "オンライン。システム正常。\nネットナビ、起動しました。何かお手伝いできることはありますか？",
            timestamp: new Date(),
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [input]);

    const handleSend = async () => {
        if (!input.trim()) return;

        // Reset voice input buffer
        inputRef.current = "";

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            text: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: input }),
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error("混み合っています。少し時間をおいてください。(Rate Limit)");
                }
                throw new Error("ネットワーク接続に異常があります。再試行してください。");
            }

            const data = await response.json();

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "model",
                text: data.response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error(error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "model",
                text: error instanceof Error ? error.message : "エラーが発生しました。接続を確認してください。",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const inputRef = useRef(""); // To keep track of committed text

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'ja-JP';
            recognition.interimResults = true;
            recognition.continuous = true;

            recognition.onstart = () => {
                setIsListening(true);
                // Sync ref with current input correctly
                inputRef.current = input;
            };

            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';

                // event.results contains all results for the session if continuous=true
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                // If we are appending to existing text input (typed manually), we need to be careful.
                // Current simple approach related to 'input' state:
                // Let's just update input state with what we have.
                // Note: Mixing typing and voice with continuous=true is tricky.
                // Assuming voice input is primary when mic is on.

                // Better approach for continuous:
                // Just use the latest finalTranscript + interim.
                // But event.results might only contain NEW results starting from resultIndex?
                // Actually in Chrome, it accumulates.

                // Let's rely on transcript reconstruction from the event.
                // However, simply concatenating might duplicate if we don't clear inputRef.

                // Fix strategy:
                // When final is received, commit it to inputRef ONLY if we handle resultIndex properly.
                // SIMPLER FIX:
                // Just reset inputRef on start, and treat 'input' as base + voice.
                // But here, let's just append finalTranscript to current input state directly?
                // No, setInput calls cause re-render, so refs are needed.

                // Correct logic for continuous dictation:
                if (finalTranscript) {
                    // Append final text to our committed buffer
                    inputRef.current += finalTranscript;
                }

                // Update UI: committed buffer + current interim
                setInput(inputRef.current + interimTranscript);
            };

            recognition.onend = () => {
                // Auto-restart if it stops unexpectedly while state is listening (though usage of stop button manages state)
                if (isListening) {
                    // Optionally restart here if really needed, but generally 'continuous' handles it.
                    // If we want to force it to stay on until button press:
                    // recognition.start(); 
                    // But let's just update state to show it stopped.
                    setIsListening(false);
                }
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    alert("マイクの使用が許可されていません。");
                    setIsListening(false);
                }
            };

            recognitionRef.current = recognition;
            recognition.start();
        } else {
            alert("お使いのブラウザは音声入力に対応していません。Google Chromeなどをご利用ください。");
        }
    };


    // ... existing imports
    // Notification logic
    useEffect(() => {
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }, []);

    // Periodic schedule check
    useEffect(() => {
        const checkSchedules = async () => {
            try {
                // Get today's start and end
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
                const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

                // Fetch today's schedules
                const res = await fetch(`/api/schedule?start=${startOfDay}&end=${endOfDay}`);
                if (!res.ok) return;

                const data = await res.json();
                const schedules = data.schedules || [];

                // Find upcoming schedules in next 10 mins that haven't passed yet
                schedules.forEach(async (schedule: any) => {
                    const scheduleTime = new Date(schedule.start).getTime();
                    const currentTime = new Date().getTime();
                    const diff = scheduleTime - currentTime;

                    // 10 minutes (600000ms) warning
                    if (diff > 0 && diff <= 10 * 60 * 1000) {
                        // Check if we already notified for this schedule (local storage or session storage)
                        const notifiedKey = `notified-${schedule.id}`;
                        if (sessionStorage.getItem(notifiedKey)) return;

                        sessionStorage.setItem(notifiedKey, "true");

                        // Send system trigger to chat to generate proactive message
                        setIsLoading(true);
                        try {
                            // Use special prefix [SYSTEM] to let backend know it is a system trigger?
                            // Actually, just sending a message as user "System" or similar.
                            // Or sending a specific prompt.
                            const prompt = `[System Trigger] 次の予定「${schedule.title}」が${Math.floor(diff / 60000)}分後に迫っています。ユーザーに通知してください。`;

                            const response = await fetch("/api/chat", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ message: prompt }), // history is managed by server mainly, but here we can omit or send current. Server loads history.
                            });

                            if (response.ok) {
                                const data = await response.json();
                                const aiMessage: Message = {
                                    id: Date.now().toString(),
                                    role: "model",
                                    text: data.response,
                                    timestamp: new Date(),
                                };
                                setMessages((prev) => [...prev, aiMessage]);

                                // Browser Notification
                                if (Notification.permission === "granted") {
                                    new Notification("NetNavi Notification", {
                                        body: data.response,
                                        icon: "/icon.png" // placeholder
                                    });
                                }
                            }
                        } catch (e) {
                            console.error("Failed to proactive notify", e);
                        } finally {
                            setIsLoading(false);
                        }
                    }
                });
            } catch (error) {
                console.error("Schedule check failed", error);
            }
        };

        const intervalId = setInterval(checkSchedules, 60 * 1000); // Check every minute
        checkSchedules(); // Initial check

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="flex h-full w-full max-w-6xl mx-auto gap-4">
            {/* Chat Area */}
            <div className="flex flex-col flex-1 h-full p-4 gap-4 min-w-0">
                {/* Header / Status Bar */}
                <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-3 flex items-center justify-between backdrop-blur-md shadow-[0_0_15px_rgba(0,174,239,0.2)]">
                    <div className="flex items-center gap-2">
                        <div className={twMerge(
                            "w-3 h-3 rounded-full shadow-[0_0_8px] transition-colors duration-500",
                            status === "idle" ? "bg-pet-green shadow-pet-green" :
                                status === "thinking" ? "bg-pet-orange shadow-pet-orange animate-pulse" :
                                    status === "checking" ? "bg-pet-blue shadow-pet-blue animate-pulse" :
                                        "bg-pet-red shadow-pet-red"
                        )} />
                        <span className="font-orbitron font-bold text-pet-blue tracking-wider">NETNAVI.EXE</span>

                        {/* Status Text Indicator */}
                        <div className="hidden sm:flex items-center gap-2 ml-4 px-2 py-0.5 rounded bg-slate-800/50 border border-slate-700">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                                SYSTEM:
                            </span>
                            <span className={twMerge(
                                "text-[10px] font-mono font-bold uppercase tracking-wider",
                                status === "idle" ? "text-pet-green" :
                                    status === "thinking" ? "text-pet-orange" :
                                        status === "checking" ? "text-pet-blue" : "text-slate-300"
                            )}>
                                {status === "idle" ? "ONLINE" :
                                    status === "thinking" ? "PROCESSING..." :
                                        status === "checking" ? "SCANNING MAILS..." : "BUSY"}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-xs text-slate-400 font-mono">
                            V 1.0.3 (Partner Mode)
                        </div>
                        {session ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-300 hidden sm:inline">{session.user?.name}</span>
                                <button
                                    onClick={() => signOut()}
                                    className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                                    title="Logout"
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => signIn("google")}
                                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-slate-600"
                            >
                                <LogIn size={14} />
                                <span>Connect</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Message Area */}
                <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
                    <AnimatePresence>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className={twMerge(
                                    "flex w-full",
                                    msg.role === "user" ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={twMerge(
                                        "max-w-[85%] rounded-2xl p-4 shadow-md relative",
                                        msg.role === "user"
                                            ? "bg-pet-blue/10 border border-pet-blue/30 rounded-tr-none text-slate-100"
                                            : "bg-slate-800/80 border border-slate-600 rounded-tl-none text-slate-200"
                                    )}
                                >

                                    {/* AI Icon */}
                                    {msg.role === "model" && (
                                        <div className="absolute -top-3 -left-2 bg-slate-900 border border-slate-600 rounded-full p-1">
                                            <Cpu size={14} className="text-pet-orange" />
                                        </div>
                                    )}
                                    <div className="text-sm leading-relaxed markdown-content">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {msg.text}
                                        </ReactMarkdown>
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-2 text-right font-mono opacity-70">
                                        {msg.timestamp.getHours().toString().padStart(2, '0')}:{msg.timestamp.getMinutes().toString().padStart(2, '0')}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start w-full"
                        >
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                                <div className="w-2 h-2 bg-pet-orange rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 bg-pet-orange rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 bg-pet-orange rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="bg-slate-900/90 border-t border-slate-700 p-4 backdrop-blur-md rounded-t-2xl">
                    <div className="flex gap-2 items-end">
                        <button
                            onClick={toggleListening}
                            className={twMerge(
                                "p-3 rounded-full transition-all border shrink-0 mb-1",
                                isListening
                                    ? "bg-red-500 text-white border-red-400 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                    : "bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700 hover:text-pet-blue"
                            )}
                        >
                            <Mic size={20} />
                        </button>
                        <div className="flex-1 relative">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={isListening ? "聞いています..." : "メッセージを入力..."}
                                rows={1}
                                className="w-full bg-slate-800/50 border border-slate-600 rounded-2xl py-3 px-5 focus:outline-none focus:border-pet-blue focus:ring-1 focus:ring-pet-blue/50 text-white placeholder-slate-500 transition-all font-medium resize-none overflow-hidden min-h-[50px]"
                            />
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="p-3 rounded-full bg-pet-blue hover:bg-sky-500 text-white shadow-[0_0_15px_rgba(0,174,239,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none shrink-0 mb-1"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Schedule View (Right Side) */}
            <ScheduleView />
        </div>
    );
}
