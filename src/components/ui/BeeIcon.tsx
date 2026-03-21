interface BeeIconProps {
  size?: number;
  className?: string;
}

export function BeeIcon({ size = 16, className }: BeeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Wings */}
      <ellipse cx="5.5" cy="5" rx="3" ry="2" fill="currentColor" opacity="0.35" />
      <ellipse cx="10.5" cy="5" rx="3" ry="2" fill="currentColor" opacity="0.35" />
      {/* Body */}
      <ellipse cx="8" cy="10" rx="3" ry="4.5" fill="currentColor" />
      {/* Stripes */}
      <rect x="5" y="8.5" width="6" height="1.2" rx="0.6" fill="white" opacity="0.6" />
      <rect x="5" y="10.8" width="6" height="1.2" rx="0.6" fill="white" opacity="0.6" />
      {/* Head */}
      <circle cx="8" cy="5.5" r="1.5" fill="currentColor" />
      {/* Antennae */}
      <line x1="7.2" y1="4.2" x2="6" y2="2.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="8.8" y1="4.2" x2="10" y2="2.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="6" cy="2.3" r="0.5" fill="currentColor" />
      <circle cx="10" cy="2.3" r="0.5" fill="currentColor" />
    </svg>
  );
}
