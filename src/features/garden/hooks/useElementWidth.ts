import { useLayoutEffect, useRef, useState } from "react";

// Hook: theo dõi chiều rộng hiện tại của một phần tử trên trang.
// Dùng để thu nhỏ khu vườn cho vừa màn hình điện thoại.
// ResizeObserver là công cụ có sẵn của trình duyệt: báo cho mình mỗi khi kích thước đổi.
export function useElementWidth<T extends HTMLElement>() {
  // ref = "tay nắm" tới phần tử thật trên trang
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(element);

    // Dọn dẹp khi phần tử biến mất
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
