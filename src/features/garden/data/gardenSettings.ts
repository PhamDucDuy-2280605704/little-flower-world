import type { TimeOfDay, WindLevel, WindSetting } from "@/types/garden";

// Thông số cho từng mức gió. Muốn gió mạnh hơn/nhẹ hơn, chỉ cần sửa số ở đây.
export const windSettings: Record<WindLevel, WindSetting> = {
  calm: {
    label: "Lặng",
    swayDuration: "6s",
    swayAngle: "1.5deg",
    speed: 1.5,
    drift: "20px",
    gusts: 0,
  },
  breeze: {
    label: "Nhẹ",
    swayDuration: "4s",
    swayAngle: "3deg",
    speed: 1,
    drift: "70px",
    gusts: 3,
  },
  strong: {
    label: "Mạnh",
    swayDuration: "2.4s",
    swayAngle: "6deg",
    speed: 0.6,
    drift: "170px",
    gusts: 7,
  },
};

// Thứ tự các mức gió trên bảng điều khiển.
export const windLevels: WindLevel[] = ["calm", "breeze", "strong"];

// Chữ hiện trên nút ngày/đêm.
export const timeLabels: Record<TimeOfDay, string> = {
  day: "Ban ngày",
  night: "Ban đêm",
};
