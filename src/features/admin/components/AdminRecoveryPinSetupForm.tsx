"use client";

import { useEffect, useState, type FormEvent } from "react";
import { adminSupabase } from "@/lib/adminSupabase";
import { FAIRYTALE_GARDEN_ADMIN_USER_ID } from "@/features/garden/data/gardenThemes";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import styles from "../styles/AdminLoginForm.module.css";

export default function AdminRecoveryPinSetupForm() {
  const { t } = useLanguage();
  const [ready, setReady] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error: authError } = await adminSupabase.auth.getUser();
      if (!active) return;
      if (authError || data.user?.id !== FAIRYTALE_GARDEN_ADMIN_USER_ID) {
        await adminSupabase.auth.signOut({ scope: "local" });
        window.location.replace("/");
        return;
      }
      const { data: status, error: statusError } = await adminSupabase.functions.invoke("account-recovery", { body: { action: "status" } });
      if (!active) return;
      if (statusError || typeof status?.hasPin !== "boolean") {
        setError(t("Chưa xác minh được PIN quản trị. Hãy tải lại trang.", "Could not verify the Admin recovery PIN. Please reload."));
        return;
      }
      if (status.hasPin) {
        window.location.replace("/admin");
        return;
      }
      setReady(true);
    })().catch(() => { if (active) setError(t("Không thể kiểm tra phiên quản trị.", "Could not verify the Admin session.")); });
    return () => { active = false; };
  }, [t]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (!/^\d{6}$/.test(pin) || pin !== confirmPin) {
      setError(t("PIN phải gồm đúng 6 chữ số và hai lần nhập phải trùng nhau.", "PIN must be exactly 6 digits and both entries must match."));
      return;
    }
    setLoading(true); setError("");
    try {
      const { data, error: saveError } = await adminSupabase.functions.invoke("account-recovery", { body: { action: "set-pin", pin } });
      if (saveError || data?.ok !== true) throw new Error("PIN_SAVE_FAILED");
      window.location.replace("/admin");
    } catch {
      setError(t("Chưa lưu được PIN. Hãy thử lại.", "Could not save the PIN. Please try again."));
    } finally { setLoading(false); }
  }

  return <div className={styles.wrapper}>
    <div className={styles.heading}><p className={styles.eyebrow}>ADMIN ACCOUNT SECURITY</p><h1>{t("Thiết lập PIN quản trị", "Set up Admin recovery PIN")}</h1><p>{t("Tài khoản Admin cần có PIN khôi phục riêng gồm 6 chữ số trước khi vào trung tâm quản trị.", "The Admin account must set its own 6-digit recovery PIN before entering the control center.")}</p></div>
    {!ready && <p role="status">{t("Đang xác minh tài khoản...", "Verifying account...")}</p>}
    {ready && <form className={styles.form} onSubmit={submit}>
      <div className={styles.field}><label htmlFor="admin-pin">{t("PIN mới", "New PIN")}</label><input id="admin-pin" type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,6))} required /></div>
      <div className={styles.field}><label htmlFor="admin-pin-confirm">{t("Nhập lại PIN", "Confirm PIN")}</label><input id="admin-pin-confirm" type="password" inputMode="numeric" autoComplete="off" value={confirmPin} onChange={e=>setConfirmPin(e.target.value.replace(/\D/g,"").slice(0,6))} required /></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.submit} type="submit" disabled={loading}>{loading ? t("Đang lưu...", "Saving...") : t("Lưu PIN quản trị", "Save Admin PIN")}</button>
    </form>}
    {error && !ready && <p className={styles.error} role="alert">{error}</p>}
  </div>;
}
