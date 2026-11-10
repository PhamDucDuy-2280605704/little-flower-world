"use client";
import Link from "next/link";
import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import styles from "@/app/login/page.module.css";

export default function ResetPasswordPageContent() {
  const { t } = useLanguage();
  return <main className={styles.page}>
    <section className={styles.card}>
      <div className={styles.stage}><span className={styles.stageCaption}>A NEW CHAPTER BEGINS</span></div>
      <div className={styles.formSide}>
        <ResetPasswordForm />
        <Link href="/" className={styles.backLink}>{t("Về trang chủ", "Back to home")}</Link>
      </div>
    </section>
  </main>;
}
