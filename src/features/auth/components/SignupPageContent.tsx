"use client";

import Link from "next/link";
import SignupForm from "@/features/auth/components/SignupForm";
import { useLanguage } from "@/features/i18n/LanguageProvider";
import styles from "@/app/login/page.module.css";

export default function SignupPageContent() {
  const { t } = useLanguage();
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.stage}>
          <span className={styles.stageCaption}>YOUR STORY STARTS HERE</span>
        </div>
        <div className={styles.formSide}>
          <SignupForm />
          <Link href="/" className={styles.backLink}>{t("Về trang chủ", "Back to home")}</Link>
        </div>
      </section>
    </main>
  );
}
