"use client";
import Link from "next/link";
import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import styles from "@/app/login/page.module.css";

export default function ForgotPasswordPageContent() {
  const { t } = useLanguage();
  return <main className={styles.page}>
    <section className={styles.card}>
      <div className={styles.stage}><span className={styles.stageCaption}>A WAY BACK TO YOUR STORIES</span></div>
      <div className={styles.formSide}>
        <ForgotPasswordForm />
        <Link href="/" className={styles.backLink}>{t("Về trang chủ", "Back to home")}</Link>
      </div>
    </section>
  </main>;
}
