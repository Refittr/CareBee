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
      {/* Wings - fanned out to sides */}
      <ellipse cx="4" cy="6.5" rx="3.2" ry="1.6" fill="currentColor" opacity="0.3" transform="rotate(-20 4 6.5)" />
      <ellipse cx="12" cy="6.5" rx="3.2" ry="1.6" fill="currentColor" opacity="0.3" transform="rotate(20 12 6.5)" />
      {/* Abdomen - elongated, tapered */}
      <ellipse cx="8" cy="11" rx="2.4" ry="3.5" fill="currentColor" />
      {/* Stripes on abdomen */}
      <rect x="5.6" y="9.2" width="4.8" height="1" rx="0.5" fill="white" opacity="0.55" />
      <rect x="5.6" y="11.2" width="4.8" height="1" rx="0.5" fill="white" opacity="0.55" />
      <rect x="6" y="13.2" width="4" height="0.8" rx="0.4" fill="white" opacity="0.4" />
      {/* Thorax */}
      <ellipse cx="8" cy="7.2" rx="2" ry="1.6" fill="currentColor" />
      {/* Head */}
      <circle cx="8" cy="5" r="1.5" fill="currentColor" />
      {/* Antennae */}
      <line x1="7.2" y1="3.8" x2="5.8" y2="2" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="8.8" y1="3.8" x2="10.2" y2="2" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="5.6" cy="1.8" r="0.5" fill="currentColor" />
      <circle cx="10.4" cy="1.8" r="0.5" fill="currentColor" />
    </svg>
  );
}
