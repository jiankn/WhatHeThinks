/** 内联 SVG 图标（currentColor），避免引入图标库。 */

type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const LockIcon = ({ className = "h-4 w-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);
export const CheckIcon = ({ className = "h-4 w-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const UploadIcon = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <path d="M12 15.5V4m0 0L7.5 8.5M12 4l4.5 4.5" />
    <path d="M4.5 14.5v3a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3" />
  </svg>
);
export const ArrowRightIcon = ({ className = "h-4 w-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <path d="M5 12h14m-5-5 5 5-5 5" />
  </svg>
);
export const ArrowLeftIcon = ({ className = "h-4 w-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <path d="M19 12H5m5 5-5-5 5-5" />
  </svg>
);
export const TrashIcon = ({ className = "h-4 w-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <path d="M4.5 7h15M9.5 7V4.5h5V7m-8 0 .8 11.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7" />
  </svg>
);
export const SparkIcon = ({ className = "h-4 w-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6" />
  </svg>
);

export const MessageIcon = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <path d="M5.5 5.5h13a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3v-3h-1A2.5 2.5 0 0 1 3 14V8a2.5 2.5 0 0 1 2.5-2.5Z" />
    <path d="M7.5 11h.01m4.49 0h.01m4.49 0h.01" />
  </svg>
);

export const LightbulbIcon = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <path d="M8.5 15.5c-1.4-1.1-2.5-2.8-2.5-5a6 6 0 1 1 12 0c0 2.2-1.1 3.9-2.5 5-.7.6-1 1.1-1 2h-5c0-.9-.3-1.4-1-2Z" />
    <path d="M9.5 20h5M12 2V.5M4.9 3.4 3.8 2.3m15.3 1.1 1.1-1.1M3 10.5H1.5m21 0H21" />
  </svg>
);

export const HeartIcon = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <path d="M20.8 5.9c-2-2-5.2-2-7.2 0L12 7.5l-1.6-1.6a5.1 5.1 0 0 0-7.2 7.2L12 22l8.8-8.9a5.1 5.1 0 0 0 0-7.2Z" />
  </svg>
);

export const ShieldCheckIcon = ({ className = "h-6 w-6" }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden {...base}>
    <path d="M12 2.5 19 5v5.8c0 4.6-2.8 8.5-7 10.7-4.2-2.2-7-6.1-7-10.7V5l7-2.5Z" />
    <path d="m8.5 11.8 2.2 2.2 4.8-5" />
  </svg>
);
