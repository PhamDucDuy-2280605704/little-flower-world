// File này chỉ chứa "kiểu dữ liệu" (type) – giống như bản thiết kế
// để TypeScript kiểm tra giúp chúng ta không viết sai.

// Các loài hoa mà website đang có.
export type FlowerKind =
  | "daisy"
  | "tulip"
  | "sunflower"
  | "rose"
  | "lavender"
  | "cherry"
  | "lotus"
  | "dandelion";

// "Props" chung của mọi bông hoa.
// Dấu ? nghĩa là không bắt buộc: không truyền thì dùng giá trị mặc định.
export type FlowerProps = {
  size?: number; // tỉ lệ kích thước: 1 = gốc, 0.5 = một nửa, 1.2 = lớn hơn 20%
  color?: string; // màu chính của hoa, ví dụ "#ff7a8a"
  blown?: boolean; // chỉ bồ công anh dùng: true = hạt đã bị gió thổi bay
};

// Thông tin mô tả của từng loài hoa (dùng trong thư viện hoa).
export type FlowerInfo = {
  kind: FlowerKind;
  name: string;
  description: string;
  defaultColor: string;
};
