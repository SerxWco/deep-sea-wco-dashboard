import { cn } from "@/lib/utils";

interface BubblesAvatarProps {
  size?: "sm" | "md" | "lg";
  state?: "idle" | "thinking" | "responding";
  className?: string;
}

export const BubblesAvatar = ({ size = "md", state = "idle", className }: BubblesAvatarProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20"
  };

  const animationClasses = {
    idle: "animate-bubble-float",
    thinking: "animate-bubble-pulse",
    responding: "animate-bubble-pop"
  };

  return (
    <div className={cn("relative", sizeClasses[size], animationClasses[state], className)}>
      {/* Main bubble */}
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
        {/* Outer glow */}
        <defs>
          <radialGradient id="bubbleGlow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="hsl(192, 75%, 65%)" stopOpacity="0.8" />
            <stop offset="50%" stopColor="hsl(192, 75%, 45%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(210, 70%, 20%)" stopOpacity="0.1" />
          </radialGradient>
          
          <radialGradient id="bubbleMain" cx="40%" cy="40%">
            <stop offset="0%" stopColor="hsl(192, 75%, 55%)" stopOpacity="0.9" />
            <stop offset="50%" stopColor="hsl(192, 75%, 45%)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(210, 67%, 30%)" stopOpacity="0.3" />
          </radialGradient>

          <radialGradient id="bubbleHighlight" cx="30%" cy="30%">
            <stop offset="0%" stopColor="hsl(192, 100%, 85%)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(192, 100%, 85%)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer glow circle */}
        <circle cx="50" cy="50" r="48" fill="url(#bubbleGlow)" className="animate-bubble-ripple" />
        
        {/* Main bubble body */}
        <circle cx="50" cy="50" r="40" fill="url(#bubbleMain)" />
        
        {/* Highlight shine */}
        <circle cx="35" cy="35" r="15" fill="url(#bubbleHighlight)" />
        
        {/* Small sparkle 1 */}
        <circle cx="60" cy="45" r="2" fill="hsl(192, 100%, 90%)" opacity="0.8" className="animate-bubble-sparkle-1" />
        
        {/* Small sparkle 2 */}
        <circle cx="40" cy="60" r="1.5" fill="hsl(192, 100%, 90%)" opacity="0.7" className="animate-bubble-sparkle-2" />
        
        {/* WCO coin symbol inside */}
        <g opacity="0.4">
          <text x="50" y="55" fontSize="20" fontWeight="bold" fill="hsl(210, 20%, 98%)" textAnchor="middle">
            W
          </text>
        </g>
      </svg>

      {/* Ripple effect for responding state */}
      {state === "responding" && (
        <div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-bubble-ripple-out" />
      )}
    </div>
  );
};
