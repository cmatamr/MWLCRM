import { redactLogArgs } from "@/lib/security/redaction";

type ConsoleMethod = "debug" | "info" | "log" | "warn" | "error";

declare global {
  var __MWL_CONSOLE_REDACTION_INSTALLED__: boolean | undefined;
}

function wrapConsoleMethod(method: ConsoleMethod) {
  const original = console[method].bind(console);

  console[method] = (...args: unknown[]) => {
    original(...redactLogArgs(args));
  };
}

if (!globalThis.__MWL_CONSOLE_REDACTION_INSTALLED__) {
  wrapConsoleMethod("debug");
  wrapConsoleMethod("info");
  wrapConsoleMethod("log");
  wrapConsoleMethod("warn");
  wrapConsoleMethod("error");

  globalThis.__MWL_CONSOLE_REDACTION_INSTALLED__ = true;
}

export {};
