export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { Agent, Pool, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(new Agent({
    factory: (origin, options) => new Pool(origin, {
      ...options,
      // Production logs: UND_ERR_CONNECT_TIMEOUT at 10s, before our 15s
      // request budget. Keep Next's fetch/cache; raise only this origin's limit.
      connectTimeout: String(origin) === "https://thefishing.kr" ? 15_000 : 10_000,
    }),
  }));
}
