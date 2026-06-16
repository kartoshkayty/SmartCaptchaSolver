import { join } from "node:path";
import { Worker } from "node:worker_threads";

console.log("Starting web server...");

const server_path = join(import.meta.dirname, "captcha", "server.js");
const server_thread = new Worker(server_path);

await new Promise<void>((res) => server_thread.once("message", res));
console.log("[CAPTCHA] Fake page server successfully started!");

process.on("SIGINT", () => {
  server_thread.terminate();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server_thread.terminate();
  process.exit(0);
});

import "./api/server.js";
