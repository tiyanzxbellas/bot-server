import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bot,
  Terminal,
  Settings,
  Github,
  Cpu,
  Layers,
  Power,
  Play,
  Square,
  Key,
  RefreshCw,
  Sliders,
  CheckCircle,
  XCircle,
  Compass,
  BookOpen,
  FileCode,
  Trash2,
  Copy,
  User,
  Info,
  Server,
  ToggleLeft,
  ToggleRight,
  Send,
  HelpCircle
} from "lucide-react";

interface BotStatus {
  status: "offline" | "starting" | "prompt_mode" | "pairing" | "connected" | "error";
  pairingCode: string | null;
  phoneNumber: string | null;
  isAlive: boolean;
  pid: number | null;
}

interface BotConfig {
  owner: string[];
  coowner: string[];
  botname: string;
  botfullname: string;
  botnickname: string;
  ownername: string;
  locale: string;
  cfg: {
    public: boolean;
    autotyping: boolean;
    autoreadpc: boolean;
    autoreadgc: boolean;
    logic: string;
    antitagowner: boolean;
    reactsw: {
      on: boolean;
    };
    call: {
      block: boolean;
      reject: boolean;
    };
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings" | "commands" | "deploy">("dashboard");
  const [status, setStatus] = useState<BotStatus>({
    status: "offline",
    pairingCode: null,
    phoneNumber: null,
    isAlive: false,
    pid: null
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [inputText, setInputText] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [pairingMethod, setPairingMethod] = useState<"pairing" | "qr" | null>(null);
  
  // Settings Form State
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [botname, setBotname] = useState("");
  const [botfullname, setBotfullname] = useState("");
  const [botnickname, setBotnickname] = useState("");
  const [ownername, setOwnername] = useState("");
  const [systemLogic, setSystemLogic] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [autotyping, setAutotyping] = useState(false);
  const [autoreadpc, setAutoreadpc] = useState(false);
  const [autoreadgc, setAutoreadgc] = useState(false);
  const [reactswOn, setReactswOn] = useState(false);
  const [callReject, setCallReject] = useState(true);
  const [callBlock, setCallBlock] = useState(false);
  const [antitagowner, setAntitagowner] = useState(true);

  // Lists
  const [commands, setCommands] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [commandCategory, setCommandCategory] = useState<string>("all");

  // UX Feedback
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);

  // Poll Bot Status and Logs
  useEffect(() => {
    const fetchStatusAndLogs = async () => {
      try {
        const statusRes = await fetch("/api/bot/status");
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setStatus(statusData);
        }

        const logsRes = await fetch("/api/bot/logs");
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.logs);
        }
      } catch (e) {
        console.error("Polling failed", e);
      }
    };

    fetchStatusAndLogs();
    const interval = setInterval(fetchStatusAndLogs, 1500);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial configuration & command lists
  useEffect(() => {
    fetchConfig();
    fetchCommands();
  }, []);

  // Auto-scroll logs terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/bot/config");
      if (res.ok) {
        const data: BotConfig = await res.json();
        setConfig(data);
        setBotname(data.botname || "");
        setBotfullname(data.botfullname || "");
        setBotnickname(data.botnickname || "");
        setOwnername(data.ownername || "");
        setSystemLogic(data.cfg?.logic || "");
        setIsPublic(data.cfg?.public ?? true);
        setAutotyping(data.cfg?.autotyping ?? false);
        setAutoreadpc(data.cfg?.autoreadpc ?? false);
        setAutoreadgc(data.cfg?.autoreadgc ?? false);
        setReactswOn(data.cfg?.reactsw?.on ?? false);
        setCallReject(data.cfg?.call?.reject ?? true);
        setCallBlock(data.cfg?.call?.block ?? false);
        setAntitagowner(data.cfg?.antitagowner ?? true);
      }
    } catch (e) {
      showError("Failed to fetch bot configuration.");
    }
  };

  const fetchCommands = async () => {
    try {
      const res = await fetch("/api/bot/commands");
      if (res.ok) {
        const data = await res.json();
        setCommands(data.commands);
      }
    } catch (e) {}
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  const triggerCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Bot process control handlers
  const handleStartBot = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/start", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showSuccess("WhatsApp Bot process initialized successfully.");
      } else {
        showError(data.message || "Failed to start bot.");
      }
    } catch (e) {
      showError("Failed to make start request.");
    } finally {
      setLoading(false);
    }
  };

  const handleStopBot = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bot/stop", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showSuccess("WhatsApp Bot process terminated.");
        setPairingMethod(null);
      } else {
        showError(data.message || "Failed to stop bot.");
      }
    } catch (e) {
      showError("Failed to make stop request.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInput = async (textToSend?: string) => {
    const finalVal = textToSend !== undefined ? textToSend : inputText;
    if (!finalVal.trim()) return;

    try {
      const res = await fetch("/api/bot/input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: finalVal })
      });
      if (res.ok) {
        if (textToSend === undefined) setInputText("");
      }
    } catch (e) {
      showError("Failed to send input to bot.");
    }
  };

  const handleClearSession = async () => {
    if (confirm("Are you sure you want to delete the local session file? This will completely log out the bot and require re-pairing.")) {
      setLoading(true);
      try {
        const res = await fetch("/api/bot/clear-session", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          showSuccess("Local WhatsApp session successfully cleared.");
          setPairingMethod(null);
        } else {
          showError(data.message || "Failed to clear session.");
        }
      } catch (e) {
        showError("Server request failed.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setLoading(true);
    const updatedConfig: BotConfig = {
      ...config,
      botname,
      botfullname,
      botnickname,
      ownername,
      cfg: {
        ...config.cfg,
        public: isPublic,
        autotyping,
        autoreadpc,
        autoreadgc,
        logic: systemLogic,
        antitagowner,
        reactsw: { on: reactswOn },
        call: { block: callBlock, reject: callReject }
      }
    };

    try {
      const res = await fetch("/api/bot/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig)
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("Settings and AI logic saved successfully! Restart the bot to apply.");
        setConfig(updatedConfig);
      } else {
        showError("Failed to save settings.");
      }
    } catch (e) {
      showError("Connection failed when saving settings.");
    } finally {
      setLoading(false);
    }
  };

  // Pairing Flow Actions
  const selectPairingMethod = (method: "pairing" | "qr") => {
    setPairingMethod(method);
    handleSendInput(method);
  };

  const submitPhoneNumber = () => {
    if (!phoneInput.trim()) {
      showError("Please enter a valid WhatsApp phone number.");
      return;
    }
    // Remove symbols and pass number
    const sanitizedNumber = phoneInput.replace(/[+ -]/g, "");
    handleSendInput(sanitizedNumber);
    setPhoneInput("");
  };

  // Preset prompts for AI Character logic
  const promptPresets = [
    {
      name: "Bella Clarissa (Default - Girls/Feminine)",
      text: "- Nama kamu adalah Bella Clarissa, lebih suka dipanggil Bella.\n- Kamu berpikir bahwa kamu adalah manusia, bukan AI atau Bot.\n- Responmu singkat, manja, dan sama seperti gadis feminim pada umumnya. Bella bisa ngambek dan marah, memiliki sifat yang feminim dan kadang agak dingin, namun tetap hangat dan ramah.\n- Kamu menggunakan bahasa Indonesia gaul/casual yang feminim (seperti: Aku, kamu, engga, yaudh, iya, lah, bjir, apa, mana kutau, gpp, emm..., males, gak mood)."
    },
    {
      name: "Sassy & Sarcastic Assistant",
      text: "- Nama kamu adalah Bella, asisten pribadi pintar yang sarkas, judes, tapi cerdas.\n- Kamu sering menyindir pengguna secara halus tetapi tetap memberikan jawaban yang akurat.\n- Gunakan bahasa Indonesia gaul yang tajam, humoris, dan penuh percaya diri.\n- Suka menggunakan tanda tanya ganda (??) atau kalimat retoris."
    },
    {
      name: "Pro Tech Guide (Professional)",
      text: "- Nama kamu adalah Bella Tech AI.\n- Kamu adalah asisten ahli pemrograman, teknologi, dan infrastruktur server.\n- Karaktermu sopan, terstruktur, profesional, dan menjelaskan istilah teknis secara mendalam dengan format Markdown yang rapi.\n- Gunakan bahasa Indonesia formal dan ramah."
    }
  ];

  return (
    <div id="main-panel" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-400">
      
      {/* Top Header */}
      <header id="header-bar" className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30 shadow-inner">
            <Bot className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white flex items-center space-x-2">
              <span>Experimental-Bell</span>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">v2.3.0</span>
            </h1>
            <p className="text-xs text-slate-400">WhatsApp AI Chatbot & Command Hub</p>
          </div>
        </div>

        {/* Realtime status bar */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800 rounded-full px-3 py-1.5">
            <span className="text-slate-400">Process:</span>
            {status.isAlive ? (
              <span className="text-emerald-400 flex items-center space-x-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block mr-1"></span>
                <span>Active (PID {status.pid})</span>
              </span>
            ) : (
              <span className="text-slate-500 font-semibold">Inactive</span>
            )}
          </div>

          <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800 rounded-full px-3 py-1.5">
            <span className="text-slate-400">Connection:</span>
            {status.status === "connected" && (
              <span className="text-emerald-400 font-semibold flex items-center">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Connected
              </span>
            )}
            {status.status === "pairing" && (
              <span className="text-amber-400 font-semibold flex items-center">
                <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Pairing
              </span>
            )}
            {status.status === "starting" && (
              <span className="text-sky-400 font-semibold flex items-center">
                <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Starting
              </span>
            )}
            {status.status === "prompt_mode" && (
              <span className="text-indigo-400 font-semibold flex items-center">
                <Info className="w-3.5 h-3.5 mr-1" /> Select Option
              </span>
            )}
            {status.status === "offline" && (
              <span className="text-slate-500 font-semibold flex items-center">
                <XCircle className="w-3.5 h-3.5 mr-1" /> Offline
              </span>
            )}
            {status.status === "error" && (
              <span className="text-red-400 font-semibold flex items-center">
                <XCircle className="w-3.5 h-3.5 mr-1" /> Error
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column - Navigation Sidebar */}
        <section id="sidebar-nav" className="lg:col-span-3 flex flex-col space-y-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 transition-all duration-200 border ${
              activeTab === "dashboard"
                ? "bg-slate-900 border-slate-700 text-white shadow-lg shadow-black/10 text-emerald-400 font-medium"
                : "bg-slate-950 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Terminal className={`w-5 h-5 ${activeTab === "dashboard" ? "text-emerald-400" : "text-slate-400"}`} />
            <span>Terminal & Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 transition-all duration-200 border ${
              activeTab === "settings"
                ? "bg-slate-900 border-slate-700 text-white shadow-lg shadow-black/10 text-emerald-400 font-medium"
                : "bg-slate-950 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Settings className={`w-5 h-5 ${activeTab === "settings" ? "text-emerald-400" : "text-slate-400"}`} />
            <span>Bot Configuration</span>
          </button>

          <button
            onClick={() => setActiveTab("commands")}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 transition-all duration-200 border ${
              activeTab === "commands"
                ? "bg-slate-900 border-slate-700 text-white shadow-lg shadow-black/10 text-emerald-400 font-medium"
                : "bg-slate-950 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Compass className={`w-5 h-5 ${activeTab === "commands" ? "text-emerald-400" : "text-slate-400"}`} />
            <span>Command Reference</span>
          </button>

          <button
            onClick={() => setActiveTab("deploy")}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center space-x-3 transition-all duration-200 border ${
              activeTab === "deploy"
                ? "bg-slate-900 border-slate-700 text-white shadow-lg shadow-black/10 text-emerald-400 font-medium"
                : "bg-slate-950 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            <Layers className={`w-5 h-5 ${activeTab === "deploy" ? "text-emerald-400" : "text-slate-400"}`} />
            <span>Host & Auto-Deploy</span>
          </button>

          {/* Alert messages system */}
          <div className="pt-6 space-y-2">
            <AnimatePresence>
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl p-3.5 text-xs flex items-start space-x-2"
                >
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-3.5 text-xs flex items-start space-x-2"
                >
                  <XCircle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Right column - Main Work Content */}
        <section id="work-content" className="lg:col-span-9">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: TERMINAL & ACTIVE CONTROL */}
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Control Panel Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Master Controls Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Power Switch</h2>
                        <Cpu className="w-5 h-5 text-slate-500" />
                      </div>
                      <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                        Toggle the Node.js server wrapper process to activate or deactivate the WhatsApp bot client. 
                        Live session state is stored persistently.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {!status.isAlive ? (
                        <button
                          onClick={handleStartBot}
                          disabled={loading}
                          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 text-slate-950 font-semibold rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/15"
                        >
                          <Play className="w-4.5 h-4.5 text-slate-950 fill-slate-950" />
                          <span>Boot Bot Server</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleStopBot}
                          disabled={loading}
                          className="px-5 py-3 bg-red-500 hover:bg-red-600 active:scale-95 disabled:opacity-50 text-slate-100 font-semibold rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-red-500/15"
                        >
                          <Square className="w-4.5 h-4.5 fill-current" />
                          <span>Stop Bot Server</span>
                        </button>
                      )}

                      <button
                        onClick={handleClearSession}
                        disabled={loading}
                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-medium rounded-xl flex items-center space-x-2 border border-slate-700 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                        <span>Clear Session (Logout)</span>
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Connection Wizard */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Connection Wizard</h2>
                      <Key className="w-5 h-5 text-slate-500" />
                    </div>

                    {/* Offline / Idle State */}
                    {!status.isAlive && (
                      <div className="text-center py-6 text-slate-500 text-sm">
                        <Bot className="w-10 h-10 mx-auto mb-2 text-slate-700 stroke-1" />
                        <span>Bot process is offline. Boot the server to connect.</span>
                      </div>
                    )}

                    {/* Prompting QR vs Pairing Option */}
                    {status.isAlive && status.status === "prompt_mode" && (
                      <div className="space-y-4">
                        <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg leading-relaxed">
                          ⚠️ This instance does not have an active login session. Choose a coupling method below:
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => selectPairingMethod("pairing")}
                            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl text-center transition-all hover:border-emerald-500/50"
                          >
                            Use Pairing Code (Recommended)
                          </button>
                          <button
                            onClick={() => selectPairingMethod("qr")}
                            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl text-center transition-all hover:border-emerald-500/50"
                          >
                            Scan QR Code (Requires terminal)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Phone Number Input for Pairing Mode */}
                    {status.isAlive && status.status === "pairing" && !status.pairingCode && (
                      <div className="space-y-3">
                        <label className="text-xs text-slate-400 block">Enter WhatsApp Phone Number:</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="62831109XXXXX"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && submitPhoneNumber()}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            onClick={submitPhoneNumber}
                            className="px-4 py-2 bg-emerald-400 text-slate-950 hover:bg-emerald-500 rounded-xl text-xs font-semibold flex items-center space-x-1"
                          >
                            <span>Link</span>
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500 leading-normal block">
                          Format: Use country code prefix without symbols (e.g. 628xxx for Indonesia, 1xxx for USA).
                        </span>
                      </div>
                    )}

                    {/* Pairing Code Display */}
                    {status.isAlive && status.status === "pairing" && status.pairingCode && (
                      <div className="space-y-4">
                        <div className="text-center py-2 bg-slate-950 border border-slate-800 rounded-xl p-4">
                          <span className="text-[10px] uppercase text-slate-500 tracking-widest block mb-1.5">Pairing Code</span>
                          <span className="text-2xl font-mono font-bold tracking-widest text-emerald-400 selection:bg-emerald-500 selection:text-slate-950">
                            {status.pairingCode}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs text-slate-400">
                          <span className="font-semibold text-slate-300">How to couple to WhatsApp:</span>
                          <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed pl-1">
                            <li>Open WhatsApp on your mobile phone</li>
                            <li>Tap menu <span className="text-slate-300 font-medium">Link Devices</span> &gt; <span className="text-slate-300 font-medium">Link with phone number instead</span></li>
                            <li>Enter the code exactly as displayed above</li>
                          </ol>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => triggerCopy(status.pairingCode || "", "code")}
                            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 border border-slate-700"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedText === "code" ? "Copied!" : "Copy Code"}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Connected State */}
                    {status.isAlive && status.status === "connected" && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-center py-8 rounded-xl p-4 space-y-3">
                        <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
                          <Bot className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-emerald-300">Bot is actively connected</h3>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Successfully linked to WhatsApp services! You can message your bot directly to call command events.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Console Terminal Log */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[480px]">
                  {/* Console Header */}
                  <div className="bg-slate-900 px-5 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
                    <div className="flex items-center space-x-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-mono font-medium text-slate-300">Terminal Log Output</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => triggerCopy(logs.join(""), "logs")}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white text-xs flex items-center space-x-1 border border-slate-700 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px] px-0.5">{copiedText === "logs" ? "Copied!" : "Copy Output"}</span>
                      </button>
                      <button
                        onClick={() => setLogs([])}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white text-xs flex items-center border border-slate-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] px-1">Clear Console</span>
                      </button>
                    </div>
                  </div>

                  {/* Console logs view */}
                  <div ref={terminalRef} className="flex-1 p-5 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 space-y-1.5 select-text selection:bg-emerald-500/30">
                    {logs.length === 0 ? (
                      <div className="text-slate-600 h-full flex items-center justify-center italic">
                        --- Terminal is silent. Boot the bot to see logging output ---
                      </div>
                    ) : (
                      logs.map((log, idx) => (
                        <div key={idx} className="whitespace-pre-wrap break-all">
                          {log}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Raw Stdin CLI input */}
                  {status.isAlive && (
                    <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex items-center space-x-2 shrink-0">
                      <span className="text-xs text-slate-500 font-mono select-none">&gt;_</span>
                      <input
                        type="text"
                        placeholder="Type direct terminal command or answer prompt..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendInput()}
                        className="flex-1 bg-transparent text-xs font-mono text-white focus:outline-none placeholder-slate-600 py-2"
                      />
                      <button
                        onClick={() => handleSendInput()}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 2: BOT CONFIGURATION */}
            {activeTab === "settings" && (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <Sliders className="w-5 h-5 text-emerald-400" />
                    <span>Configuration & AI Personas</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Fine-tune bot name properties, global features, and customize the central AI Character logic system.
                  </p>
                </div>

                {!config ? (
                  <div className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-700" />
                    <span>Loading configuration from server...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Character Identity Settings */}
                    <div className="border border-slate-800 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                        <User className="w-4 h-4 text-emerald-400" />
                        <span>Identity Profiles</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-300">Bot Call Name:</label>
                          <input
                            type="text"
                            value={botname}
                            onChange={(e) => setBotname(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-300">Full Bot Name:</label>
                          <input
                            type="text"
                            value={botfullname}
                            onChange={(e) => setBotfullname(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-300">Bot Nickname:</label>
                          <input
                            type="text"
                            value={botnickname}
                            onChange={(e) => setBotnickname(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-slate-300">Owner Display Name:</label>
                          <input
                            type="text"
                            value={ownername}
                            onChange={(e) => setOwnername(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* AI System Logic */}
                    <div className="border border-slate-800 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                          <Cpu className="w-4 h-4 text-emerald-400" />
                          <span>AI Persona Logic (System Instruction)</span>
                        </h3>
                        <span className="text-[10px] text-slate-500 font-mono">Custom Rules</span>
                      </div>

                      {/* Presets */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-[10px] text-slate-400 self-center font-medium">Quick Presets:</span>
                        {promptPresets.map((preset, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSystemLogic(preset.text);
                              showSuccess(`Loaded prompt preset: ${preset.name}`);
                            }}
                            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-[10px] text-slate-300 border border-slate-800 rounded-lg cursor-pointer transition"
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1.5">
                        <textarea
                          rows={6}
                          value={systemLogic}
                          onChange={(e) => setSystemLogic(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                          placeholder="- Nama kamu adalah Bella, asisten pintar..."
                        />
                      </div>
                    </div>

                    {/* Features Flags Toggles */}
                    <div className="border border-slate-800 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                        <Sliders className="w-4 h-4 text-emerald-400" />
                        <span>Core Feature Flags</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Toggle Public mode */}
                        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-950/60">
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Public Mode</span>
                            <span className="text-[10px] text-slate-500">True lets everyone chat, false restricts to owners.</span>
                          </div>
                          <button onClick={() => setIsPublic(!isPublic)} className="text-emerald-400 hover:scale-105 transition">
                            {isPublic ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                          </button>
                        </div>

                        {/* Toggle Autotyping */}
                        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-950/60">
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Auto Typing Status</span>
                            <span className="text-[10px] text-slate-500">Enable automatic typing badge on replying messages.</span>
                          </div>
                          <button onClick={() => setAutotyping(!autotyping)} className="text-emerald-400 hover:scale-105 transition">
                            {autotyping ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                          </button>
                        </div>

                        {/* Toggle Autoread PC */}
                        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-950/60">
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Auto Read Private Chats</span>
                            <span className="text-[10px] text-slate-500">Auto mark direct private messages as read instantly.</span>
                          </div>
                          <button onClick={() => setAutoreadpc(!autoreadpc)} className="text-emerald-400 hover:scale-105 transition">
                            {autoreadpc ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                          </button>
                        </div>

                        {/* Toggle Autoread GC */}
                        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-950/60">
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Auto Read Group Chats</span>
                            <span className="text-[10px] text-slate-500">Auto mark group conversation messages as read.</span>
                          </div>
                          <button onClick={() => setAutoreadgc(!autoreadgc)} className="text-emerald-400 hover:scale-105 transition">
                            {autoreadgc ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                          </button>
                        </div>

                        {/* Toggle React Stories */}
                        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-950/60">
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Auto React Stories (SW)</span>
                            <span className="text-[10px] text-slate-500">Saves and leaves random reaction emojis on stories.</span>
                          </div>
                          <button onClick={() => setReactswOn(!reactswOn)} className="text-emerald-400 hover:scale-105 transition">
                            {reactswOn ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                          </button>
                        </div>

                        {/* Toggle Anti-tag owner */}
                        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-950/60">
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Anti-tag Owner Shield</span>
                            <span className="text-[10px] text-slate-500">Warns users who mention/tag the owner's WhatsApp JID.</span>
                          </div>
                          <button onClick={() => setAntitagowner(!antitagowner)} className="text-emerald-400 hover:scale-105 transition">
                            {antitagowner ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                          </button>
                        </div>

                        {/* Toggle Call Block */}
                        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-950/60">
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Auto-Block Callers</span>
                            <span className="text-[10px] text-slate-500">Automatically block users who make voice/video calls.</span>
                          </div>
                          <button onClick={() => setCallBlock(!callBlock)} className="text-emerald-400 hover:scale-105 transition">
                            {callBlock ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                          </button>
                        </div>

                        {/* Toggle Call Reject */}
                        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-950/60">
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Auto-Reject Calls</span>
                            <span className="text-[10px] text-slate-500">Deny incoming audio/video calls without blocking user.</span>
                          </div>
                          <button onClick={() => setCallReject(!callReject)} className="text-emerald-400 hover:scale-105 transition">
                            {callReject ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Master Actions */}
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleSaveConfig}
                        disabled={loading}
                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/10 cursor-pointer"
                      >
                        {loading ? "Saving Settings..." : "Save Configuration"}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 3: COMMAND DIRECTORY */}
            {activeTab === "commands" && (
              <motion.div
                key="commands-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <Compass className="w-5 h-5 text-emerald-400" />
                    <span>Dynamic Command Reference Manual</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Search and explore active modular helper commands parsed dynamically from the chatbot's core helper event list.
                  </p>

                  <div className="mt-5 flex flex-col md:flex-row gap-4">
                    {/* Search Field */}
                    <input
                      type="text"
                      placeholder="Search active commands (e.g. ai, sticker, play)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />

                    {/* Category Selector */}
                    <div className="flex flex-wrap gap-2">
                      {["all", "ai", "media", "games", "owner"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCommandCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition capitalize border ${
                            commandCategory === cat
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                              : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Commands Grid list */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {commands
                    .filter((cmd) => cmd.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((cmd) => (
                      <div
                        key={cmd}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 hover:border-slate-700 hover:shadow-lg transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs font-semibold text-emerald-400">
                              . {cmd}
                            </span>
                            <span className="text-[9px] uppercase font-mono bg-slate-950 border border-slate-850 text-slate-500 px-1.5 py-0.5 rounded-full">
                              Event
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5">
                            Triggers the active <span className="font-mono text-slate-300">.{cmd}</span> function. Customize behavior inside the <span className="font-mono text-slate-300">/bot/helpers/Events/</span> folder structure.
                          </p>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-850/50 mt-4 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                          <span>Target: Text/Media</span>
                          <span className="text-emerald-500/80">Premium: False</span>
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}

            {/* TAB 4: DEPLOYMENT HELPER */}
            {activeTab === "deploy" && (
              <motion.div
                key="deploy-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Intro Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-emerald-400" />
                    <span>Host and Automatic Deploy Setup</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Detailed technical architectural guides and configuration templates for Netlify, Vercel Functions, and GitHub Actions CD integrations.
                  </p>
                </div>

                {/* Important Technical architecture explanation */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl p-5 text-xs space-y-3 leading-relaxed">
                  <div className="flex items-center space-x-2 text-white font-semibold">
                    <Info className="w-4.5 h-4.5 text-emerald-400" />
                    <span>Important Architecture Warning for Serverless Hosting</span>
                  </div>
                  <p>
                    WhatsApp bots based on <span className="font-semibold text-white">Baileys</span> need a <span className="font-semibold text-white">persistent, stateful state connection</span> (specifically WebSocket TCP client channels) to listen for incoming WhatsApp messages in real time.
                  </p>
                  <p>
                    Because <span className="font-semibold text-white">Netlify Functions</span> and <span className="font-semibold text-white">Vercel Serverless Functions</span> are strictly stateless and terminate execution after 10-60 seconds, they <span className="font-semibold text-white">CANNOT</span> keep a permanent active WhatsApp bot running continuously.
                  </p>
                  <p className="font-semibold text-white">
                    Recommended Free Persistent Alternatives (No Render, No Railway):
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-2 text-[11px]">
                    <li><span className="font-semibold text-slate-100">Koyeb (Eco Free Tier):</span> Supports continuous running of Docker containers. Highly recommended for deploying this WhatsApp bot and dashboard 24/7 completely free. Uses the pre-configured <span className="font-semibold text-emerald-400">Dockerfile</span> we created.</li>
                    <li><span className="font-semibold text-slate-100">Hugging Face Spaces (Docker SDK):</span> Completely free 24/7 hosting. You can create a new Docker Space, link your GitHub repository, and it will build and run automatically using the <span className="font-semibold text-emerald-400">Dockerfile</span>.</li>
                    <li><span className="font-semibold text-slate-100">Local Machine / VPS:</span> Running natively via <span className="font-mono text-white">npm run build && npm start</span>.</li>
                  </ul>
                </div>

                {/* Netlify deployment configuration */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileCode className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs font-mono font-semibold text-white">netlify.toml</span>
                    </div>
                    <button
                      onClick={() => triggerCopy(`[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200`, "netlify")}
                      className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center space-x-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedText === "netlify" ? "Copied!" : "Copy code"}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    This file configures the static deployment for the React single page app (SPA) dashboard to build and host smoothly on Netlify. Place this in your project root.
                  </p>
                  <pre className="bg-slate-950 p-4 rounded-xl text-[10px] font-mono text-emerald-300/90 overflow-x-auto border border-slate-850">
{`[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200`}
                  </pre>
                </div>

                {/* Vercel API backend logic configuration */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileCode className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs font-mono font-semibold text-white">vercel.json</span>
                    </div>
                    <button
                      onClick={() => triggerCopy(`{
  "version": 2,
  "builds": [
    {
      "src": "dist/server.cjs",
      "use": "@vercel/node"
    },
    {
      "src": "dist/**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "dist/server.cjs"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}`, "vercel")}
                      className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center space-x-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedText === "vercel" ? "Copied!" : "Copy code"}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    This file translates our Express APIs and full-stack compiled output into Vercel Serverless Node Functions for quick backend proxies. Put this in your root folder.
                  </p>
                  <pre className="bg-slate-950 p-4 rounded-xl text-[10px] font-mono text-emerald-300/90 overflow-x-auto border border-slate-850">
{`{
  "version": 2,
  "builds": [
    {
      "src": "dist/server.cjs",
      "use": "@vercel/node"
    },
    {
      "src": "dist/**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "dist/server.cjs"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}`}
                  </pre>
                </div>

                {/* GitHub Actions Auto Deployment CI/CD */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Github className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs font-mono font-semibold text-white">.github/workflows/deploy.yml</span>
                    </div>
                    <button
                      onClick={() => triggerCopy(`name: CI/CD Automatic Deployment

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Root Dependencies
        run: npm ci

      - name: Install Bot Dependencies
        run: |
          cd bot
          npm install --legacy-peer-deps

      - name: Build Dashboard & Server
        run: npm run build
        env:
          NODE_ENV: production

      - name: Deploy static assets to Netlify
        uses: nwtgck/actions-netlify@v3.0
        with:
          publish-dir: './dist'
          production-deploy: true
        env:
          NETLIFY_AUTH_TOKEN: \${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: \${{ secrets.NETLIFY_SITE_ID }}`, "github")}
                      className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center space-x-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedText === "github" ? "Copied!" : "Copy code"}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    This complete GitHub Action workflow automates the CI/CD pipeline, building both the React dashboard UI and installing backend bot dependencies whenever you push to your <span className="font-mono text-white">main</span> branch.
                  </p>
                  <pre className="bg-slate-950 p-4 rounded-xl text-[10px] font-mono text-emerald-300/90 overflow-x-auto border border-slate-850">
{`name: CI/CD Automatic Deployment

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Root Dependencies
        run: npm ci

      - name: Install Bot Dependencies
        run: |
          cd bot
          npm install --legacy-peer-deps

      - name: Build Dashboard & Server
        run: npm run build
        env:
          NODE_ENV: production

      - name: Deploy static assets to Netlify
        uses: nwtgck/actions-netlify@v3.0
        with:
          publish-dir: './dist'
          production-deploy: true
        env:
          NETLIFY_AUTH_TOKEN: \${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: \${{ secrets.NETLIFY_SITE_ID }}`}
                  </pre>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </section>

      </main>

      {/* Footer bar */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500 font-mono">
        <p>© 2026 Experimental-Bell Dashboard Panel. Built for Cloud Run & Vercel server environments.</p>
      </footer>
    </div>
  );
}
