import { Message } from "../Message.js";

interface ErrorMessage {
  type: Message.Error;
  error: string;
}

export type { ErrorMessage };
