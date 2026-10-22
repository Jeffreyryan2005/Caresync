import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Terminal, 
  ShieldAlert, 
  Pill, 
  HeartPulse, 
  Home, 
  Calendar, 
  RotateCcw, 
  CheckCircle, 
  Sparkles,
  Lock,
  Unlock,
  Lightbulb,
  Thermometer,
  Video,
  Clock,
  Wifi,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Inspector from './components/Inspector';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [orbState, setOrbState] = useState('IDLE'); // 'IDLE', 'LISTENING', 'THINKING', 'SPEAKING', 'EMERGENCY'
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Good morning, Eleanor! I'm here running on your Echo Show with full ambient CareSync intelligence. All your vitals are steady, your morning Lisinopril is logged, and the home is comfortable at 72°F. How are you feeling today?",
      auiCard: {
        type: 'WELLNESS_BRIEF',
        title: '☀️ Alexa+ Ambient Morning Briefing',
        patient: 'Eleanor Vance',
        vitals: { heartRate: 78, bloodPressure: '128/82 mmHg', spo2: '98%', bloodGlucose: '110 mg/dL' }
      }
    }
  ]);
  const [activeCard, setActiveCard] = useState(messages[0].auiCard);
  const [systemStatus, setSystemStatus] = useState(null);
  const [careState, setCareState] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [lastTelemetry, setLastTelemetry] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Clock ticker for Echo Show header
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial system status and care state
  const fetchData = async () => {
    try {
      const [resStatus, resState] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/state')
      ]);
      const dataStatus = await resStatus.json();
      const dataState = await resState.json();
      setSystemStatus(dataStatus);
      if (dataState.success) setCareState(dataState.data);
    } catch (err) {
      console.warn("Backend poll error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Web Speech Synthesis (Alexa voice)
  const speakText = (text) => {
    if (!isSpeechEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.02;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Zira'))) || voices[0];
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onstart = () => setOrbState('SPEAKING');
    utterance.onend = () => {
      setOrbState(activeCard?.type === 'EMERGENCY_ALERT' ? 'EMERGENCY' : 'IDLE');
    };
    utterance.onerror = () => setOrbState('IDLE');

    window.speechSynthesis.speak(utterance);
  };

  // Web Speech Recognition (Mic Voice Input)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setOrbState('LISTENING');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        handleSendMessage(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setOrbState('IDLE');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [isSpeechEnabled]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input is supported in Google Chrome, Microsoft Edge, and Safari.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setOrbState('IDLE');
    } else {
      window.speechSynthesis?.cancel();
      recognitionRef.current.start();
    }
  };

  // Send message to backend
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    setInputText('');
    setOrbState('THINKING');

    const newMessages = [
      ...messages,
      { id: `user_${Date.now()}`, role: 'user', text: query }
    ];
    setMessages(newMessages);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: newMessages.slice(-6).map(m => ({ role: m.role, content: m.text }))
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        const { text, auiCard, telemetry, toolCalls } = json.data;

        setLastTelemetry(telemetry);
        if (auiCard) {
          setActiveCard(auiCard);
          if (auiCard.type === 'EMERGENCY_ALERT') {
            setOrbState('EMERGENCY');
            confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 }, colors: ['#ef4444', '#dc2626'] });
          } else if (auiCard.type === 'MEDICATION_SCHEDULE') {
            confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 }, colors: ['#10b981', '#06b6d4'] });
          }
        }

        setMessages(prev => [
          ...prev,
          {
            id: `asst_${Date.now()}`,
            role: 'assistant',
            text,
            auiCard,
            toolCalls
          }
        ]);

        fetchData();
        speakText(text);
      }
    } catch (err) {
      console.error("Message processing failed:", err);
      setOrbState('IDLE');
    }
  };

  // Reset Demo State
  const handleResetDemo = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
      fetchData();
      setOrbState('IDLE');
      setActiveCard(messages[0].auiCard);
      alert("Demo state reset to clean baseline!");
    } catch (e) {
      console.warn("Reset error:", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden relative selection:bg-cyan-500 selection:text-white">
      {/* Background Ambient Aura */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* TOP BAR: Echo Show 15 Smart Display Header */}
      <header className="px-6 py-3 border-b border-slate-800/80 glass-panel flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white">Alexa+ CareSync</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono">
                  Echo Show 15
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Autonomous Health & Smart Home Agent • Model Context Protocol</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Patient: <strong className="text-slate-200">Eleanor Vance (Age 72)</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Engine Mode Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/60 text-xs">
            <div className={`w-2 h-2 rounded-full ${systemStatus?.engine?.mode === 'LIVE_AWS_BEDROCK' ? 'bg-amber-400' : 'bg-cyan-400'}`}></div>
            <span className="text-slate-300 font-mono text-[11px]">
              {systemStatus?.engine?.mode === 'LIVE_AWS_BEDROCK' ? 'AWS Bedrock Live' : 'Bedrock Intelligent Fallback'}
            </span>
          </div>

          {/* Time & Weather */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-300 font-mono px-2 py-1 rounded bg-slate-900/50 border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span className="text-slate-500">|</span>
            <span>72°F Seattle</span>
          </div>

          {/* Voice Mute Toggle */}
          <button
            onClick={() => {
              if (isSpeechEnabled) window.speechSynthesis?.cancel();
              setIsSpeechEnabled(!isSpeechEnabled);
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title={isSpeechEnabled ? "Alexa Voice Output Enabled" : "Voice Output Muted"}
          >
            {isSpeechEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Reset Demo Button */}
          <button
            onClick={handleResetDemo}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs"
            title="Reset Demo State to Baseline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Judge MCP Inspector Trigger */}
          <button
            onClick={() => setIsInspectorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium shadow-md shadow-cyan-600/30 transition text-xs"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Judge Inspector</span>
          </button>
        </div>
      </header>

      {/* MAIN TWO-COLUMN LIVING ROOM CANVAS */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
        
        {/* LEFT COLUMN: Alexa+ Conversational Hub & Dynamic Orb (5 cols) */}
        <section className="lg:col-span-5 flex flex-col glass-panel rounded-2xl border border-slate-800/80 p-5 shadow-2xl overflow-hidden relative">
          
          {/* Ambient Glowing Alexa+ Orb Stage */}
          <div className="flex flex-col items-center justify-center py-6 border-b border-slate-800/60 relative">
            <div className="relative flex items-center justify-center">
              {/* Orb Rings */}
              <div className={`w-32 h-32 rounded-full transition-all duration-700 flex items-center justify-center ${
                orbState === 'EMERGENCY'
                  ? 'bg-gradient-to-tr from-rose-600 to-red-500 alexa-orb-emergency'
                  : orbState === 'LISTENING'
                  ? 'bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 alexa-orb-listening'
                  : orbState === 'THINKING'
                  ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-600 alexa-orb-thinking'
                  : orbState === 'SPEAKING'
                  ? 'bg-gradient-to-tr from-cyan-400 to-teal-500 alexa-orb-listening'
                  : 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-700 alexa-orb-idle'
              }`}>
                {/* Center Core */}
                <div className="w-20 h-20 rounded-full bg-slate-950/80 backdrop-blur-md flex items-center justify-center border border-white/20">
                  {orbState === 'EMERGENCY' ? (
                    <ShieldAlert className="w-8 h-8 text-rose-400 animate-bounce" />
                  ) : orbState === 'LISTENING' ? (
                    <Mic className="w-8 h-8 text-cyan-300 animate-pulse" />
                  ) : orbState === 'THINKING' ? (
                    <Sparkles className="w-8 h-8 text-purple-300 animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-cyan-400/80 shadow-lg shadow-cyan-400/50"></div>
                  )}
                </div>
              </div>
            </div>

            {/* Orb Status Label */}
            <div className="mt-4 flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase font-mono ${
                orbState === 'EMERGENCY' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                orbState === 'LISTENING' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' :
                orbState === 'THINKING' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                orbState === 'SPEAKING' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' :
                'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              }`}>
                {orbState === 'EMERGENCY' ? '🚨 EMERGENCY DISPATCH ACTIVE' :
                 orbState === 'LISTENING' ? 'Listening...' :
                 orbState === 'THINKING' ? 'Bedrock MCP Reasoning...' :
                 orbState === 'SPEAKING' ? 'Alexa Speaking' :
                 'Alexa+ Ready'}
              </span>
            </div>
          </div>

          {/* Quick Voice Prompt Pills for Judges */}
          <div className="py-3 border-b border-slate-800/60">
            <p className="text-[11px] text-slate-400 mb-2 font-medium">Quick Test Prompts (1-Click Evaluation):</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "🚨 Chest Pain & Dizziness", query: "Alexa, I have sudden chest tightness and I feel dizzy" },
                { label: "💊 Check Metformin Dose", query: "Alexa, did I take my evening Metformin pill?" },
                { label: "💓 Vital Signs Stream", query: "Alexa, what are my current vitals and glucose?" },
                { label: "🚪 Lock Front Door", query: "Alexa, lock the front door and set ambient lighting" },
                { label: "🩺 Book Doctor Checkup", query: "Alexa, schedule an appointment with Dr. Chen tomorrow" }
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip.query)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dialogue History Stream */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
            {messages.map(msg => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'glass-card text-slate-200 border border-slate-700/50 rounded-tl-none'
                }`}>
                  <p>{msg.text}</p>

                  {/* Tool Call Pills */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-wrap gap-1">
                      {msg.toolCalls.map((t, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/70 border border-cyan-800/50 text-cyan-300 flex items-center gap-1">
                          <Terminal className="w-2.5 h-2.5" />
                          MCP: {t.toolName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Voice & Text Input Bar */}
          <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
            <button
              onClick={toggleListening}
              className={`p-3 rounded-xl transition shadow-lg ${
                isListening 
                  ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/40' 
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30'
              }`}
              title="Speak to Alexa+ (Web Speech STT)"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask Alexa anything or test an MCP tool..."
              className="flex-1 bg-slate-900/90 border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-400 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* RIGHT COLUMN: Multimodal APL Display & Smart Home Ecosystem (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-5 overflow-y-auto">
          
          {/* Active Visual APL Card Stage */}
          {activeCard && (
            <div className={`p-5 rounded-2xl border shadow-xl transition-all duration-500 ${
              activeCard.type === 'EMERGENCY_ALERT' 
                ? 'bg-gradient-to-br from-rose-950/70 via-slate-900 to-slate-950 border-rose-600/60' 
                : 'glass-panel border-cyan-800/40'
            }`}>
              
              {/* Emergency Banner */}
              {activeCard.type === 'EMERGENCY_ALERT' && (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-rose-800/50 mb-4">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                      <ShieldAlert className="w-5 h-5 animate-pulse" />
                      <span>{activeCard.title}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-mono font-semibold">
                      CODE RED
                    </span>
                  </div>
                  <p className="text-xs text-rose-200/90 leading-relaxed mb-4">{activeCard.details}</p>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-900/50">
                      <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                        <Unlock className="w-3 h-3 text-emerald-400" />
                        <span>SMART DOOR STATUS</span>
                      </div>
                      <div className="text-xs font-semibold text-emerald-400">UNLOCKED (First Responders)</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-900/50">
                      <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3 text-amber-400" />
                        <span>EMERGENCY LIGHTS</span>
                      </div>
                      <div className="text-xs font-semibold text-amber-300">ACTIVE (High Strobe)</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Medication Card */}
              {activeCard.type === 'MEDICATION_SCHEDULE' && (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                      <Pill className="w-5 h-5" />
                      <span>{activeCard.title}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">Daily Adherence: 67%</span>
                  </div>

                  <div className="space-y-2.5">
                    {activeCard.medications?.map((m) => (
                      <div key={m.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                            <span>{m.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal uppercase">
                              {m.timeOfDay}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{m.instructions}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 ${
                          m.taken 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          <CheckCircle className="w-3 h-3" />
                          {m.taken ? 'Taken' : 'Scheduled'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vitals Overview Card */}
              {activeCard.type === 'VITALS_OVERVIEW' && (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <HeartPulse className="w-5 h-5" />
                      <span>{activeCard.title}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Sensors: Nominal</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Heart Rate</span>
                      <div className="text-base font-bold text-slate-100 mt-0.5">{activeCard.vitals?.heartRate} bpm</div>
                      <span className="text-[10px] text-emerald-400">Resting Normal</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Blood Pressure</span>
                      <div className="text-base font-bold text-slate-100 mt-0.5">{activeCard.vitals?.bloodPressure}</div>
                      <span className="text-[10px] text-emerald-400">Controlled</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Oxygen (SpO2)</span>
                      <div className="text-base font-bold text-slate-100 mt-0.5">{activeCard.vitals?.spo2}</div>
                      <span className="text-[10px] text-emerald-400">Optimal</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Blood Glucose</span>
                      <div className="text-base font-bold text-slate-100 mt-0.5">{activeCard.vitals?.bloodGlucose}</div>
                      <span className="text-[10px] text-emerald-400">Fasting Target</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Telehealth Appointment Card */}
              {activeCard.type === 'APPOINTMENT_CONFIRMATION' && (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                      <Calendar className="w-5 h-5" />
                      <span>{activeCard.title}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-mono">
                      SYNCED
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
                    <p><strong className="text-slate-300">Provider:</strong> {activeCard.details?.provider}</p>
                    <p><strong className="text-slate-300">Scheduled Time:</strong> {activeCard.details?.time}</p>
                    <p><strong className="text-slate-300">Channel:</strong> {activeCard.details?.type}</p>
                  </div>
                </div>
              )}

              {/* General Morning Briefing Card */}
              {activeCard.type === 'WELLNESS_BRIEF' && (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                      <Sparkles className="w-5 h-5" />
                      <span>{activeCard.title}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">Ready for the day</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Vitals Status</div>
                      <div className="text-sm font-semibold text-emerald-400 mt-0.5">Normal (78 bpm)</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Morning Meds</div>
                      <div className="text-sm font-semibold text-cyan-300 mt-0.5">Lisinopril Taken ✓</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Environment</div>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">72°F Comfort</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Connected Ambient Smart Home Dashboard (Ring & Alexa Devices) */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800/80 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                <Home className="w-4 h-4 text-cyan-400" />
                <span>Ambient Smart Home & Ring Security Subsystem</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-mono">
                MCP Device Sync
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Front Door Lock */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-slate-400 font-medium">Front Door Lock</span>
                  {careState?.smartHome?.frontDoorLocked ? (
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-rose-400" />
                  )}
                </div>
                <div className="text-xs font-bold text-slate-200">
                  {careState?.smartHome?.frontDoorLocked ? 'SECURELY LOCKED' : 'UNLOCKED (Emergency)'}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Ring Smart Lock Pro</p>
              </div>

              {/* Ambient Lights */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-slate-400 font-medium">Ambient Lighting</span>
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xs font-bold text-slate-200">
                  {careState?.smartHome?.ambientLights || 'Warm White (45%)'}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Circadian Rhythm Active</p>
              </div>

              {/* Thermostat */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-slate-400 font-medium">Thermostat</span>
                  <Thermometer className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-xs font-bold text-slate-200">
                  {careState?.smartHome?.thermostatTemp || 72}°F (Eco-Comfort)
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Amazon Smart Thermostat</p>
              </div>
            </div>

            {/* Emergency Contacts Footer */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Care Circle:</span>
                <span className="text-slate-300">David Vance (Son)</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-300">Dr. Robert Chen (PCP)</span>
              </div>
              <div className="text-cyan-400/80 font-mono text-[10px]">
                Ring Camera: Armed & Monitoring
              </div>
            </div>
          </div>

          {/* Hackathon Submission Credentials & Architecture Strip */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Amazon Developer Hackathon Submission</strong>: Fully conforms to Model Context Protocol (MCP) Streamable HTTP + SSE specification with AWS Bedrock Converse API multi-agent tool execution.
              </span>
            </div>
            <button
              onClick={() => setIsInspectorOpen(true)}
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline shrink-0 cursor-pointer"
            >
              Open MCP Inspector →
            </button>
          </div>

        </section>
      </div>

      {/* DEVELOPER & JUDGE MCP INSPECTOR MODAL */}
      <Inspector
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        systemStatus={systemStatus}
        telemetry={lastTelemetry}
      />
    </div>
  );
}
