import express from "express";
import { join } from "node:path";
import { parentPort } from "node:worker_threads";

const app = express();

app.get("/", (req, res) => {
  const path = join(import.meta.dirname, "template.html");
  res.sendFile(path);
});

app.listen(1488, "127.0.0.1", () => {
  parentPort?.postMessage({ success: true });
});
