import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import SignInPage from "./SignInPage";

function renderSignIn(entry: string | object = "/auth/sign-in") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/auth/sign-in" element={<SignInPage />} />
        <Route path="/app/home" element={<h1>Home</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("Phone"), {
    target: { value: "+5511988887777" },
  });
}

const successResponse = {
  status: 200,
  ok: true,
  json: async () => ({
    user: { id: "user-1", email: "ada@example.com" },
    redirectTo: "/app/home",
  }),
} as unknown as Response;

describe("SignInPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza o form completo com campos, botão e links", () => {
    renderSignIn();

    expect(
      screen.getByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /forgot your password/i }),
    ).toHaveAttribute("href", "/auth/forgot-password");
    expect(
      screen.getByRole("link", { name: /create an account/i }),
    ).toHaveAttribute("href", "/auth/sign-up");
  });

  it("valida campos obrigatórios no cliente e não chama a API", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderSignIn();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(screen.getByText("Enter your phone number.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("com credenciais válidas posta o payload e navega para /app/home", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse);
    vi.stubGlobal("fetch", fetchMock);
    renderSignIn();

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("heading", { name: "Home" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/sign-in",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "ada@example.com",
          password: "password123",
          phone: "+5511988887777",
        }),
      }),
    );
  });

  it("erro de credenciais mostra mensagem genérica sem botão de reenvio", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email, password or phone.",
        },
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    renderSignIn();

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Invalid email, password or phone."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /resend confirmation email/i }),
    ).not.toBeInTheDocument();
  });

  it("conta não confirmada mostra alerta dedicado + botão de reenvio com feedback", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 403,
      ok: false,
      json: async () => ({
        error: {
          code: "ACCOUNT_NOT_CONFIRMED",
          message: "Confirm your email before signing in.",
        },
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    renderSignIn();

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText(/confirm your email before signing in/i),
    ).toBeInTheDocument();
    const resend = screen.getByRole("button", {
      name: /resend confirmation email/i,
    });

    fetchMock.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ ok: true }),
    } as unknown as Response);

    fireEvent.click(resend);

    expect(
      await screen.findByText(
        /check your inbox for the new confirmation link/i,
      ),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/auth/resend-confirmation",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "ada@example.com" }),
      }),
    );
  });

  it("mostra o banner de senha atualizada vindo de forgot-password", () => {
    renderSignIn({ pathname: "/auth/sign-in", state: { passwordReset: true } });

    expect(
      screen.getByText(/password updated\. sign in with your new password/i),
    ).toBeInTheDocument();
  });
});
