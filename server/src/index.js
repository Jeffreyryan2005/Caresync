/**
 * Alexa+ CareSync Server
 * Official Model Context Protocol (MCP) Server & AWS Bedrock Orchestrator
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { mcpToolsList, executeMcpTool, careState } from "./mcp/tools.js";
import { mcpResourcesList, readMcpResource } from "./mcp/resources.js";
import { mcpPromptsList, getMcpPrompt } from "./mcp/prompts.js";
import { processAgentMessage, getEngineStatus } from "./bedrock/engine.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Ring buffer of server telemetry logs for Judge Inspector
const telemetryLogs = [];
function addLog(source, type, payload) {
  const logItem = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    source,
    type,
    payload
  };
  telemetryLogs.unshift(logItem);
  if (telemetryLogs.length > 100) telemetryLogs.pop();
  return logItem;
}

// Global active SSE clients for real-time notifications
const sseClients = new Set();
function broadcastSse(event, data) {
  for (const client of sseClients) {
    try {
      client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// -------------------------------------------------------------
// 1. STANDARD MODEL CONTEXT PROTOCOL (MCP) JSON-RPC 2.0 ENDPOINT
// -------------------------------------------------------------
app.post("/mcp", async (req, res) => {
  const { jsonrpc, id, method, params } = req.body;

  if (jsonrpc !== "2.0") {
    return res.status(400).json({
      jsonrpc: "2.0",
      id: id || null,
      error: { code: -32600, message: "Invalid Request: must be JSON-RPC 2.0" }
    });
  }

  addLog("MCP_CLIENT", `REQUEST_${method}`, { method, params, id });

  try {
    switch (method) {
      // MCP Protocol Handshake
      case "initialize": {
        const initResult = {
          protocolVersion: "2024-11-05",
          serverInfo: {
            name: "alexa-plus-caresync-mcp-server",
            version: "1.0.0"
          },
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: true, listChanged: true },
            prompts: { listChanged: true },
            logging: {}
          }
        };
        addLog("MCP_SERVER", "INITIALIZE_SUCCESS", initResult);
        return res.json({ jsonrpc: "2.0", id, result: initResult });
      }

      // List Available MCP Tools
      case "tools/list": {
        addLog("MCP_SERVER", "TOOLS_LIST_SENT", { count: mcpToolsList.length });
        return res.json({
          jsonrpc: "2.0",
          id,
          result: { tools: mcpToolsList }
        });
      }

      // Execute an MCP Tool
      case "tools/call": {
        const { name, arguments: toolArgs } = params || {};
        if (!name) {
          return res.status(400).json({
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing tool name parameter" }
          });
        }

        const executionResult = await executeMcpTool(name, toolArgs || {});
        addLog("MCP_SERVER", `TOOL_EXECUTION_${name}`, { name, args: toolArgs, result: executionResult });
        broadcastSse("tool_executed", { name, args: toolArgs, result: executionResult });

        return res.json({
          jsonrpc: "2.0",
          id,
          result: executionResult
        });
      }

      // List MCP Resources
      case "resources/list": {
        addLog("MCP_SERVER", "RESOURCES_LIST_SENT", { count: mcpResourcesList.length });
        return res.json({
          jsonrpc: "2.0",
          id,
          result: { resources: mcpResourcesList }
        });
      }

      // Read an MCP Resource
      case "resources/read": {
        const { uri } = params || {};
        const content = await readMcpResource(uri);
        addLog("MCP_SERVER", `RESOURCE_READ_${uri}`, { uri, content });
        return res.json({
          jsonrpc: "2.0",
          id,
          result: content
        });
      }

      // List MCP Prompt Templates
      case "prompts/list": {
        addLog("MCP_SERVER", "PROMPTS_LIST_SENT", { count: mcpPromptsList.length });
        return res.json({
          jsonrpc: "2.0",
          id,
          result: { prompts: mcpPromptsList }
        });
      }

      // Get an MCP Prompt
      case "prompts/get": {
        const { name, arguments: promptArgs } = params || {};
        const promptResult = await getMcpPrompt(name, promptArgs);
        return res.json({
          jsonrpc: "2.0",
          id,
          result: promptResult
        });
      }

      default:
        return res.status(404).json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        });
    }
  } catch (error) {
    console.error(`MCP Error handling ${method}:`, error);
    addLog("MCP_SERVER_ERROR", method, { error: error.message });
    return res.status(500).json({
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: error.message }
    });
  }
});

// -------------------------------------------------------------
// 2. SERVER-SENT EVENTS (SSE) STREAM FOR REAL-TIME MCP CLIENTS
// -------------------------------------------------------------
app.get("/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseClients.add(res);
  res.write(`data: ${JSON.stringify({ status: "CONNECTED_TO_CARE_SYNC_MCP_STREAM" })}\n\n`);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

// -------------------------------------------------------------
// 3. FRONTEND CONVERSATIONAL AGENT ENDPOINTS (Echo Show UI)
// -------------------------------------------------------------
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    addLog("USER_VOICE_INPUT", "SPEECH_TRANSCRIBED", { text: message });

    // Process through AWS Bedrock / Hybrid agent engine
    const agentOutput = await processAgentMessage(message, history);

    addLog("BEDROCK_AGENT", "REASONING_COMPLETE", {
      text: agentOutput.text,
      toolsUsed: agentOutput.toolCalls.map(t => t.toolName),
      telemetry: agentOutput.telemetry
    });

    res.json({
      success: true,
      data: agentOutput
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "ONLINE",
    version: "1.0.0",
    engine: getEngineStatus(),
    mcpEndpoints: {
      jsonRpc: "/mcp",
      sseStream: "/sse"
    },
    activeSensors: 4,
    uptimeSec: Math.floor(process.uptime())
  });
});

app.get("/api/state", (req, res) => {
  res.json({
    success: true,
    data: careState
  });
});

app.get("/api/logs", (req, res) => {
  res.json({
    success: true,
    data: telemetryLogs
  });
});

app.post("/api/reset", (req, res) => {
  // Reset demo state
  careState.smartHome.frontDoorLocked = true;
  careState.smartHome.emergencyPathwayLights = false;
  careState.patient.medications[0].taken = true;
  careState.patient.medications[1].taken = false;
  careState.patient.medications[2].taken = false;
  careState.activeIncidents = [];
  addLog("SYSTEM", "STATE_RESET", { reset: true });
  res.json({ success: true, message: "Demo state reset to nominal baseline." });
});

app.listen(PORT, () => {
  console.log(`\n=====================================================`);
  console.log(`  🌟 Alexa+ CareSync MCP Server is LIVE on Port ${PORT} `);
  console.log(`  - MCP JSON-RPC 2.0 Endpoint: http://localhost:${PORT}/mcp`);
  console.log(`  - MCP Server-Sent Events:    http://localhost:${PORT}/sse`);
  console.log(`  - Conversational Agent API:   http://localhost:${PORT}/api/chat`);
  console.log(`  - AWS Bedrock Engine Mode:   ${getEngineStatus().mode}`);
  console.log(`=====================================================\n`);
});
