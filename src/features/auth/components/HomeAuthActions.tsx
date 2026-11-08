"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type HomeAuthActionsProps = {
  actionsClassName: string;
  loginClassName: string;
  giftClassName: string;
  messageClassName: string;
};

export default function HomeAuthActions({
  actionsClassName,
  loginClassName,
  giftClassName,
  messageClassName,
}: HomeAuthActionsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      setUser(session?.user ?? null);
      setAuthReady(true);
      setError("");
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          console.error("Get home session error:", error);
        }

        setUser(data.session?.user ?? null);
        setAuthReady(true);
      })
      .catch((error: unknown) => {
        if (!active) return;

        console.error("Get home session failed:", error);
        setUser(null);
        setAuthReady(true);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      // Do not revoke other sessions for the same account (e.g. the separate admin portal).
      const { error } = await supabase.auth.signOut({ scope: "local" });

      if (error) {
        throw error;
      }

      setUser(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Đăng xuất chưa thành công. Anh thử lại nhé.";

      setError(message);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className={actionsClassName}>
      {!authReady ? (
        <span className={loginClassName} role="status">
          Đang kiểm tra tài khoản...
        </span>
      ) : user ? (
        <button
          type="button"
          className={loginClassName}
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          aria-busy={loggingOut}
          style={{
            font: "inherit",
            cursor: loggingOut ? "wait" : "pointer",
            border: "none",
          }}
        >
          {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
      ) : (
        <Link href="/login" className={loginClassName}>
          Đăng nhập để mở quà
        </Link>
      )}

      <Link href="/gift" className={giftClassName}>
        Xem thử hộp quà
      </Link>

      <Link href="/studio" className={giftClassName}>
        Tạo khu vườn
      </Link>

      <Link href="/admin/login" className={giftClassName}>
        Cổng quản trị
      </Link>

      {error && (
        <p className={messageClassName} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
