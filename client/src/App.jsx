import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Settings, 
  Shield, 
  ShieldAlert, 
  Pill, 
  Activity, 
  Lock, 
  Unlock, 
  Sun, 
  Thermometer, 
  Video, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Wifi, 
  ChevronRight, 
  UserCheck, 
  PhoneCall,
  X,
  FileCode,
  Terminal,
  RefreshCw
} from 'lucide-react';
import Inspector from './components/Inspector';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [alexaState, setAlexaState] = useState('IDLE'); // 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ALERT'
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      text: "Good morning, Eleanor. Your resting heart rate is 78 bpm, and your morning Lisinopril is logged. Ring perimeter sensors report all entry points secured. How can I assist you right now?",
      timestamp: '08:00 AM',
      type: 'STATUS_SUMMARY'
    }
  ]);
  const [activeCard, setActiveCard] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [careState, setCareState] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [lastTelemetry, setLastTelemetry] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Sync clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch backend data
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
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speech Synthesis
  const speakText = (text) => {
    if (!isSpeechEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const cleanVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google'))) || voices[0];
    if (cleanVoice) utterance.voice = cleanVoice;

    utterance.onstart = () => setAlexaState('SPEAKING');
    utterance.onend = () => setAlexaState(activeCard?.type === 'EMERGENCY_ALERT' ? 'ALERT' : 'IDLE');
    utterance.onerror = () => setAlexaState('IDLE');

    window.speechSynthesis.speak(utterance);
  };

  // Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setAlexaState('LISTENING');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        handleSendMessage(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setAlexaState('IDLE');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [isSpeechEnabled]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Microphone recognition requires a supported browser (Chrome, Edge, Safari).");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setAlexaState('IDLE');
    } else {
      window.speechSynthesis?.cancel();
      recognitionRef.current.start();
    }
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    setInputText('');
    setAlexaState('THINKING');

    const newMessages = [
      ...messages,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
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
            setAlexaState('ALERT');
          }
        }

        setMessages(prev => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            auiCard,
            toolCalls
          }
        ]);

        fetchData();
        speakText(text);
      }
    } catch (err) {
      console.error("Message processing failed:", err);
      setAlexaState('IDLE');
    }
  };

  const handleToggleDoor = async () => {
    try {
      const newAction = careState?.smartHome?.frontDoorLocked ? 'unlock' : 'lock';
      await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'smart_home_control',
            arguments: { deviceType: 'smart_lock', action: newAction }
          }
        })
      });
      fetchData();
    } catch (e) {
      console.warn("Toggle failed:", e);
    }
  };

  const handleToggleMedication = async (medName) => {
    try {
      await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'verify_medication',
            arguments: { medicationName: medName, action: 'mark_taken' }
          }
        })
      });
      fetchData();
    } catch (e) {
      console.warn("Med toggle failed:", e);
    }
  };

  const handleReset = async () => {
    await fetch('/api/reset', { method: 'POST' });
    setActiveCard(null);
    setAlexaState('IDLE');
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col justify-between font-sans selection:bg-[#00a8e1]">
      
      {/* 1. TOP STATUS BAR (Authentic Echo Show 15 OS) */}
      <header className="h-14 px-6 border-b border-white/[0.06] bg-[#0e141f] flex items-center justify-between text-xs tracking-wide select-none">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#00a8e1] flex items-center justify-center font-bold text-[11px] text-white tracking-tighter">
              a
            </div>
            <span className="font-semibold text-slate-100 text-sm tracking-tight">Alexa+ CareSync</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono border border-slate-700/60">
              Echo Show 15
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4 pl-4 border-l border-white/10 text-slate-400 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400/80" />
              <span>71°F Seattle</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Wifi className="w-3.5 h-3.5" />
              <span>Connected</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">Patient: Eleanor Vance (72)</span>
          </div>

          <button
            onClick={() => {
              if (isSpeechEnabled) window.speechSynthesis?.cancel();
              setIsSpeechEnabled(!isSpeechEnabled);
            }}
            className="p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title={isSpeechEnabled ? "Voice Audio Active" : "Voice Audio Muted"}
          >
            {isSpeechEnabled ? <Volume2 className="w-4 h-4 text-[#00a8e1]" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={handleReset}
            className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] transition"
            title="Reset to default nominal state"
          >
            Reset
          </button>

          <button
            onClick={() => setIsInspectorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 text-[11px] transition font-medium"
          >
            <Settings className="w-3.5 h-3.5 text-[#00a8e1]" />
            <span>Developer Protocol</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN 2-COLUMN VIEWPORT */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 overflow-hidden max-w-[1720px] w-full mx-auto">
        
        {/* LEFT COLUMN: Conversational Workspace & Clinical Card Stream (5 cols) */}
        <section className="lg:col-span-5 echo-widget flex flex-col p-4 overflow-hidden shadow-lg">
          
          {/* Header of Assistant Panel */}
          <div className="echo-widget-header pb-3 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <span className={`w-2 h-2 rounded-full ${alexaState === 'ALERT' ? 'bg-red-500 animate-pulse' : alexaState === 'LISTENING' ? 'bg-[#00a8e1] animate-pulse' : 'bg-slate-500'}`}></span>
              <span>Voice Interaction</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
              {alexaState === 'ALERT' ? 'Critical Alert' :
               alexaState === 'LISTENING' ? 'Listening...' :
               alexaState === 'THINKING' ? 'Processing MCP Tool...' :
               alexaState === 'SPEAKING' ? 'Speaking...' :
               'Standby'}
            </span>
          </div>

          {/* Sample Utterances / Test Cases */}
          <div className="mb-3">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block mb-1.5">
              Verified Utterances:
            </span>
            <div className="grid grid-cols-1 gap-1.5 text-[11px]">
              <button
                onClick={() => handleSendMessage("Alexa, I have acute chest tightness and shortness of breath")}
                className="text-left px-2.5 py-1.5 rounded-lg bg-red-950/25 hover:bg-red-900/35 border border-red-900/40 text-red-300 transition flex items-center justify-between group"
              >
                <span>"I have acute chest tightness and shortness of breath"</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
              </button>
              <button
                onClick={() => handleSendMessage("Alexa, check my evening medication schedule")}
                className="text-left px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-slate-300 transition flex items-center justify-between group"
              >
                <span>"Check my evening medication schedule"</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
              </button>
              <button
                onClick={() => handleSendMessage("Alexa, query current vitals and glucose sensor telemetry")}
                className="text-left px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-slate-300 transition flex items-center justify-between group"
              >
                <span>"Query current vitals and glucose sensor telemetry"</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
              </button>
              <button
                onClick={() => handleSendMessage("Alexa, secure front entrance and adjust ambient lighting")}
                className="text-left px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-slate-300 transition flex items-center justify-between group"
              >
                <span>"Secure front entrance and adjust ambient lighting"</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
            {messages.map(msg => (
              <div 
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-[#1b3a5b] text-white border border-[#234c75]' 
                    : 'bg-[#182130] text-slate-200 border border-white/[0.06]'
                }`}>
                  <p>{msg.text}</p>

                  {/* Tool Execution Markers */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/[0.08] space-y-1">
                      {msg.toolCalls.map((call, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[10px] font-mono text-[#00a8e1]">
                          <Terminal className="w-3 h-3 shrink-0" />
                          <span>mcp.tools.{call.toolName}()</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <span className="block mt-1.5 text-[9px] text-slate-400 font-mono text-right">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Controls */}
          <div className="pt-3 border-t border-white/[0.06] flex items-center gap-2">
            <button
              onClick={toggleListening}
              className={`p-2.5 rounded-lg transition ${
                isListening 
                  ? 'bg-red-600 text-white animate-pulse' 
                  : 'bg-[#00a8e1] hover:bg-[#0094c7] text-white'
              }`}
              title="Push to speak (Web Speech STT)"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask Alexa or invoke an MCP tool..."
              className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00a8e1]"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* RIGHT COLUMN: Multimodal Echo Show 15 Widgets (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-4 overflow-y-auto pr-1">
          
          {/* Active Dynamic Card Stage */}
          {activeCard && activeCard.type === 'EMERGENCY_ALERT' && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 shadow-md">
              <div className="flex items-center justify-between pb-2.5 border-b border-red-800/40 mb-3">
                <div className="flex items-center gap-2 text-red-400 font-semibold text-xs tracking-wide">
                  <ShieldAlert className="w-4 h-4" />
                  <span>EMERGENCY DISPATCH INITIATED (CODE RED)</span>
                </div>
                <span className="text-[10px] font-mono text-red-300">INCIDENT ID: INC-9419</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed mb-3">
                {activeCard.details}
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-red-900/40">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Physical Access</span>
                  <span className="font-semibold text-emerald-400">Door Unlocked for Responders</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-red-900/40">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Primary Contact</span>
                  <span className="font-semibold text-slate-200">David Vance (SMS & Call Sent)</span>
                </div>
              </div>
            </div>
          )}

          {/* Widget 1: Ring Smart Home & Physical Access Controls */}
          <div className="echo-widget p-4 shadow-sm">
            <div className="echo-widget-header pb-2.5 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Shield className="w-3.5 h-3.5 text-[#00a8e1]" />
                <span>Ring Security & Physical Home Controls</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">Perimeter Armed</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Smart Lock */}
              <div className="p-3 rounded-lg bg-[#0e141f] border border-white/[0.05] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-slate-400">Front Door</span>
                  <button 
                    onClick={handleToggleDoor}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300 transition"
                    title="Toggle Lock State"
                  >
                    {careState?.smartHome?.frontDoorLocked ? (
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </button>
                </div>
                <div className={`text-xs font-semibold ${careState?.smartHome?.frontDoorLocked ? 'text-slate-200' : 'text-red-400'}`}>
                  {careState?.smartHome?.frontDoorLocked ? 'LOCKED' : 'UNLOCKED (Responders)'}
                </div>
                <span className="text-[9px] text-slate-400 mt-1">Ring Smart Lock Pro</span>
              </div>

              {/* Lighting */}
              <div className="p-3 rounded-lg bg-[#0e141f] border border-white/[0.05] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-slate-400">Pathway Illumination</span>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  {careState?.smartHome?.emergencyPathwayLights ? 'EMERGENCY STROBE' : careState?.smartHome?.ambientLights || 'Warm White (45%)'}
                </div>
                <span className="text-[9px] text-slate-400 mt-1">Circadian Ambient</span>
              </div>

              {/* Climate */}
              <div className="p-3 rounded-lg bg-[#0e141f] border border-white/[0.05] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-slate-400">Climate</span>
                  <Thermometer className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  {careState?.smartHome?.thermostatTemp || 72}°F (Eco Target)
                </div>
                <span className="text-[9px] text-slate-400 mt-1">Amazon Thermostat</span>
              </div>
            </div>
          </div>

          {/* Widget 2: Continuous Physiological Telemetry */}
          <div className="echo-widget p-4 shadow-sm">
            <div className="echo-widget-header pb-2.5 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Continuous Physiological Sensor Stream</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Updated: {careState?.patient?.vitals?.lastUpdated || 'Live'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#0e141f] border border-white/[0.05]">
                <span className="text-[10px] text-slate-400 block mb-1">Resting Heart Rate</span>
                <span className="text-sm font-semibold text-slate-100">{careState?.patient?.vitals?.heartRate || 78} bpm</span>
                <div className="mt-2 h-4 w-full flex items-end gap-0.5">
                  {[40, 55, 70, 60, 80, 45, 65, 78, 70, 78].map((val, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-emerald-500/70 rounded-xs" 
                      style={{ height: `${(val / 80) * 100}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0e141f] border border-white/[0.05]">
                <span className="text-[10px] text-slate-400 block mb-1">Blood Pressure</span>
                <span className="text-sm font-semibold text-slate-100">{careState?.patient?.vitals?.bloodPressure || '128/82'}</span>
                <span className="text-[9px] text-emerald-400 block mt-2">Stage 1 Controlled</span>
              </div>

              <div className="p-3 rounded-lg bg-[#0e141f] border border-white/[0.05]">
                <span className="text-[10px] text-slate-400 block mb-1">SpO2 Oxygen</span>
                <span className="text-sm font-semibold text-slate-100">{careState?.patient?.vitals?.spo2 || '98%'}</span>
                <span className="text-[9px] text-emerald-400 block mt-2">Nominal Baseline</span>
              </div>

              <div className="p-3 rounded-lg bg-[#0e141f] border border-white/[0.05]">
                <span className="text-[10px] text-slate-400 block mb-1">Blood Glucose</span>
                <span className="text-sm font-semibold text-slate-100">{careState?.patient?.vitals?.bloodGlucose || '110 mg/dL'}</span>
                <span className="text-[9px] text-emerald-400 block mt-2">Fasting Target</span>
              </div>
            </div>
          </div>

          {/* Widget 3: Medication Adherence & Regimen */}
          <div className="echo-widget p-4 shadow-sm">
            <div className="echo-widget-header pb-2.5 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Pill className="w-3.5 h-3.5 text-cyan-400" />
                <span>Daily Medication Regimen & Verification</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">EHR Verified</span>
            </div>

            <div className="space-y-2">
              {careState?.patient?.medications?.map(med => (
                <div 
                  key={med.id}
                  className="p-2.5 rounded-lg bg-[#0e141f] border border-white/[0.05] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleToggleMedication(med.name)}
                      className="text-slate-400 hover:text-white transition"
                    >
                      {med.taken ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                    <div>
                      <span className="text-xs font-medium text-slate-200 block">{med.name}</span>
                      <span className="text-[10px] text-slate-400">{med.instructions}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                    med.taken ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {med.taken ? 'CONFIRMED' : med.timeOfDay.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </section>
      </main>

      {/* 3. SIGNATURE ECHO SHOW CYAN LIGHT BAR (Reacts to voice state at bottom edge) */}
      <footer className="w-full relative">
        <div className={`w-full ${
          alexaState === 'ALERT' ? 'alexa-light-bar-alert' :
          alexaState === 'LISTENING' ? 'alexa-light-bar-active' :
          alexaState === 'THINKING' ? 'alexa-light-bar-thinking' :
          alexaState === 'SPEAKING' ? 'alexa-light-bar-active' :
          'alexa-light-bar-idle'
        }`}></div>
      </footer>

      {/* DEVELOPER PROTOCOL & MCP INSPECTOR DRAWER */}
      <Inspector
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        systemStatus={systemStatus}
        telemetry={lastTelemetry}
      />
    </div>
  );
}
