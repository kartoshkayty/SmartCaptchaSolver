import { setTimeout } from "node:timers/promises";
import { parentPort } from "node:worker_threads";
import { chromium } from "patchright";
import { Utils } from "./utils.js";
import { SolveMessage } from "../types/messages/Solve.js";
import { Message } from "../types/Message.js";
import { ErrorMessage } from "../types/messages/Error.js";
import { SuccessMessage } from "../types/messages/Success.js";

if (!parentPort) {
  throw new Error("Launched without worker!");
}

parentPort.once("message", async (message: SolveMessage) => {
  if (message.type !== Message.Solve) {
    throw new Error("Incorrect in message!");
  }

  try {
    await solve(message);
  } catch (e) {
    parentPort!.postMessage({
      type: Message.Error,
      error: e,
    } as ErrorMessage);
  }
});

const solve = async (message: SolveMessage) => {
  const context = await chromium.launchPersistentContext("...", {
    channel: "chrome",
    headless: false,
    viewport: null,

    args: [`--host-resolver-rules=MAP ${message.hostname} 127.0.0.1`],
  });

  const page = await context.newPage();

  await page.addInitScript((key) => {
    //@ts-ignore
    window.sitekey = key;
  }, message.sitekey);

  await page.goto(`http://${message.hostname}:1488`);
  const utils = new Utils(page);

  await utils.waitVisibility("BbLB6", 60_000);
  console.log("Successfully waited checkbox!");

  const { width, height } = await page
    .locator("#turnstile-widget")
    .evaluate((el) => ({
      width: el.clientWidth,
      height: el.clientHeight,
    }));

  const x = width / 10;
  const y = height / 3;

  await setTimeout(500);

  await page.mouse.click(x, y);

  await utils.waitVisibility("success", 60_000);

  const token = await page.evaluate(() => {
    return document.documentElement.getAttribute("captcha-data");
  });

  await context.close();

  parentPort!.postMessage({
    type: Message.Success,
    token,
  } as SuccessMessage);
};
