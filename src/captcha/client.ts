import { setTimeout } from "node:timers/promises";
import { parentPort } from "node:worker_threads";
import { chromium } from "patchright";
import { Utils } from "./utils.js";
import { UnsolvableError } from "../types/errors/UnsolvableError.js";
import { SolveMessage } from "../types/messages/Solve.js";
import { ErrorMessage, ErrorType } from "../types/messages/Error.js";
import { SuccessMessage } from "../types/messages/Success.js";

if (!parentPort) {
  throw new Error("Launched without worker!");
}

parentPort.once("message", async (message: unknown) => {
  if (!(message instanceof SolveMessage)) {
    throw new Error("Incorrect message!");
  }

  try {
    await solve(message);
  } catch (e) {
    if (e instanceof UnsolvableError) {
      parentPort!.postMessage(
        new ErrorMessage(ErrorType.UNSOLVABLE, e.message),
      );

      return;
    }

    if (e instanceof Error) {
      parentPort!.postMessage(new ErrorMessage(ErrorType.UNKNOWN, e.message));
      return;
    }

    parentPort!.postMessage(
      new ErrorMessage(ErrorType.UNKNOWN, "Catch unknown content!"),
    );
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

  try {
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
  } catch (e) {
    throw new UnsolvableError();
  }

  const token = await page.evaluate(() => {
    return document.documentElement.getAttribute("captcha-data");
  });

  await context.close();

  if (token === null) {
    parentPort!.postMessage(
      new ErrorMessage(ErrorType.UNKNOWN, "returned token is null!"),
    );
    return;
  }

  parentPort!.postMessage(new SuccessMessage(token));
};
