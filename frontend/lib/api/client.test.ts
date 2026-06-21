import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch } from "./client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("prefixe l'URL de base et inclut les credentials", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const data = await apiFetch<{ status: string }>("/health/");

    expect(data).toEqual({ status: "ok" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/health/");
    expect(init?.credentials).toBe("include");
  });

  it("leve ApiError avec le status sur reponse non-ok", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(new Response("Forbidden", { status: 403 })),
    );

    await expect(apiFetch("/secret/")).rejects.toMatchObject({ status: 403 });
    await expect(apiFetch("/secret/")).rejects.toBeInstanceOf(ApiError);
  });
});
