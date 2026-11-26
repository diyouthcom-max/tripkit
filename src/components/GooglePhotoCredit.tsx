import React from 'react';

export interface GooglePhotoCreditProps {
  displayName: string;
  uri?: string;
  variant?: 'overlay' | 'inline';
}

/**
 * Required Google Place Photo photographer attribution.
 * Visible text is a fixed "© {displayName}" (no i18n).
 */
export const GooglePhotoCredit: React.FC<GooglePhotoCreditProps> = ({
  displayName,
  uri,
  variant = 'inline',
}) => {
  const label = `© ${displayName}`;
  const className =
    variant === 'overlay'
      ? "[font-family:'Inter_Variable',Inter,system-ui,'PingFang_SC',sans-serif] [--font-serif:'Playfair_Display',Georgia,'Songti_SC',serif] absolute bottom-0 left-0 right-0 bg-black/45 px-1 py-0.5 text-[12px] leading-tight text-white/90 break-words line-clamp-2"
      : "[font-family:'Inter_Variable',Inter,system-ui,'PingFang_SC',sans-serif] [--font-serif:'Playfair_Display',Georgia,'Songti_SC',serif] block max-w-full break-words text-[12px] leading-snug tk-text-ink2";

  const stopBubble: React.MouseEventHandler = (e) => {
    e.stopPropagation();
  };

  if (uri) {
    return (
      <a
        href={uri}
        target="_blank"
        rel="noopener noreferrer"
        title={label}
        className={className}
        onClick={stopBubble}
      >
        {label}
      </a>
    );
  }

  return (
    <span title={label} className={className} onClick={stopBubble}>
      {label}
    </span>
  );
};
