import express from "express";
import path from "path";
import fs from "fs";
import { spawn, ChildProcess } from "child_process";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Global state variables for the Bot process
let botProcess: ChildProcess | null = null;
let botLogs: string[] = [];
let pairingCode: string | null = null;
let connectionState: "offline" | "starting" | "prompt_mode" | "pairing" | "connected" | "error" = "offline";
let currentPhoneNumber: string | null = null;

// Helper to add clean timestamped logs
function addSystemLog(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  botLogs.push(`[SYSTEM ${timestamp}] ${message}\n`);
  if (botLogs.length > 500) botLogs.shift();
}

// Clean up previous child process if it exits
function cleanupProcess() {
  if (botProcess) {
    try {
      botProcess.kill("SIGTERM");
    } catch (e) {}
    botProcess = null;
  }
  connectionState = "offline";
  pairingCode = null;
}

// API Routes
// 1. Get current bot status
app.get("/api/bot/status", (req, res) => {
  res.json({
    status: connectionState,
    pairingCode,
    phoneNumber: currentPhoneNumber,
    isAlive: botProcess !== null && !botProcess.killed,
    pid: botProcess ? botProcess.pid : null,
  });
});

// 2. Start the bot
app.post("/api/bot/start", (req, res) => {
  if (botProcess && !botProcess.killed) {
    return res.json({ success: false, message: "Bot is already running." });
  }

  botLogs = [];
  pairingCode = null;
  connectionState = "starting";
  addSystemLog("Starting Experimental-Bell WhatsApp bot process...");

  const botDir = path.join(process.cwd(), "bot");
  
  // Spawn the bot process natively using Node
  botProcess = spawn("node", ["index.js"], {
    cwd: botDir,
    env: { ...process.env, FORCE_COLOR: "1" }, // preserve color logging
  });

  botProcess.stdout?.on("data", (data) => {
    const rawText = data.toString();
    botLogs.push(rawText);
    if (botLogs.length > 1000) botLogs.shift();

    // Check if bot asks for QR / Pairing mode
    if (rawText.includes("Anda belum memiliki session") || rawText.includes("Pilih salah satu dari opsi berikut")) {
      connectionState = "prompt_mode";
    }

    // Check if phone number is requested
    if (rawText.includes("Please type your WhatsApp number") || rawText.includes("WhatsApp number :")) {
      connectionState = "pairing";
    }

    // Parse pairing code from stdout
    // Baileys output styling usually prints code in boxes, e.g. "Your Pairing Code: ABCD-EFGH" or "G9X4HJ8K"
    const pairingRegex = /Pairing Code:\s*([A-Z0-9-]{8,9})/i;
    const match = rawText.match(pairingRegex);
    if (match) {
      pairingCode = match[1].trim();
      connectionState = "pairing";
      addSystemLog(`Parsed Pairing Code: ${pairingCode}`);
    }

    // Detect successful connection
    if (rawText.includes("Success Connected") || rawText.includes("Connected to") || rawText.includes("Connection Active") || rawText.includes("registered")) {
      connectionState = "connected";
      pairingCode = null;
    }
  });

  botProcess.stderr?.on("data", (data) => {
    const rawText = data.toString();
    botLogs.push(`[STDERR] ${rawText}`);
    if (botLogs.length > 1000) botLogs.shift();
  });

  botProcess.on("close", (code) => {
    addSystemLog(`Bot process exited with code ${code}`);
    cleanupProcess();
  });

  botProcess.on("error", (err) => {
    addSystemLog(`Bot process error: ${err.message}`);
    connectionState = "error";
    cleanupProcess();
  });

  res.json({ success: true, message: "Bot process started." });
});

// 3. Stop the bot
app.post("/api/bot/stop", (req, res) => {
  if (!botProcess) {
    return res.json({ success: false, message: "Bot is not running." });
  }

  cleanupProcess();
  addSystemLog("Bot process stopped by user via dashboard.");
  res.json({ success: true, message: "Bot process terminated." });
});

// 4. Send input command/text to the bot's stdin
app.post("/api/bot/input", (req, res) => {
  const { text } = req.body;
  if (!botProcess || botProcess.killed) {
    return res.status(400).json({ success: false, message: "Bot is not running." });
  }

  if (connectionState === "pairing") {
    currentPhoneNumber = text;
  }

  botProcess.stdin?.write(text + "\n");
  botLogs.push(`[INPUT] > ${text}\n`);
  res.json({ success: true });
});

// 5. Read terminal logs
app.get("/api/bot/logs", (req, res) => {
  res.json({ logs: botLogs });
});

// 6. Delete session credentials to perform fresh pairing
app.post("/api/bot/clear-session", (req, res) => {
  const sessionPath = path.join(process.cwd(), "bot", "connection", "session");
  
  if (botProcess && !botProcess.killed) {
    return res.json({ success: false, message: "Please stop the bot first before resetting session." });
  }

  try {
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      addSystemLog("Session folder successfully cleared. Ready for fresh pairing.");
      currentPhoneNumber = null;
      pairingCode = null;
      res.json({ success: true, message: "Session cleared successfully." });
    } else {
      res.json({ success: true, message: "No active session folder found." });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, message: `Failed to clear session: ${e.message}` });
  }
});

// 7. Get bot configuration JSON settings
app.get("/api/bot/config", (req, res) => {
  const configPath = path.join(process.cwd(), "bot", "toolkit", "set", "config.json");
  try {
    if (fs.existsSync(configPath)) {
      const rawData = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(rawData);
      res.json(config);
    } else {
      res.status(404).json({ error: "Configuration file config.json not found." });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 8. Update bot configuration JSON settings
app.post("/api/bot/config", (req, res) => {
  const configPath = path.join(process.cwd(), "bot", "toolkit", "set", "config.json");
  try {
    if (fs.existsSync(configPath)) {
      const newConfig = req.body;
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf-8");
      res.json({ success: true, message: "Configuration saved successfully.", config: newConfig });
    } else {
      res.status(404).json({ error: "Configuration file not found." });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 9. Get commands dynamically by reading folder files (fall back to a manual array list if empty)
app.get("/api/bot/commands", (req, res) => {
  const eventsPath = path.join(process.cwd(), "bot", "helpers", "Events");
  let list: string[] = [];
  try {
    if (fs.existsSync(eventsPath)) {
      const files = fs.readdirSync(eventsPath);
      list = files.filter(f => f.endsWith(".js")).map(f => f.replace(".js", ""));
    }
  } catch (e) {}

  if (list.length === 0) {
    list = ["ai", "sticker", "pinterest", "instagram", "tiktok", "youtube", "play", "rpg", "tebakgambar", "owner"];
  }

  res.json({ commands: list });
});


// Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
