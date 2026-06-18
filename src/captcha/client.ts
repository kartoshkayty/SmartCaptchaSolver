import { parentPort } from "node:worker_threads";
import { BrowserContext, chromium, Page } from "patchright";
import { UnsolvableError } from "../types/errors/UnsolvableError.js";
import { SolveMessage } from "../types/messages/Solve.js";
import { ErrorMessage, ErrorType } from "../types/messages/Error.js";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { SuccessMessage } from "../types/messages/Success.js";

if (!parentPort) {
  throw new Error("Launched without worker!");
}

new (class Client {
  private context!: BrowserContext;
  private page!: Page;
  private ws!: WebSocketServer;

  constructor() {
    parentPort!.once("message", async (raw: unknown) => {
      const message = Object.assign(new SolveMessage("", "", ""), raw);

      if (!message.hostname || !message.sitekey) {
        throw new Error("Incorrect message!");
      }

      try {
        await this.solve(message);
      } catch (e) {
        if (e instanceof UnsolvableError) {
          parentPort!.postMessage(
            new ErrorMessage(ErrorType.UNSOLVABLE, e.message),
          );

          return;
        }

        if (e instanceof Error) {
          parentPort!.postMessage(
            new ErrorMessage(ErrorType.UNKNOWN, e.message),
          );
          return;
        }

        parentPort!.postMessage(
          new ErrorMessage(ErrorType.UNKNOWN, "Catch unknown content!"),
        );
      }
    });
  }

  private async solve(message: SolveMessage) {
    this.context = await chromium.launchPersistentContext("...", {
      channel: "chrome",
      headless: false,
      viewport: null,

      executablePath: join(import.meta.dirname, "..", "..", "bin", "chrome"),

      proxy: {
        server: `socks5://${message.proxy}`,
      },

      args: [
        `--host-resolver-rules=MAP ${message.hostname} 127.0.0.1`,
        `--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks`,
      ],
    });

    this.page = await this.context.newPage();

    await this.page.addInitScript((message: SolveMessage) => {
      //@ts-ignore
      window.sitekey = message.sitekey;

      //@ts-ignore
      window.c_hostname = message.hostname;
    }, message);

    this.ws = new WebSocketServer({
      host: "127.0.0.1",
      port: 1490,
      path: "/callback",
    });

    this.ws.once("connection", (socket, _) => {
      socket.on("message", (data) => this.onMessage(data));
    });

    await this.page.goto(`http://${message.hostname}:1488`);
  }

  private async onMessage(raw: WebSocket.RawData) {
    const data = raw.toString("utf8");
    const parsed = JSON.parse(data);

    let readyTimeout: NodeJS.Timeout;
    let callbackTimeout: NodeJS.Timeout;

    readyTimeout = setTimeout(() => {
      clearTimeout(callbackTimeout);
      throw new UnsolvableError("Ready timeout reached!");
    }, 15_000);

    callbackTimeout = setTimeout(() => {
      throw new UnsolvableError("Callback timeout reached!");
    }, 40_000);

    switch (parsed.event) {
      case "READY": {
        clearTimeout(readyTimeout);
        this.onReady();
        break;
      }

      case "CALLBACK": {
        clearTimeout(callbackTimeout);
        this.onCallback(parsed.token);
        break;
      }
    }
  }

  private async onCallback(token?: string) {
    if (!token) {
      throw new Error("Returned token is null!");
    }

    await this.context.close();
    await new Promise<void>((resolve) => this.ws.close(() => resolve()));

    parentPort!.postMessage(new SuccessMessage(token));

    this.log("Successfully solved!");
  }

  private async onReady() {
    this.log("Challenge ready! Start solving...");

    const { width, height } = await this.page
      .locator("#turnstile-widget")
      .evaluate((el) => ({
        width: el.clientWidth,
        height: el.clientHeight,
      }));

    const x = (width / 16) * 2;
    const y = (height / 10) * 4;

    await this.page.mouse.click(x, y);
  }

  private log(message: string) {
    console.log(`[CAPTCHA CLIENT] ${message}`);
  }
})();
