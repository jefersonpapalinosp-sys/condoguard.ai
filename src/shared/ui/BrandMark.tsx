type BrandMarkProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<BrandMarkProps['size']>, string> = {
  sm: 'h-9 w-9 rounded-[1rem]',
  md: 'h-11 w-11 rounded-[1.2rem]',
  lg: 'h-14 w-14 rounded-[1.4rem]',
};

export function BrandMark({ size = 'md', className = '' }: BrandMarkProps) {
  return (
    <div
      aria-hidden="true"
      className={`atlas-mark relative isolate overflow-hidden border border-white/15 shadow-[0_14px_35px_rgba(8,20,24,0.18)] ${SIZE_CLASS[size]} ${className}`.trim()}
    >
      <span className="absolute inset-0 bg-[linear-gradient(145deg,#10343a_0%,#1f5f5e_58%,#c98d48_100%)]" />
      <span className="absolute inset-[2px] rounded-[inherit] border border-white/12 bg-[radial-gradient(circle_at_26%_24%,rgba(255,255,255,0.20),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.02))]" />
      <span className="absolute left-[21%] top-[18%] h-[58%] w-[58%] rounded-[30%] border border-white/45 bg-white/8 rotate-[18deg]" />
      <span className="absolute right-[18%] top-[21%] h-[30%] w-[30%] rounded-full bg-white/88 shadow-[0_0_20px_rgba(255,255,255,0.25)]" />
      <span className="absolute bottom-[20%] left-[18%] h-[12%] w-[48%] rounded-full bg-white/30" />
    </div>
  );
}
