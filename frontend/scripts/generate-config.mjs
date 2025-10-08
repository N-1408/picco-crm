import { promises as fs } from "fs";
import { resolve } from "path";

const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:4000/api";
const agentPanelUrl = process.env.AGENT_PANEL_URL || "/pages/agent/dashboard.html";
const adminPanelUrl = process.env.ADMIN_PANEL_URL || "/pages/admin/login.html";

const content = `window.__PICCO_CONFIG = {
  apiBaseUrl: '${apiBaseUrl}',
  agentPanelUrl: '${agentPanelUrl}',
  adminPanelUrl: '${adminPanelUrl}'
};\n`;

const targetPath = resolve("./config.js");

await fs.writeFile(targetPath, content, "utf8");

console.log(`[config] Generated config.js with API base URL: ${apiBaseUrl}`);
