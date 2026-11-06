"use client";

// Form đăng nhập (chỉ phần GIAO DIỆN).
// Hiện tại form KHÔNG gửi dữ liệu đi đâu cả: ở Giai đoạn 4 chúng ta sẽ
// nối nó với Supabase Authentication. Mật khẩu chưa bao giờ được lưu hay in ra.

import { useState } from "react";
import type { FormEvent } from "react";
import styles from "../styles/LoginForm.module.css";

// Kiểu dữ liệu cho các lỗi: mỗi ô có thể có hoặc không có thông báo lỗi.
type FormErrors = {
  email?: string;
  password?: string;
};

// Kiểm tra dữ liệu nhập vào, trả về danh sách lỗi (rỗng = hợp lệ).
function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {};

  if (email.trim() === "") {
    errors.email = "Hãy nhập email của bạn.";
  } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    // Biểu thức /.../ kiểm tra dạng "ten@mien.com"
    errors.email = "Email chưa đúng dạng, ví dụ: ten@gmail.com.";
  }

  if (password === "") {
    errors.password = "Hãy nhập mật khẩu.";
  }

  return errors;
}

export default function LoginForm() {
  // Mỗi useState là một "ô nhớ" của form.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [checked, setChecked] = useState(false); // đã kiểm tra hợp lệ xong chưa

  // Chạy khi bấm nút "Đăng nhập" (hoặc nhấn Enter).
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Chặn hành vi mặc định (tải lại trang) của thẻ <form>.
    event.preventDefault();

    const foundErrors = validate(email, password);
    setErrors(foundErrors);

    // Object.keys(...).length === 0 nghĩa là không có lỗi nào.
    setChecked(Object.keys(foundErrors).length === 0);
  }

  return (
    <div className={styles.wrapper}>
      <div>
        <h1 className={styles.title}>Một món quà đang chờ bạn</h1>
        <p className={styles.subtitle}>
          Nhập email và mật khẩu mà người tặng đã gửi cho bạn.
        </p>
      </div>

      {/* noValidate: tắt thông báo mặc định của trình duyệt để dùng thông báo của mình */}
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {/* Ô email */}
        <div className={styles.field}>
          <label htmlFor="login-email" className={styles.label}>
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            className={styles.input}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "login-email-error" : undefined}
          />
          {errors.email && (
            <p id="login-email-error" className={styles.error} role="alert">
              {errors.email}
            </p>
          )}
        </div>

        {/* Ô mật khẩu + nút hiện/ẩn */}
        <div className={styles.field}>
          <label htmlFor="login-password" className={styles.label}>
            Mật khẩu
          </label>
          <div className={styles.passwordRow}>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className={styles.input}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
            />
            <button
              type="button"
              className={styles.toggle}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
          {errors.password && (
            <p id="login-password-error" className={styles.error} role="alert">
              {errors.password}
            </p>
          )}
        </div>

        <button type="submit" className={styles.submit}>
          Đăng nhập
        </button>
      </form>

      {/* Thông báo tạm thời khi form hợp lệ */}
      {checked && (
        <p className={styles.notice} role="status">
          🌷 Form đã điền đúng! Tính năng đăng nhập thật sẽ được nối ở giai
          đoạn làm Supabase, nên lúc này chưa vào vườn được.
        </p>
      )}

      <p className={styles.hint}>
        Chưa có tài khoản? Khu vườn này chỉ dành cho người được mời, hãy nhờ
        người tặng cấp tài khoản cho bạn nhé.
      </p>
    </div>
  );
}
