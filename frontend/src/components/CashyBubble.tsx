"use client";

import { FormEvent, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import CashyAvatar from "@/components/CashyAvatar";
import { useClientAuth } from "@/hooks/useClientAuth";
import { api, getToken } from "@/lib/api";
import { DEFAULT_CASHY_AVATAR } from "@/lib/cashy";

type ChatItem = { role: "user" | "assistant"; content: string };

export type CashyBubbleHandle = {
  open: () => void;
};

const QUICK_ACTIONS: Record<string, string[]> = {
  es: ["tasa de acierto", "señales hoy", "precio AAPL", "noticias NVDA", "estadísticas", "ayuda"],
  en: ["win rate", "signals today", "AAPL price", "NVDA news", "stats", "help"],
};

export default forwardRef<CashyBubbleHandle>(function CashyBubble(_, ref) {
  const [open, setOpen] = useState(false);
  const { ready, authed } = useClientAuth();
  const [botName, setBotName] = useState("Cashy");
  const [locale, setLocale] = useState("es");
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_CASHY_AVATAR);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
  }));

  function loadSettings() {
    if (!getToken()) return;
    api.getSettings().then((settings) => {
      const name = settings.bot_name || "Cashy";
      const userLocale = settings.locale?.startsWith("en") ? "en" : "es";
      setBotName(name);
      setLocale(userLocale);
      setAvatarUrl(settings.bot_avatar_url || DEFAULT_CASHY_AVATAR);
      setMessages((prev) =>
        prev.length
          ? prev
          : [
              {
                role: "assistant",
                content:
                  userLocale === "en"
                    ? `Hi, I'm ${name}. Ask me about signals, trades, or stats.`
                    : `Hola, soy ${name}. Pregúntame por señales, trades o stats.`,
              },
            ]
      );
      setInitialized(true);
    });
  }

  useEffect(() => {
    if (!ready || !authed) return;
    loadSettings();
    const handler = () => loadSettings();
    window.addEventListener("cashy-settings-updated", handler);
    return () => window.removeEventListener("cashy-settings-updated", handler);
  }, [ready, authed]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [messages, open, loading]);

  if (!ready || !authed || !initialized) return null;

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setOpen(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const reply = await api.chat(text);
      setMessages((prev) => [...prev, { role: "assistant", content: reply.content }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: err instanceof Error ? err.message : "Error" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await sendMessage(input);
  }

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[55] flex flex-col bg-white sm:inset-auto sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:right-4 sm:max-h-[min(70dvh,560px)] sm:w-[min(92vw,380px)] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-emerald-100 sm:bg-white/95 sm:shadow-2xl sm:shadow-emerald-200/40 sm:backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-white to-emerald-50 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-3">
            <div className="flex items-center gap-3">
              <CashyAvatar src={avatarUrl} size={40} />
              <div>
                <p className="font-semibold text-slate-800">{botName}</p>
                <p className="text-xs font-medium text-brand-600">
                  {locale === "en" ? "Online" : "En línea"}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar chat"
              className="rounded-full p-2 text-slate-400 hover:bg-emerald-50 hover:text-slate-700"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-emerald-50 bg-emerald-50/40 px-3 py-2">
            {(QUICK_ACTIONS[locale] ?? QUICK_ACTIONS.es).map((action) => (
              <button
                key={action}
                type="button"
                className="rounded-full border border-emerald-100 bg-white px-2.5 py-1.5 text-xs text-slate-600 shadow-sm active:bg-emerald-50"
                onClick={() => sendMessage(action)}
              >
                {action}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-white to-emerald-50/30 px-3 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={message.role === "assistant" ? "chat-assistant" : "chat-user"}>
                  {message.content}
                </div>
              </div>
            ))}
            {loading ? (
              <p className="text-xs text-muted">
                {locale === "en" ? `${botName} is thinking...` : `${botName} está pensando...`}
              </p>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <form className="flex gap-2 border-t border-emerald-100 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3">
            <input
              className="input-field min-w-0 flex-1 py-3 sm:py-2 sm:text-sm"
              placeholder={
                locale === "en" ? `Message ${botName}...` : `Escribe a ${botName}...`
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={loading} className="btn-primary shrink-0 px-4 py-3 sm:py-2">
              →
            </button>
          </form>
        </div>
      ) : null}

      {!open ? (
        <button
          type="button"
          aria-label="Abrir Cashy"
          className="floating-action floating-action-right group relative hidden rounded-full border-2 border-emerald-300 bg-white p-1 shadow-xl shadow-emerald-200/60 transition active:scale-95 sm:hover:scale-105 md:block"
          onClick={() => setOpen(true)}
        >
          <CashyAvatar src={avatarUrl} size={56} className="border-brand-400" />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-gradient text-[10px] font-bold text-white">
            ?
          </span>
        </button>
      ) : null}
    </>
  );
});
