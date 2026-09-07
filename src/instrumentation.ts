export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { Agent, Pool, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(new Agent({
    factory: (origin, options) => new Pool(origin, {
      ...options,
      // Production logs showed the source's cold TLS connection taking more
      // than 15s, before the matching fetch budget. Keep Next's fetch/cache;
      // raise only this origin's connection limit.
      connectTimeout: String(origin) === "https://thefishing.kr" ? 45_000 : 10_000,
    }),
  }));
}
