import { Message } from "../Message.js";

interface SuccessMessage {
  type: Message.Success;
  token: string;
}

export type { SuccessMessage };
