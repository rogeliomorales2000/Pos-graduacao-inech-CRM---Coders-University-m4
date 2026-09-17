import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

function guestFetch() {
  return Promise.resolve({
    status: 401,
    ok: false,
    json: async () => ({
      error: { code: "UNAUTHENTICATED", message: "Unauthenticated." },
    }),
  } as unknown as Response);
}

function authedFetch() {
  return Promise.resolve({
    status: 200,
    ok: true,
    json: async () => ({ user: { id: "user-1" } }),
  } as unknown as Response);
}

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sem sessão, rota privada redireciona para /auth/sign-in", async () => {
    vi.mocked(fetch).mockImplementation(guestFetch);

    render(
      <MemoryRouter initialEntries={["/app/home"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("com sessão válida, mostra a home com o botão de sign out", async () => {
    vi.mocked(fetch).mockImplementation(authedFetch);

    render(
      <MemoryRouter initialEntries={["/app/home"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Intech CRM" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });

  it("com sessão válida, rota pública redireciona para a home", async () => {
    vi.mocked(fetch).mockImplementation(authedFetch);

    render(
      <MemoryRouter initialEntries={["/auth/sign-in"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Intech CRM" }),
    ).toBeInTheDocument();
  });
});
