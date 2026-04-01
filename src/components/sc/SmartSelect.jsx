import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, History, Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { normalizeReferenceToken } from '@/core/data/sc-reference-registry';

const THEME_MAP = {
  tactical: {
    accent: '#C0392B',
    glow: 'rgba(192,57,43,0.18)',
    text: '#F2E9E1',
  },
  industrial: {
    accent: '#C8A84B',
    glow: 'rgba(200,168,75,0.18)',
    text: '#F1E7C2',
  },
  vehicle: {
    accent: '#7AAECC',
    glow: 'rgba(122,174,204,0.18)',
    text: '#DBEEF8',
  },
  faction: {
    accent: '#9DA1CD',
    glow: 'rgba(157,161,205,0.18)',
    text: '#ECEEFE',
  },
};

function readRecents(storageKey) {
  if (!storageKey || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    return Array.isArray(JSON.parse(raw || '[]')) ? JSON.parse(raw || '[]') : [];
  } catch {
    return [];
  }
}

function writeRecent(storageKey, value) {
  if (!storageKey || typeof window === 'undefined') return;
  try {
    const current = readRecents(storageKey).filter((item) => item !== value);
    window.localStorage.setItem(storageKey, JSON.stringify([value, ...current].slice(0, 6)));
  } catch {
    // ignore localStorage failures
  }
}

function groupOptions(options) {
  return options.reduce((accumulator, option) => {
    const group = option.group || 'Options';
    if (!accumulator[group]) accumulator[group] = [];
    accumulator[group].push(option);
    return accumulator;
  }, /** @type {Record<string, any[]>} */ ({}));
}

function tokenStyle(accent, active) {
  return {
    minWidth: 24,
    padding: '2px 6px',
    borderRadius: 999,
    border: `0.5px solid ${active ? accent : 'rgba(200,170,100,0.12)'}`,
    background: active ? `${accent}22` : 'rgba(255,255,255,0.03)',
    color: active ? accent : '#9A9488',
    fontSize: 9,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    textAlign: 'center',
  };
}

export default function SmartSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select',
  theme = 'tactical',
  storageKey = '',
  disabled = false,
  helperText = '',
}) {
  const [open, setOpen] = useState(false);
  const palette = THEME_MAP[theme] || THEME_MAP.tactical;

  const selectedOption = useMemo(
    () => options.find((option) => normalizeReferenceToken(option?.value) === normalizeReferenceToken(value)),
    [options, value],
  );

  const recentOptions = useMemo(() => {
    const recentValues = readRecents(storageKey);
    return recentValues
      .map((recentValue) => options.find((option) => normalizeReferenceToken(option?.value) === normalizeReferenceToken(recentValue)))
      .filter(Boolean)
      .slice(0, 3);
  }, [options, storageKey, open]);

  const grouped = useMemo(() => groupOptions(options), [options]);

  const handleSelect = (option) => {
    onChange?.(option.value, option);
    writeRecent(storageKey, option.value);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          style={{
            width: '100%',
            minHeight: 48,
            padding: '10px 12px',
            borderRadius: 3,
            border: `0.5px solid ${open ? palette.accent : 'rgba(200,170,100,0.14)'}`,
            background: `linear-gradient(135deg, ${open ? palette.glow : 'rgba(255,255,255,0.03)'} 0%, #0E0D0C 70%)`,
            color: palette.text,
            textAlign: 'left',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            boxShadow: open ? `0 0 0 1px ${palette.glow}` : 'none',
            transition: 'border-color 160ms ease, box-shadow 160ms ease',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={tokenStyle(palette.accent, Boolean(selectedOption))}>
                {selectedOption?.meta?.token || 'SC'}
              </span>
              <span style={{ color: selectedOption ? palette.text : '#9A9488', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedOption?.label || placeholder}
              </span>
            </div>
            <div style={{ marginTop: 4, fontSize: 10, color: selectedOption ? '#9A9488' : '#6F6B64', lineHeight: 1.5 }}>
              {selectedOption?.deprecated
                ? `Legacy value${selectedOption.replacement ? ` · suggested: ${selectedOption.replacement}` : ''}`
                : selectedOption?.meta?.subtitle || helperText || 'Patch-aware reference selector'}
            </div>
          </div>
          <ChevronDown size={14} style={{ color: open ? palette.accent : '#5A5850', flexShrink: 0 }} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        style={{
          width: 'min(420px, calc(100vw - 32px))',
          padding: 12,
          borderRadius: 4,
          border: `0.5px solid ${palette.accent}44`,
          background: 'linear-gradient(180deg, rgba(12,11,10,0.98) 0%, rgba(7,7,6,0.98) 100%)',
          boxShadow: `0 20px 48px ${palette.glow}`,
        }}
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={12} style={{ color: palette.accent }} />
              <span style={{ color: palette.text, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Smart Select</span>
            </div>
            <span style={{ color: '#7E796F', fontSize: 9 }}>{options.length} options</span>
          </div>

          {recentOptions.length > 0 ? (
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8E897F', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                <History size={11} />
                Recent
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {recentOptions.map((option) => (
                  <button
                    key={`recent-${option.value}`}
                    type="button"
                    onClick={() => handleSelect(option)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      border: `0.5px solid ${palette.accent}33`,
                      background: 'rgba(255,255,255,0.03)',
                      color: '#DAD3C8',
                      cursor: 'pointer',
                      fontSize: 10,
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ display: 'grid', gap: 8, maxHeight: 340, overflowY: 'auto', paddingRight: 2 }}>
            {Object.entries(grouped).map(([group, groupOptions]) => (
              <div key={group} style={{ display: 'grid', gap: 4 }}>
                <div style={{ color: '#7E796F', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{group}</div>
                {groupOptions.map((option) => {
                  const active = normalizeReferenceToken(option.value) === normalizeReferenceToken(value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 3,
                        border: `0.5px solid ${active ? palette.accent : 'rgba(200,170,100,0.08)'}`,
                        background: active ? `${palette.glow}` : 'rgba(255,255,255,0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={tokenStyle(palette.accent, active)}>
                            {option?.meta?.token || 'SC'}
                          </span>
                          <span style={{ color: '#E8E4DC', fontSize: 11, fontWeight: 600 }}>{option.label}</span>
                          {option.deprecated ? (
                            <span style={{ padding: '1px 6px', borderRadius: 999, background: 'rgba(224,72,72,0.12)', color: '#E04848', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                              Deprecated
                            </span>
                          ) : null}
                        </div>
                        <div style={{ marginTop: 4, color: '#8E897F', fontSize: 10, lineHeight: 1.5 }}>
                          {option.deprecated
                            ? option.replacement ? `Suggested replacement: ${option.replacement}` : 'Historical value preserved for edit safety.'
                            : option?.meta?.subtitle || option?.meta?.detail || option?.meta?.kind || 'Reference option'}
                        </div>
                      </div>
                      {active ? <Check size={14} style={{ color: palette.accent, flexShrink: 0 }} /> : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
