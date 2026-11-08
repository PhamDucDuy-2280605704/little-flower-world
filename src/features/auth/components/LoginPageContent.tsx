"use client";

import Link from "next/link";
import LoginForm from "@/features/auth/components/LoginForm";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import styles from "@/app/login/page.module.css";

export default function LoginPageContent() {
  const { t } = useLanguage();
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.stage}>
          <span className={styles.stageCaption}>WORDS BECOME MEMORIES</span>
        </div>
        <div className={styles.formSide}>
          <LoginForm />
          <Link href="/" className={styles.backLink}>{t("Về trang chủ", "Back to home")}</Link>
        </div>
      </section>
    </main>
  );
}
