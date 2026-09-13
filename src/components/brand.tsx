import { Badge } from "@nocoo/basalt";
import { version } from "../../package.json";

export function BrandMark({ size = 24 }: { size?: 24 | 32 | 64 }) {
  return (
    <img
      data-brand-mark
      className="shrink-0"
      src={`/brand/mark-${size * 2}.png`}
      width={size}
      height={size}
      alt=""
    />
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="snail-brand flex min-w-0 items-center gap-2">
      <span className="flex size-11 shrink-0 items-center justify-center">
        <BrandMark />
      </span>
      {!compact && (
        <>
          <span className="shrink-0">
            <img
              className="theme-light-only"
              src="/brand/wordmark-light.svg"
              width="80"
              height="40"
              alt="Snail"
            />
            <img
              className="theme-dark-only"
              src="/brand/wordmark-dark.svg"
              width="80"
              height="40"
              alt="Snail"
            />
          </span>
          <Badge variant="secondary" className="shrink-0 px-1.5 py-0.5 text-[10px] leading-none">
            v{version}
          </Badge>
        </>
      )}
    </div>
  );
}
