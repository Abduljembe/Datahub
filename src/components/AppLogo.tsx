import React from 'react';
import logoImage from '../assets/images/datahub_brand_mark_1789053298674.jpg';
import { useTheme } from '../context/ThemeContext';

interface AppLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  showSubtitle?: boolean;
  subtitleText?: string;
  className?: string;
  glowEffect?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showBadge = true,
  badgeText = 'Analytics',
  showSubtitle = false,
  subtitleText = 'Upload, Clean, Collect & Statistical Suite',
  className = '',
  glowEffect = true,
}) => {
  const { isDark } = useTheme();

  const sizeDimensions = {
    xs: { icon: 'w-6 h-6', rounded: 'rounded-lg', text: 'text-sm', badge: 'text-[8px] px-1 py-0.2', subtitle: 'text-[9px]' },
    sm: { icon: 'w-8 h-8', rounded: 'rounded-xl', text: 'text-base', badge: 'text-[9px] px-1.5 py-0.5', subtitle: 'text-[10px]' },
    md: { icon: 'w-9 h-9 sm:w-10 sm:h-10', rounded: 'rounded-xl', text: 'text-base sm:text-lg', badge: 'text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 sm:py-0.5', subtitle: 'text-[11px]' },
    lg: { icon: 'w-12 h-12 sm:w-14 sm:h-14', rounded: 'rounded-2xl', text: 'text-xl sm:text-2xl', badge: 'text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5', subtitle: 'text-xs' },
    xl: { icon: 'w-16 h-16 sm:w-20 sm:h-20', rounded: 'rounded-3xl', text: 'text-3xl sm:text-4xl', badge: 'text-xs px-3 py-1', subtitle: 'text-sm' },
  };

  const currentSize = sizeDimensions[size] || sizeDimensions.md;

  return (
    <div className={`flex items-center gap-2.5 shrink-0 ${className}`}>
      {/* Brand Icon Emblem */}
      <div 
        className={`relative ${currentSize.icon} ${currentSize.rounded} overflow-hidden border border-indigo-500/30 shrink-0 bg-slate-950 flex items-center justify-center transition-all group-hover:scale-105 group-hover:border-indigo-400 ${
          glowEffect ? 'shadow-lg shadow-indigo-600/25 ring-1 ring-cyan-400/20' : ''
        }`}
      >
        <img
          src={logoImage}
          alt="DataHub Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        {/* Subtle luminous glass gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-400/10 to-indigo-500/20 pointer-events-none" />
      </div>

      {/* Wordmark and Tagline */}
      {showWordmark && (
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight transition-colors ${currentSize.text} ${
              isDark ? 'text-white group-hover:text-indigo-300' : 'text-slate-900 group-hover:text-indigo-600'
            }`}>
              DataHub
            </span>
            {showBadge && (
              <span className={`uppercase font-bold tracking-wider rounded-full border ${currentSize.badge} ${
                isDark 
                  ? 'bg-indigo-500/15 text-cyan-300 border-indigo-500/30' 
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {badgeText}
              </span>
            )}
          </div>
          {showSubtitle && (
            <p className={`${currentSize.subtitle} ${isDark ? 'text-slate-400' : 'text-slate-500'} truncate`}>
              {subtitleText}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
