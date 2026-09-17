import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ForgotPasswordPage from "./ForgotPasswordPage";

function renderForgotPassword() {
  return render(
    <MemoryRouter initialEntries={["/auth/forgot-password"]}>
      <Routes>
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/sign-in" element={<h1>Sign in</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

const successResponse = {
  status: 200,
  ok: true,
  json: async () => ({ ok: true }),
} as unknown as Response;

describe("ForgotPasswordPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza o formulário de email e telefone com link para sign-in", () => {
    renderForgotPassword();

    expect(
      screen.getByRole("heading", { name: "Reset your password" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send reset link" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
  });

  it("campos vazios exibem erros por campo sem chamar a API", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderForgotPassword();

    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(screen.getByText("Enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your phone number.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envia o payload correto e mostra sucesso genérico com link para sign-in", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse);
    vi.stubGlobal("fetch", fetchMock);
    renderForgotPassword();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "+5511988887777" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(
      await screen.findByRole("heading", { name: "Check your email" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we sent a password reset link/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/forgot-password",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "ada@example.com",
          phone: "+5511988887777",
        }),
      }),
    );
  });

  it("falha da API aparece como alerta de formulário", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
      json: async () => ({
        error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    renderForgotPassword();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "+5511988887777" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(
      await screen.findByText("Something went wrong."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
