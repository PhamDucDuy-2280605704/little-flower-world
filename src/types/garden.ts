import type { FlowerKind } from "@/types/flower";

// Ban ngày hay ban đêm.
export type TimeOfDay = "day" | "night";

// Ba mức gió: lặng, nhẹ, mạnh.
export type WindLevel = "calm" | "breeze" | "strong";

// Thông số của một mức gió.
export type WindSetting = {
  label: string; // chữ hiện trên nút
  swayDuration: string; // một chu kỳ đung đưa của hoa, ví dụ "4s"
  swayAngle: string; // góc nghiêng tối đa của hoa, ví dụ "3deg"
  speed: number; // hệ số nhân thời gian rơi/bay (càng nhỏ càng nhanh)
  drift: string; // cánh hoa, lá bị gió đẩy ngang bao xa, ví dụ "70px"
  gusts: number; // số vệt gió hiện ra
};

// Một vật thể đặt trong khu vườn (hiện tại là các bông hoa).
// Sau này mỗi dòng sẽ là một bản ghi trong bảng "garden_items" của database.
export type GardenItem = {
  id: string;
  kind: FlowerKind;
  color: string;
  x: number; // vị trí ngang: 0 = mép trái, 100 = mép phải (đơn vị %)
  depth: number; // độ xa: 0 = gần người xem (phía trước), 1 = xa nhất (phía sau)
  size: number; // cỡ gốc của hoa
  chapterId?: string; // có giá trị = bấm vào hoa sẽ mở chương này
  label?: string; // nhãn nhỏ phía trên hoa, ví dụ "Chương 1"
  title?: string; // tên chương (đọc cho người dùng trình đọc màn hình)
};
