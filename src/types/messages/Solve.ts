import { Message } from "../Message.js";

interface SolveMessage {
  type: Message.Solve;
  sitekey: string;
  hostname: string;
}

export type { SolveMessage };
