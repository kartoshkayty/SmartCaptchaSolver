import { createServer } from "nice-grpc";
import { authMiddleware } from "./middleware/auth.js";
import { CaptchaServiceDefinition } from "../protocol/captcha.js";
import { CaptchaService } from "./implementation/captcha.js";

const server = createServer().use(authMiddleware);

server.add(CaptchaServiceDefinition, new CaptchaService());

await server.listen("0.0.0.0:1489");

console.log("[API] Server successfully started on 1489 port!");
