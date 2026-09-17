import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import HomePage from "./HomePage";

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/app/home"]}>
      <Routes>
        <Route path="/app/home" element={<HomePage />} />
        <Route path="/auth/sign-in" element={<h1>Sign in</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exibe o produto e o botão de sign out", () => {
    renderHome();

    expect(
      screen.getByRole("heading", { name: "Intech CRM" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });

  it("ao clicar em Sign out, chama a API e navega para /auth/sign-in", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderHome();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/sign-out", {
      method: "POST",
      credentials: "same-origin",
    });
  });
});
