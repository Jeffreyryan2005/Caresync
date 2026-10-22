# Developer Friction Log: Amazon Bedrock & Model Context Protocol (MCP)

> **Hackathon Submission:** Build, Ship, Shape: Amazon Developer Hackathon  
> **Project:** CareSync (Alexa+ & AWS Builder Challenges)  
> **Author:** Jeffrey Ryan (`Jeffreyryan2005`)  

---

## 1. Overview
This friction log documents specific technical impediments encountered while integrating the official **Model Context Protocol (MCP) 2024-11-05 standard** (Streamable HTTP and SSE transports) with the **Amazon Bedrock Converse API** (`@aws-sdk/client-bedrock-runtime`).

---

## 2. Friction Entry: Schema Impedance Mismatch (MCP vs. Bedrock ToolSpec)

### Task Attempted
Dynamically registering self-hosted Model Context Protocol (MCP) tool schemas into the Amazon Bedrock Converse API (`ConverseCommand`) without manual schema duplication.

### Steps Taken
1. Implemented standard MCP tool declarations using the official JSON-RPC 2.0 specification:
   ```json
   {
     "name": "triage_health_symptoms",
     "description": "Evaluates patient symptoms...",
     "inputSchema": {
       "type": "object",
       "properties": {
         "symptoms": { "type": "array", "items": { "type": "string" } },
         "duration": { "type": "string" }
       },
       "required": ["symptoms"]
     }
   }
   ```
2. Passed the MCP tool array directly into the Bedrock Converse command:
   ```javascript
   const command = new ConverseCommand({
     modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
     messages,
     toolConfig: { tools: mcpToolsList }
   });
   await bedrockClient.send(command);
   ```

### Expected vs. Actual Result
* **Expected Result:** Amazon Bedrock accepts the standard JSON Schema definition under `inputSchema`.
* **Actual Result:** Bedrock throws a `ValidationException` during request validation. The Converse API strictly requires an additional nesting layer: `{ toolSpec: { name, description, inputSchema: { json: { ... } } } }`.

### Severity Rating
* **Severity:** **Moderate** (Blocks direct inter-compatibility between MCP tool definitions and Amazon Bedrock).

### Workaround Used
Constructed a recursive schema adapter function in `server/src/bedrock/engine.js`:
```javascript
function getBedrockToolSpecs() {
  return mcpToolsList.map(tool => ({
    toolSpec: {
      name: tool.name,
      description: tool.description,
      inputSchema: {
        json: tool.inputSchema
      }
    }
  }));
}
```

### Actionable Suggestion for the AWS & Amazon Developer Teams
Release an official utility within the AWS SDK (e.g., `@aws-sdk/bedrock-mcp-adapter`) that natively ingests standard Model Context Protocol tool arrays and translates them into Bedrock Converse `toolConfig` structures in one line of code:
```javascript
import { fromMcpTools } from "@aws-sdk/bedrock-mcp-adapter";
const toolConfig = fromMcpTools(mcpServer.getTools());
```

---

## 3. Friction Entry: Real-Time Audio Transport over MCP

### Task Attempted
Ingesting raw acoustic streams from microphones and ambient sensors into the MCP execution pipeline to detect respiratory wheezing or cough biomarkers.

### Expected vs. Actual Result
* **Expected Result:** A standard MCP stream transport for raw chunked binary audio.
* **Actual Result:** The MCP specification primarily accommodates text-based JSON-RPC payloads. Audio must be base64-encoded or uploaded via external S3 presigned URLs, introducing 300ms+ latency.

### Actionable Suggestion
Propose a standardized binary audio chunking extension to the Model Context Protocol for voice-first platforms like Alexa+ to allow low-latency sub-50ms acoustic analysis.
