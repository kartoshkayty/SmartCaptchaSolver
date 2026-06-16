import { CallContext } from "nice-grpc-common";
import {
  CaptchaServiceImplementation,
  DeepPartial,
  Error,
  SolveRequest,
  SolveResponse,
} from "../../protocol/captcha.js";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { SolveMessage } from "../../types/messages/Solve.js";
import { SuccessMessage } from "../../types/messages/Success.js";
import { ErrorMessage, ErrorType } from "../../types/messages/Error.js";

export class CaptchaService implements CaptchaServiceImplementation {
  private in_process: boolean = false;

  private static worker_path: string = join(
    import.meta.dirname,
    "..",
    "..",
    "captcha",
    "client.js",
  );

  private worker?: Worker | undefined;

  constructor() {
    process.on("SIGINT", () => this.worker?.terminate());
    process.on("SIGTERM", () => this.worker?.terminate());
  }

  public async solve(
    request: SolveRequest,
    context: CallContext,
  ): Promise<DeepPartial<SolveResponse>> {
    if (this.in_process) {
      return {
        error: {
          type: Error.ERROR_ALREADY_SOLVING,
          message: "Another captcha task is running!",
        },
      };
    }

    this.worker = new Worker(CaptchaService.worker_path);
    this.worker.postMessage(
      new SolveMessage(request.hostname, request.sitekey),
    );

    const message = await new Promise((res) =>
      this.worker!.once("message", res),
    );

    await this.worker.terminate();

    if (message instanceof SuccessMessage) {
      return {
        success: { token: message.token },
      };
    }

    if (message instanceof ErrorMessage) {
      return {
        error: {
          type:
            message.code === ErrorType.UNKNOWN
              ? Error.ERROR_UNKNOWN
              : Error.ERROR_UNSOLVABLE,
          message: message.message,
        },
      };
    }

    return {
      error: {
        type: Error.ERROR_UNKNOWN,
        message: "Unknown message type returned from client!",
      },
    };
  }
}
