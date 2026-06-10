import { CDPSession, Frame, Page } from "patchright";

class Utils {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async waitVisibility(
    id: string,
    timeout_ms: number = 10_000,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const client = await this.startSession(timeout_ms);

      await client.send("DOM.enable");
      await client.send("CSS.enable");

      let interval: NodeJS.Timeout;
      let timeout: NodeJS.Timeout;

      timeout = setTimeout(() => {
        clearInterval(interval);
        reject(new Error(`Wait timeout ${timeout_ms}ms!`));
      }, timeout_ms);

      interval = setInterval(async () => {
        await client.send("DOM.getFlattenedDocument", {
          depth: -1,
          pierce: true,
        });

        const { searchId, resultCount } = await client.send(
          "DOM.performSearch",
          {
            query: `#${id}`,
            includeUserAgentShadowDOM: true,
          },
        );

        if (resultCount === 0) {
          await client.send("DOM.discardSearchResults", { searchId });
          return;
        }

        const { nodeIds } = await client.send("DOM.getSearchResults", {
          searchId,
          fromIndex: 0,
          toIndex: resultCount,
        });

        for (const id of nodeIds) {
          const { computedStyle } = await client
            .send("CSS.getComputedStyleForNode", { nodeId: id })
            .catch(() => ({ computedStyle: null }));

          if (!computedStyle) continue;

          const display = computedStyle.find((st) => st.name === "display");
          if (display?.value !== "grid") continue;

          clearTimeout(timeout);
          clearInterval(interval);

          await client.send("DOM.discardSearchResults", { searchId });

          resolve();

          break;
        }
      }, 2_000);
    });
  }

  private async startSession(timeout_ms: number = 10_000): Promise<CDPSession> {
    return new Promise((resolve, reject) => {
      let interval: NodeJS.Timeout;
      let timeout: NodeJS.Timeout;

      timeout = setTimeout(() => {
        clearInterval(interval);
        reject(
          new Error(
            `Failed to start session after ${timeout_ms}ms timeout. (Maybe frame not exist)`,
          ),
        );
      }, timeout_ms);

      interval = setInterval(async () => {
        const frame = this.page
          .frames()
          .find((fr) =>
            fr.url().startsWith("https://challenges.cloudflare.com/"),
          );

        if (!frame) return;

        clearTimeout(timeout);
        clearInterval(interval);

        const client = await this.page.context().newCDPSession(frame);
        resolve(client);
      }, 1_000);
    });
  }
}

export { Utils };
