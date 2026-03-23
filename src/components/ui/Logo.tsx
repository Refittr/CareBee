import { BeeIcon } from "./BeeIcon";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { bee: 20, text: "text-lg" },
  md: { bee: 30, text: "text-2xl" },
  lg: { bee: 48, text: "text-4xl" },
};

export function Logo({ size = "md" }: LogoProps) {
  const { bee, text } = sizes[size];
  return (
    <span className="flex items-center gap-2">
      <BeeIcon size={bee} className="text-honey-400 shrink-0" />
      <span className={`font-display font-extrabold tracking-tight leading-none ${text}`}>
        <span className="text-warmstone-900">Care</span><span className="text-honey-400">Bee</span>
      </span>
    </span>
  );
}
