import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'dropdown' | 'toggle' | 'minimal';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'dropdown',
  className = '',
  showLabel = false,
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Quick cycle toggle variant
  if (variant === 'toggle' || variant === 'minimal') {
    return (
      <button
        id="theme-toggle-quick-btn"
        onClick={toggleTheme}
        className={`p-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 text-xs font-semibold ${
          isDark
            ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-slate-700/80 shadow-sm'
            : 'bg-white hover:bg-slate-100 text-indigo-600 border-slate-200 shadow-sm'
        } ${className}`}
        title={`Current: ${theme.toUpperCase()} (${resolvedTheme} active). Click to toggle theme.`}
        aria-label="Toggle light and dark theme"
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="w-4 h-4 text-amber-300" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
        {showLabel && (
          <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
            {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
          </span>
        )}
      </button>
    );
  }

  // Dropdown variant with Light, Dark, System
  const options: { mode: ThemeMode; label: string; icon: React.FC<{ className?: string }> }[] = [
    { mode: 'light', label: 'Light Mode', icon: Sun },
    { mode: 'dark', label: 'Dark Mode', icon: Moon },
    { mode: 'system', label: 'System (Auto)', icon: Laptop },
  ];

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        id="theme-mode-dropdown-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-medium ${
          isDark
            ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:text-white'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
        }`}
        title={`Theme: ${theme} (Resolved: ${resolvedTheme})`}
        aria-expanded={isOpen}
      >
        {theme === 'system' ? (
          <Laptop className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-indigo-500'}`} />
        ) : resolvedTheme === 'dark' ? (
          <Moon className="w-3.5 h-3.5 text-amber-300" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}

        {showLabel && (
          <span className="capitalize hidden sm:inline">
            {theme === 'system' ? 'System' : theme}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-44 rounded-2xl border shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ${
            isDark
              ? 'bg-slate-900 border-slate-800 shadow-black/80 text-slate-200'
              : 'bg-white border-slate-200 shadow-slate-300/50 text-slate-800'
          }`}
        >
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/50 dark:border-slate-800">
            Interface Theme
          </div>

          <div className="p-1 space-y-0.5">
            {options.map(opt => {
              const Icon = opt.icon;
              const isSelected = theme === opt.mode;

              return (
                <button
                  key={opt.mode}
                  onClick={() => {
                    setTheme(opt.mode);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-xl flex items-center justify-between transition-colors ${
                    isSelected
                      ? isDark
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                        : 'bg-indigo-50 text-indigo-600 font-semibold'
                      : isDark
                      ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${
                      opt.mode === 'light' ? 'text-amber-500' : opt.mode === 'dark' ? 'text-amber-300' : 'text-cyan-500'
                    }`} />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
