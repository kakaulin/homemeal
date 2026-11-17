"use client";

import { Button } from "@heroui/react";
import { useEffect, useRef } from "react";

import { loadGoogleScript, useAuth } from "@/lib/authClient";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleAuthControl({ compact = false }: { compact?: boolean }) {
  const session = useAuth((state) => state.session);
  const ready = useAuth((state) => state.ready);
  const signingIn = useAuth((state) => state.signingIn);
  const error = useAuth((state) => state.error);
  const hydrate = useAuth((state) => state.hydrate);
  const signIn = useAuth((state) => state.signIn);
  const signOut = useAuth((state) => state.signOut);

  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!clientId || session) return;

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            void signIn(response.credential);
          },
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: compact ? "medium" : "large",
          shape: "pill",
          text: "signin_with",
          locale: "ru",
          width: compact ? 210 : 300,
        });
      })
      .catch(() => {
        /* скрипт недоступен — покажем текст ниже */
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, session, compact, signIn]);

  if (!ready) return null;

  if (session) {
    return (
      <div className={compact ? "flex items-center gap-2" : "flex flex-col items-start gap-3"}>
        <div className="flex min-w-0 items-center gap-2">
          {session.user.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.picture}
              alt=""
              className="size-8 shrink-0 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {session.user.name ?? session.user.email}
            </p>
            <p className="truncate text-xs text-muted">{session.user.email}</p>
          </div>
        </div>
        <Button size="sm" variant="tertiary" onPress={signOut}>
          Выйти
        </Button>
        {session.user.isAdmin ? null : (
          <p className="text-[11px] text-muted">Права администратора не выданы</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {clientId ? (
        <div ref={buttonRef} />
      ) : (
        <p className="text-xs text-muted">Вход через Google не настроен</p>
      )}
      {signingIn ? <p className="text-xs text-muted">Входим…</p> : null}
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}
