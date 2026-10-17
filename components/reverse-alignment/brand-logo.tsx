import Image from "next/image";
import { cn } from "@/lib/utils";
// Static import: served from /_next/static, which the auth proxy skips (a /public path would be redirected to login).
import mark from "@/public/brand/promptflip-mark.png";

// PromptFlip logo: the mark (transparent PNG cut from artifacts/image/logo.jpeg) plus a live-text wordmark,
// so it stays crisp and readable in light and dark mode.
export function BrandLogo({
  size = 24,
  showName = true,
  className,
}: {
  size?: number;
  showName?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Image
        alt={showName ? "" : "PromptFlip"}
        className="shrink-0"
        height={size}
        priority
        src={mark}
        width={size}
      />
      {showName ? (
        <span className="font-semibold tracking-tight">
          Prompt<span className="text-primary">Flip</span>
        </span>
      ) : null}
    </span>
  );
}
