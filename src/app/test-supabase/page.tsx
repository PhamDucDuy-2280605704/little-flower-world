
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabasePage() {
  const [status, setStatus] = useState("Đang kiểm tra...");

  useEffect(() => {
    async function testConnection() {
      const { error } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

      if (error) {
        setStatus(`Lỗi: ${error.message}`);
        return;
      }

      setStatus("Kết nối Supabase thành công!");
    }

    testConnection();
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>Supabase Connection Test</h1>
      <p>{status}</p>
    </main>
  );
}
