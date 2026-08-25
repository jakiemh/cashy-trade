import Image from "next/image";
import { resolveAvatarUrl } from "@/lib/cashy";

type CashyAvatarProps = {
  src?: string | null;
  size?: number;
  className?: string;
  alt?: string;
};

export default function CashyAvatar({
  src,
  size = 48,
  className = "",
  alt = "Cashy",
}: CashyAvatarProps) {
  return (
    <Image
      src={resolveAvatarUrl(src)}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      className={`rounded-full border-2 border-emerald-300/80 object-cover shadow-lg shadow-emerald-200/40 ${className}`}
    />
  );
}
