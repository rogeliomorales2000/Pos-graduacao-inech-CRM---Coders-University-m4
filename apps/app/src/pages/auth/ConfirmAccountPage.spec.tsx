import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ConfirmAccountPage from "./ConfirmAccountPage";

function renderConfirm(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/auth/confirm-account" element={<ConfirmAccountPage />} />
        <Route path="/app/home" element={<h1>Home</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

const successResponse = {
  status: 200,
  ok: true,
  json: async () => ({
    user: {
      id: "user-1",
      email: "ada@example.com",
      confirmed_at: "2026-01-01",
    },
    redirectTo: "/app/home",
  }),
} as unknown as Response;

describe("ConfirmAccountPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sem token na URL mostra invalid link e não chama a API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderConfirm("/auth/confirm-account");

    expect(
      await screen.findByText("This confirmation link is invalid."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("token válido confirma e redireciona para /app/home", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(successResponse) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);
    renderConfirm("/auth/confirm-account?token=abc123");

    expect(
      await screen.findByRole("heading", { name: "Home" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/confirm-account",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "abc123" }),
      }),
    );
  });

  it("falha da API mostra a mensagem de erro e link para sign-in", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 400,
      ok: false,
      json: async () => ({
        error: {
          code: "TOKEN_EXPIRED",
          message: "This confirmation link has expired.",
        },
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    renderConfirm("/auth/confirm-account?token=expired");

    expect(
      await screen.findByText("This confirmation link has expired."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "We could not confirm your account",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
  });
});
