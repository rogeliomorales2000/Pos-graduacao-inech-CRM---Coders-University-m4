import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ConsoleEmailProvider,
  createEmailProvider,
  createEmailService,
  MailtrapEmailProvider,
  parseEmailSender,
  ResendEmailProvider,
  type EmailMessage,
  type EmailProvider,
} from "./email";

function withEnv(
  values: Record<string, string | undefined>,
  run: () => void,
): void {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    const next = values[key];
    if (next === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = next;
    }
  }
  try {
    run();
  } finally {
    for (const key of Object.keys(values)) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe("createEmailProvider", () => {
  it("seleciona Resend quando EMAIL_PROVIDER=resend", () => {
    withEnv({ EMAIL_PROVIDER: "resend" }, () => {
      expect(createEmailProvider()).toBeInstanceOf(ResendEmailProvider);
    });
  });

  it("seleciona Mailtrap quando EMAIL_PROVIDER=mailtrap", () => {
    withEnv({ EMAIL_PROVIDER: "mailtrap" }, () => {
      expect(createEmailProvider()).toBeInstanceOf(MailtrapEmailProvider);
    });
  });

  it("seleciona Console quando EMAIL_PROVIDER=console", () => {
    withEnv({ EMAIL_PROVIDER: "console" }, () => {
      expect(createEmailProvider()).toBeInstanceOf(ConsoleEmailProvider);
    });
  });

  it("faz fallback para Console fora de produção sem EMAIL_PROVIDER", () => {
    withEnv({ EMAIL_PROVIDER: undefined, NODE_ENV: "test" }, () => {
      expect(createEmailProvider()).toBeInstanceOf(ConsoleEmailProvider);
    });
  });

  it("faz fallback para Resend em produção sem EMAIL_PROVIDER", () => {
    withEnv({ EMAIL_PROVIDER: undefined, NODE_ENV: "production" }, () => {
      expect(createEmailProvider()).toBeInstanceOf(ResendEmailProvider);
    });
  });
});

describe("ConsoleEmailProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loga o conteúdo completo do email (fallback de dev)", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const provider = new ConsoleEmailProvider();

    await provider.send({
      to: "ada@example.com",
      subject: "Confirm your account",
      text: "token=abc123",
    });

    expect(info).toHaveBeenCalledTimes(1);
    const output = info.mock.calls[0]?.join(" ") ?? "";
    expect(output).toContain("ada@example.com");
    expect(output).toContain("Confirm your account");
    expect(output).toContain("token=abc123");
  });
});

describe("createEmailService", () => {
  function capturingProvider() {
    const messages: EmailMessage[] = [];
    const provider: EmailProvider = {
      async send(message) {
        messages.push(message);
      },
    };
    return { provider, messages };
  }

  it("envia o email de confirmação com o link", async () => {
    const { provider, messages } = capturingProvider();
    const service = createEmailService(provider);

    await service.sendConfirmationEmail({
      to: "ada@example.com",
      confirmationLink: "https://app.test/auth/confirm-account?token=abc",
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.to).toBe("ada@example.com");
    expect(messages[0]?.text).toContain(
      "https://app.test/auth/confirm-account?token=abc",
    );
  });

  it("envia o email de nova sessão", async () => {
    const { provider, messages } = capturingProvider();
    const service = createEmailService(provider);

    await service.sendNewSessionEmail({ to: "ada@example.com" });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.subject).toMatch(/new sign-in/i);
  });

  it("envia o email de reset com o link", async () => {
    const { provider, messages } = capturingProvider();
    const service = createEmailService(provider);

    await service.sendPasswordResetEmail({
      to: "ada@example.com",
      resetLink: "https://app.test/auth/reset-password?token=xyz",
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.text).toContain(
      "https://app.test/auth/reset-password?token=xyz",
    );
  });

  it("envia o email de sucesso do reset", async () => {
    const { provider, messages } = capturingProvider();
    const service = createEmailService(provider);

    await service.sendPasswordResetSuccess({ to: "ada@example.com" });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.subject).toMatch(/password was updated/i);
  });
});

describe("parseEmailSender", () => {
  it("extrai nome e email de 'Name <email>'", () => {
    expect(parseEmailSender("Intech CRM <no-reply@intech.dev>")).toEqual({
      email: "no-reply@intech.dev",
      name: "Intech CRM",
    });
  });

  it("aceita apenas o email sem nome", () => {
    expect(parseEmailSender("no-reply@intech.dev")).toEqual({
      email: "no-reply@intech.dev",
    });
  });
});
