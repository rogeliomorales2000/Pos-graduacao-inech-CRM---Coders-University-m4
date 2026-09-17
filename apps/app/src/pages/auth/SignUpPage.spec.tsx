import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import SignUpPage from "./SignUpPage";

function renderSignUp() {
  return render(
    <MemoryRouter initialEntries={["/auth/sign-up"]}>
      <Routes>
        <Route path="/auth/sign-up" element={<SignUpPage />} />
        <Route path="/auth/sign-in" element={<h1>Sign in</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "Ada" },
  });
  fireEvent.change(screen.getByLabelText("Last name"), {
    target: { value: "Lovelace" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Phone"), {
    target: { value: "+5511988887777" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "password123" },
  });
}

const successResponse = {
  status: 201,
  ok: true,
  json: async () => ({ user: { id: "user-1", email: "ada@example.com" } }),
} as unknown as Response;

describe("SignUpPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza o formulário completo de cadastro", () => {
    renderSignUp();

    expect(
      screen.getByRole("heading", { name: "Create your account" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("senha diferente da confirmação pontua o campo de confirmação sem chamar a API", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderSignUp();

    fillValidForm();
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "different123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envia o payload correto e mostra o estado Check your email no sucesso", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse);
    vi.stubGlobal("fetch", fetchMock);
    renderSignUp();

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByRole("heading", { name: "Check your email" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/sign-up",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          first_name: "Ada",
          last_name: "Lovelace",
          email: "ada@example.com",
          phone: "+5511988887777",
          password: "password123",
          confirm_password: "password123",
        }),
      }),
    );
  });

  it("erro global da API (409) aparece como alerta de formulário", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 409,
      ok: false,
      json: async () => ({
        error: {
          code: "EMAIL_ALREADY_REGISTERED",
          message: "This email is already registered.",
        },
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    renderSignUp();

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("This email is already registered."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("erros de campo vindos da API são exibidos junto aos campos", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 400,
      ok: false,
      json: async () => ({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please fix the highlighted fields.",
          fields: { email: "Enter a valid email address." },
        },
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    renderSignUp();

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeInTheDocument();
  });
});
