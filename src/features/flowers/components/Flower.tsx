import type { ComponentType } from "react";
import type { FlowerKind, FlowerProps } from "@/types/flower";
import DaisyFlower from "./DaisyFlower";
import TulipFlower from "./TulipFlower";
import SunflowerFlower from "./SunflowerFlower";
import RoseFlower from "./RoseFlower";

// Bảng tra: tên loài hoa → component tương ứng.
// Record<FlowerKind, ...> bắt TypeScript kiểm tra: thiếu loài nào là báo lỗi ngay.
const flowerComponents: Record<FlowerKind, ComponentType<FlowerProps>> = {
  daisy: DaisyFlower,
  tulip: TulipFlower,
  sunflower: SunflowerFlower,
  rose: RoseFlower,
};

type Props = FlowerProps & { kind: FlowerKind };

// Dùng: <Flower kind="rose" size={0.8} color="#ff7a8a" />
export default function Flower({ kind, ...flowerProps }: Props) {
  const Component = flowerComponents[kind];
  return <Component {...flowerProps} />;
}
