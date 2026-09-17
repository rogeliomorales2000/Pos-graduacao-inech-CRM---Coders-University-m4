export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export function getAppUrl(): string {
  return process.env.APP_URL ?? "http://localhost:5173";
}

const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Intech CRM <no-reply@intech.local>";

export function parseEmailSender(sender: string): {
  email: string;
  name?: string;
} {
  const match = sender.match(/^(.*)<([^>]+)>\s*$/);
  if (match) {
    const [, rawName = "", rawEmail = ""] = match;
    const name = rawName.trim();
    const email = rawEmail.trim();
    return email
      ? name
        ? { email, name }
        : { email }
      : { email: sender.trim() };
  }
  return { email: sender.trim() };
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.info(
      `[email] provider=console to=${message.to} subject="${message.subject}"\n${message.text}`,
    );
  }
}

export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey = process.env.RESEND_API_KEY) {}

  async send(message: EmailMessage): Promise<void> {
    if (!this.apiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend request failed with status ${response.status}.`);
    }
  }
}

export class MailtrapEmailProvider implements EmailProvider {
  constructor(
    private readonly apiToken = process.env.MAILTRAP_API_TOKEN,
    private readonly sandboxId = process.env.MAILTRAP_SANDBOX_ID,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    if (!this.apiToken) {
      throw new Error("MAILTRAP_API_TOKEN is not configured.");
    }
    if (!this.sandboxId) {
      throw new Error("MAILTRAP_SANDBOX_ID is not configured.");
    }
    const response = await fetch(
      `https://sandbox.api.mailtrap.io/api/send/${this.sandboxId}`,
      {
        method: "POST",
        headers: {
          "api-token": this.apiToken,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: parseEmailSender(EMAIL_FROM),
          to: [{ email: message.to }],
          subject: message.subject,
          text: message.text,
        }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Mailtrap request failed with status ${response.status}.`,
      );
    }
  }
}

export function createEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER;
  if (provider === "resend") {
    return new ResendEmailProvider();
  }
  if (provider === "mailtrap") {
    return new MailtrapEmailProvider();
  }
  if (provider === "console") {
    return new ConsoleEmailProvider();
  }
  return process.env.NODE_ENV === "production"
    ? new ResendEmailProvider()
    : new ConsoleEmailProvider();
}

export interface EmailService {
  sendConfirmationEmail(args: {
    to: string;
    confirmationLink: string;
  }): Promise<void>;
  sendNewSessionEmail(args: { to: string }): Promise<void>;
  sendPasswordResetEmail(args: {
    to: string;
    resetLink: string;
  }): Promise<void>;
  sendPasswordResetSuccess(args: { to: string }): Promise<void>;
}

export function createEmailService(provider: EmailProvider): EmailService {
  return {
    sendConfirmationEmail({ to, confirmationLink }) {
      return provider.send({
        to,
        subject: "Confirm your Intech CRM account",
        text: [
          "Welcome to Intech CRM.",
          "",
          "Confirm your account by opening the link below:",
          confirmationLink,
          "",
          "If you did not create this account, you can ignore this email.",
        ].join("\n"),
      });
    },
    sendNewSessionEmail({ to }) {
      return provider.send({
        to,
        subject: "New sign-in to your Intech CRM account",
        text: [
          "A new session was created for your Intech CRM account.",
          "",
          "If this was you, no action is needed.",
          "If it was not you, reset your password right away.",
        ].join("\n"),
      });
    },
    sendPasswordResetEmail({ to, resetLink }) {
      return provider.send({
        to,
        subject: "Reset your Intech CRM password",
        text: [
          "We received a request to reset your Intech CRM password.",
          "",
          "Open the link below to choose a new password:",
          resetLink,
          "",
          "The link expires in 30 minutes. If you did not request it, ignore this email.",
        ].join("\n"),
      });
    },
    sendPasswordResetSuccess({ to }) {
      return provider.send({
        to,
        subject: "Your Intech CRM password was updated",
        text: [
          "Your Intech CRM password was updated successfully.",
          "",
          "All active sessions were signed out. If this was not you, reset your password and contact support.",
        ].join("\n"),
      });
    },
  };
}

let overrideService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!overrideService) {
    overrideService = createEmailService(createEmailProvider());
  }
  return overrideService;
}

export function setEmailService(service: EmailService | null): void {
  overrideService = service;
}
