import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import ResetPasswordPage from "./ResetPasswordPage";

function SignInStub() {
  const location = useLocation();
  const state = location.state as { passwordReset?: boolean } | null;
  return <h1>{state?.passwordReset ? "Password updated" : "Sign in"}</h1>;
}

function renderReset(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/sign-in" element={<SignInStub />} />
        <Route
          path="/auth/forgot-password"
          element={<h1>Reset your password</h1>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

const successResponse = {
  status: 200,
  ok: true,
  json: async () => ({ redirectTo: "/auth/sign-in" }),
} as unknown as Response;

describe("ResetPasswordPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza o formulário com token na URL", () => {
    renderReset("/auth/reset-password?token=abc123");

    expect(
      screen.getByRole("heading", { name: "Choose a new password" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update password" }),
    ).toBeInTheDocument();
  });

  it("sem token na URL mostra invalid link e link para forgot-password", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderReset("/auth/reset-password");

    expect(
      screen.getByRole("heading", {
        name: "We could not reset your password",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("This reset link is invalid.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Request a new reset link" }),
    ).toHaveAttribute("href", "/auth/forgot-password");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submit vazio exibe erro por campo sem chamar a API", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderReset("/auth/reset-password?token=abc123");

    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Choose a new password.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("senhas divergentes exibem erro no campo de confirmação sem chamar a API", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderReset("/auth/reset-password?token=abc123");

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-secure-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "different-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envia o payload correto e navega para sign-in em caso de sucesso", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse);
    vi.stubGlobal("fetch", fetchMock);
    renderReset("/auth/reset-password?token=abc123");

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-secure-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(
      await screen.findByRole("heading", { name: "Password updated" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/reset-password",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: "abc123",
          new_password: "new-secure-password",
          confirm_password: "new-secure-password",
        }),
      }),
    );
  });

  it("token inválido/expirado da API mostra erro e link para forgot-password", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 400,
      ok: false,
      json: async () => ({
        error: {
          code: "TOKEN_EXPIRED",
          message: "This reset link has expired.",
        },
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    renderReset("/auth/reset-password?token=expired");

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-secure-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(
      await screen.findByRole("heading", {
        name: "We could not reset your password",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This reset link has expired."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Request a new reset link" }),
    ).toHaveAttribute("href", "/auth/forgot-password");
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
    renderReset("/auth/reset-password?token=abc123");

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-secure-password" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(
      await screen.findByText("Something went wrong."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
