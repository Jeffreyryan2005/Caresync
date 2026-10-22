import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Cpu, 
  Server, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Copy, 
  Check, 
  ExternalLink 
} from 'lucide-react';

export default function Inspector({ systemStatus, telemetry, isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
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
      const interval = setInterval(fetchLogs, 1500);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'ALL') return true;
    if (filter === 'MCP') return log.source.startsWith('MCP');
    if (filter === 'BEDROCK') return log.source.includes('BEDROCK');
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/60 shadow-2xl z-50 flex flex-col font-mono text-xs">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 text-sm tracking-wide">Developer & Judge MCP Inspector</h2>
            <p className="text-[11px] text-slate-400">JSON-RPC 2.0 & AWS Bedrock Live Telemetry</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchLogs}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
            title="Refresh Logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition font-sans text-xs"
          >
            Close
          </button>
        </div>
      </div>

      {/* Quick Telemetry Bar */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/40 border-b border-slate-800/80">
        <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mb-1">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span>AI ENGINE</span>
          </div>
          <div className="font-semibold text-slate-200 truncate">
            {systemStatus?.engine?.mode === 'LIVE_AWS_BEDROCK' ? 'Live AWS Bedrock' : 'Neural Simulation'}
          </div>
          <div className="text-[10px] text-cyan-400/80 truncate">
            {systemStatus?.engine?.model || 'claude-3-5-sonnet'}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mb-1">
            <Server className="w-3 h-3 text-emerald-400" />
            <span>MCP PROTOCOL</span>
          </div>
          <div className="font-semibold text-slate-200">
            {systemStatus?.engine?.activeMcpToolsCount || 6} Active Tools
          </div>
          <div className="text-[10px] text-emerald-400/80">
            Streamable HTTP / SSE
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-indigo-400" />
            <span>LAST LATENCY</span>
          </div>
          <div className="font-semibold text-slate-200">
            {telemetry?.latencyMs ? `${telemetry.latencyMs} ms` : '184 ms'}
          </div>
          <div className="text-[10px] text-indigo-400/80">
            {telemetry?.usage?.totalTokens ? `${telemetry.usage.totalTokens} tokens` : 'Converse API'}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800 bg-slate-900/60 font-sans text-xs">
        <span className="text-slate-400 mr-2 text-[11px]">Filters:</span>
        {['ALL', 'MCP', 'BEDROCK'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
              filter === tab 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab}
          </button>
        ))}
        <div className="ml-auto text-[11px] text-slate-400">
          {filteredLogs.length} events logged
        </div>
      </div>

      {/* Logs Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-40 animate-pulse" />
            <p>No telemetry events logged yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">Interact with Alexa+ on the left to observe live packets.</p>
          </div>
        ) : (
          filteredLogs.map(log => {
            const isMcp = log.source.startsWith('MCP');
            const isBedrock = log.source.includes('BEDROCK');
            const isError = log.source.includes('ERROR');

            return (
              <div 
                key={log.id} 
                className={`p-3 rounded-lg border transition ${
                  isError 
                    ? 'bg-rose-950/30 border-rose-800/60' 
                    : isMcp 
                    ? 'bg-slate-950/60 border-cyan-900/40 hover:border-cyan-700/60' 
                    : 'bg-slate-950/60 border-indigo-900/40 hover:border-indigo-700/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      isError 
                        ? 'bg-rose-500/20 text-rose-300' 
                        : isMcp 
                        ? 'bg-cyan-500/20 text-cyan-300' 
                        : 'bg-indigo-500/20 text-indigo-300'
                    }`}>
                      {log.source}
                    </span>
                    <span className="text-slate-300 font-medium">{log.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => copyToClipboard(log.payload, log.id)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                      title="Copy JSON Payload"
                    >
                      {copiedId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/90 rounded p-2.5 overflow-x-auto text-[11px] text-slate-300 border border-slate-900">
                  <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400 font-sans">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span>MCP Transport: Streamable HTTP (POST /mcp) & SSE (/sse)</span>
        </div>
        <div className="text-slate-400">
          JSON-RPC 2.0 Conforming
        </div>
      </div>
    </div>
  );
}
