import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Cpu, 
  Server, 
  Activity, 
  RefreshCw, 
  Copy, 
  Check, 
  X,
  Code2,
  Layers,
  ShieldCheck
} from 'lucide-react';

export default function Inspector({ systemStatus, telemetry, isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [activeTab, setActiveTab] = useState('LOGS'); // 'LOGS' | 'SCHEMAS' | 'TELEMETRY'
  const [filter, setFilter] = useState('ALL');

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (e) {
      console.warn("Failed to fetch logs:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'ALL') return true;
    if (filter === 'MCP') return log.source.startsWith('MCP');
    if (filter === 'BEDROCK') return log.source.includes('BEDROCK');
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#0c121d] border-l border-white/[0.08] shadow-2xl z-50 flex flex-col font-mono text-xs">
      
      {/* Console Header */}
      <div className="h-14 px-5 border-b border-white/[0.08] flex items-center justify-between bg-[#090d15]">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-[#00a8e1]" />
          <div>
            <h2 className="font-semibold text-slate-100 text-xs tracking-wide">Developer Protocol Console</h2>
            <p className="text-[10px] text-slate-400 font-sans">Model Context Protocol (MCP) JSON-RPC 2.0 & Bedrock Telemetry</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchLogs}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Refresh Stream"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-[#080c13] border-b border-white/[0.06]">
        <div className="p-2.5 rounded bg-[#101724] border border-white/[0.04]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">AI Engine</span>
          <span className="font-semibold text-slate-200 truncate block text-[11px]">
            {systemStatus?.engine?.mode === 'LIVE_AWS_BEDROCK' ? 'Amazon Bedrock' : 'Neural Core'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Claude 3.5 Sonnet</span>
        </div>

        <div className="p-2.5 rounded bg-[#101724] border border-white/[0.04]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">MCP Protocol</span>
          <span className="font-semibold text-slate-200 text-[11px] block">Streamable HTTP / SSE</span>
          <span className="text-[10px] text-emerald-400 font-mono">6 Tools Active</span>
        </div>

        <div className="p-2.5 rounded bg-[#101724] border border-white/[0.04]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">Converse Latency</span>
          <span className="font-semibold text-slate-200 text-[11px] block">
            {telemetry?.latencyMs ? `${telemetry.latencyMs} ms` : '178 ms'}
          </span>
          <span className="text-[10px] text-[#00a8e1] font-mono">Converse API</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/[0.06] bg-[#0c121d] font-sans text-xs">
        {['LOGS', 'SCHEMAS'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded text-[11px] font-medium transition ${
              activeTab === tab 
                ? 'bg-slate-800 text-white' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'LOGS' ? 'JSON-RPC Packet Log' : 'MCP Tool Schemas'}
          </button>
        ))}

        {activeTab === 'LOGS' && (
          <div className="ml-auto flex items-center gap-1 text-[10px]">
            {['ALL', 'MCP', 'BEDROCK'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded transition ${
                  filter === f ? 'bg-[#00a8e1]/20 text-[#00a8e1] font-semibold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Protocol Stream */}
      {activeTab === 'LOGS' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Activity className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p className="text-[11px]">No protocol packets captured yet.</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Issue voice requests on the main dashboard to view execution frames.</p>
            </div>
          ) : (
            filteredLogs.map(log => (
              <div 
                key={log.id}
                className="p-3 rounded bg-[#090e17] border border-white/[0.05] hover:border-white/[0.1] transition"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-800 text-slate-300">
                      {log.source}
                    </span>
                    <span className="text-slate-200 text-[11px] font-mono">{log.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-sans">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => copyToClipboard(log.payload, log.id)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                      title="Copy payload"
                    >
                      {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="bg-[#05080f] rounded p-2 overflow-x-auto text-[10px] text-slate-300 border border-white/[0.03]">
                  <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: MCP Tool Schemas */}
      {activeTab === 'SCHEMAS' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {[
            {
              name: "triage_health_symptoms",
              desc: "Evaluates patient symptoms, physiological vitals, and historical EHR records against clinical triage algorithms.",
              params: "{ symptoms: string[], duration: string, patientId: string }"
            },
            {
              name: "trigger_emergency_escalation",
              desc: "Dispatches paramedic dispatch packet, unlocks Ring smart door locks, and initiates pathway strobe.",
              params: "{ urgencyLevel: 'YELLOW'|'ORANGE'|'RED_CRITICAL', reason: string, notifyContacts: boolean }"
            },
            {
              name: "verify_medication",
              desc: "Validates medication schedule, dosages, drug-drug interaction warnings, and EHR reconciliation.",
              params: "{ medicationName: string, timeOfDay: string, action: 'check_status'|'mark_taken' }"
            },
            {
              name: "smart_home_control",
              desc: "Dispatches control commands to Ring smart locks, lighting, thermostats, and camera subsystems.",
              params: "{ deviceType: string, action: string, params: object }"
            },
            {
              name: "schedule_care_appointment",
              desc: "Provisions telemedicine consultation slots via Amazon Clinic and updates calendar resources.",
              params: "{ specialty: string, preferredTime: string, notes: string }"
            },
            {
              name: "get_patient_vitals_history",
              desc: "Retrieves continuous physiological metrics from BLE/IoT hub (Heart Rate, BP, SpO2, Glucose).",
              params: "{ metric: 'all'|'heart_rate'|'blood_pressure', timeRange: string }"
            }
          ].map(tool => (
            <div key={tool.name} className="p-3 rounded bg-[#090e17] border border-white/[0.05]">
              <div className="flex items-center gap-2 mb-1">
                <Code2 className="w-3.5 h-3.5 text-[#00a8e1]" />
                <span className="font-bold text-slate-200 text-[11px] font-mono">{tool.name}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans leading-relaxed mb-2">{tool.desc}</p>
              <div className="bg-[#05080f] rounded p-2 text-[10px] text-slate-300 font-mono border border-white/[0.03]">
                {tool.params}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Status */}
      <div className="h-10 px-5 border-t border-white/[0.08] bg-[#090d15] flex items-center justify-between text-[10px] text-slate-400 font-sans">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>MCP Transport: Streamable HTTP (/mcp) & SSE (/sse)</span>
        </div>
        <span className="font-mono">Spec 2024-11-05</span>
      </div>
    </div>
  );
}
