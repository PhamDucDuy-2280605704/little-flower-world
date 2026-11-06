import type { FlowerInfo, FlowerKind } from "@/types/flower";

// Danh mục các loài hoa. Muốn thêm hoa mới, chỉ cần thêm một dòng ở đây
// (và tạo component cho loài hoa đó).
export const flowerCatalog: FlowerInfo[] = [
  {
    kind: "daisy",
    name: "Hoa cúc",
    description: "Tám cánh mỏng và nhụy vàng, nhỏ nhắn và hiền lành.",
    defaultColor: "#ffb3cb",
  },
  {
    kind: "tulip",
    name: "Hoa tulip",
    description: "Ba cánh khép lại như đang ôm một bí mật nhỏ.",
    defaultColor: "#ff7a8a",
  },
  {
    kind: "sunflower",
    name: "Hướng dương",
    description: "Hai vòng cánh vàng xoay quanh nhụy nâu đầy hạt.",
    defaultColor: "#ffc928",
  },
  {
    kind: "rose",
    name: "Hoa hồng",
    description: "Nhiều lớp cánh chồng lên nhau, xoay nhẹ vào trong.",
    defaultColor: "#e0436a",
  },
];

// Bảng màu để thử đổi màu hoa.
export const colorSwatches: { name: string; value: string }[] = [
  { name: "Hồng phấn", value: "#ffb3cb" },
  { name: "San hô", value: "#ff7a8a" },
  { name: "Vàng nắng", value: "#ffc928" },
  { name: "Đỏ hồng", value: "#e0436a" },
  { name: "Tím oải hương", value: "#b9a2ff" },
  { name: "Xanh da trời", value: "#7cc7ff" },
];

// Tìm thông tin của một loài hoa theo "kind".
export function getFlowerInfo(kind: FlowerKind): FlowerInfo {
  const info = flowerCatalog.find((item) => item.kind === kind);
  // Nếu không tìm thấy thì báo lỗi rõ ràng để dễ sửa.
  if (!info) {
    throw new Error(`Không có loài hoa: ${kind}`);
  }
  return info;
}
