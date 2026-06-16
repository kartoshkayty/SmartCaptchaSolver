import {
  CallContext,
  ServerError,
  ServerMiddlewareCall,
  Status,
} from "nice-grpc-common";
import { timingSafeEqual } from "node:crypto";
import config from "../../config.json" with { type: "json" };

export async function* authMiddleware<Request, Response>(
  call: ServerMiddlewareCall<Request, Response>,
  context: CallContext,
) {
  const auth = context.metadata.get("authorization");

  if (!auth || auth === null) {
    throw new ServerError(
      Status.UNAUTHENTICATED,
      "Invalid authorization metadata!",
    );
  }

  const [scheme, token] = auth.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new ServerError(Status.UNAUTHENTICATED, "Invalid token or scheme!");
  }

  const byteProvided = Buffer.from(token, "utf8");
  const byteRequired = Buffer.from(config.api.auth_token, "utf8");

  if (
    byteProvided.byteLength !== byteRequired.byteLength ||
    !timingSafeEqual(byteProvided, byteRequired)
  ) {
    throw new ServerError(Status.UNAUTHENTICATED, "Invalid token provided!");
  }

  return yield* call.next(call.request, context);
}
