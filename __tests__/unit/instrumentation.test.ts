import { afterEach, expect, it, vi } from "vitest";
import { register } from "@/instrumentation";

const { Agent, Pool, setGlobalDispatcher } = vi.hoisted(() => ({
  Agent: vi.fn(function (options: unknown) { return { options }; }),
  Pool: vi.fn(function (origin: unknown, options: unknown) { return { origin, options }; }),
  setGlobalDispatcher: vi.fn(),
}));
vi.mock("undici", () => ({ Agent, Pool, setGlobalDispatcher }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("extends only the fishing source TLS deadline, in the Node runtime", async () => {
  vi.stubEnv("NEXT_RUNTIME", "edge");
  await register();
  expect(setGlobalDispatcher).not.toHaveBeenCalled();
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  await register();
  const options = Agent.mock.calls[0][0] as { factory: (origin: string, opts: object) => void };
  options.factory("https://thefishing.kr", {});
  expect(Pool).toHaveBeenLastCalledWith("https://thefishing.kr", { connectTimeout: 45000 });
  options.factory("https://another.example", {});
  expect(Pool).toHaveBeenLastCalledWith("https://another.example", { connectTimeout: 10000 });
  expect(setGlobalDispatcher).toHaveBeenCalledTimes(1);
});
