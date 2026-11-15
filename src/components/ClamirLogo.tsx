import React from 'react';

interface ClamirLogoProps {
  symbolOnly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  inverted?: boolean;
  className?: string;
}

export const ClamirSymbol: React.FC<{ sizePx?: number; inverted?: boolean; className?: string }> = ({
  sizePx = 28,
  inverted = false,
  className = '',
}) => {
  const fill = inverted ? '#FFFFFF' : '#000000';
  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Clamir AI symbol"
    >
      {/* Comet 1: Central-left prominent comet with circular head and sharp diagonal trail */}
      <path d="M35 73 L100 16 L51 87 Z" fill={fill} />
      <circle cx="38" cy="82" r="12.5" fill={fill} />

      {/* Comet 2: Lower-right secondary comet with circular head and sharp diagonal trail */}
      <path d="M62 87 L110 42 L73 97 Z" fill={fill} />
      <circle cx="65" cy="94" r="9.5" fill={fill} />

      {/* Comet 3: Upper-left comet with circular head and sharp diagonal trail */}
      <path d="M21 45 L74 8 L33 55 Z" fill={fill} />
      <circle cx="24" cy="52" r="8.5" fill={fill} />

      {/* Crisp 4-point small stars */}
      <path
        d="M52 23 L54.4 29.6 L61 32 L54.4 34.4 L52 41 L49.6 34.4 L43 32 L49.6 29.6 Z"
        fill={fill}
      />
      <path
        d="M89 67 L90.8 71.8 L95.5 73.5 L90.8 75.2 L89 80 L87.2 75.2 L82.5 73.5 L87.2 71.8 Z"
        fill={fill}
      />
      <path
        d="M19 19 L20.4 23.1 L24.5 24.5 L20.4 25.9 L19 30 L17.6 25.9 L13.5 24.5 L17.6 23.1 Z"
        fill={fill}
      />
    </svg>
  );
};

export const ClamirLogo: React.FC<ClamirLogoProps> = ({
  symbolOnly = false,
  size = 'md',
  inverted = false,
  className = '',
}) => {
  const dimensions = {
    sm: { icon: 22, text: 'text-base' },
    md: { icon: 28, text: 'text-lg' },
    lg: { icon: 34, text: 'text-xl' },
    xl: { icon: 42, text: 'text-2xl' },
  }[size];

  return (
    <span className={`inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0 ${className}`}>
      <ClamirSymbol sizePx={dimensions.icon} inverted={inverted} />
      {!symbolOnly && (
        <span
          className={`font-bold tracking-tight leading-none ${dimensions.text} ${
            inverted ? 'text-white' : 'text-[#000000]'
          }`}
        >
          Clamir AI
        </span>
      )}
    </span>
  );
};
