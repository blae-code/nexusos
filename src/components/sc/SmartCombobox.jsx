import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, History, Search, Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { normalizeReferenceToken, normalizeReferenceValue } from '@/core/data/sc-reference-registry';

const THEME_MAP = {
  tactical: { accent: '#C0392B', glow: 'rgba(192,57,43,0.18)', text: '#F2E9E1' },
  industrial: { accent: '#C8A84B', glow: 'rgba(200,168,75,0.18)', text: '#F1E7C2' },
  vehicle: { accent: '#7AAECC', glow: 'rgba(122,174,204,0.18)', text: '#DBEEF8' },
  faction: { accent: '#9DA1CD', glow: 'rgba(157,161,205,0.18)', text: '#ECEEFE' },
};

function readRecents(storageKey) {
  if (!storageKey || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecent(storageKey, value) {
  if (!storageKey || typeof window === 'undefined') return;
  try {
    const current = readRecents(storageKey).filter((item) => item !== value);
    window.localStorage.setItem(storageKey, JSON.stringify([value, ...current].slice(0, 8)));
  } catch {
    // ignore localStorage failures
  }
}

function groupedOptions(options) {
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

export default function SmartCombobox({
  value,
  onChange,
  options = [],
  placeholder = 'Search and select',
  searchPlaceholder = 'Search',
  emptyMessage = 'No results found.',
  theme = 'industrial',
  storageKey = '',
  allowCustom = false,
  disabled = false,
  helperText = '',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const palette = THEME_MAP[theme] || THEME_MAP.industrial;

  const selectedOption = useMemo(
    () => options.find((option) => normalizeReferenceToken(option?.value) === normalizeReferenceToken(value)),
    [options, value],
  );

  const recents = useMemo(() => {
    const recentValues = readRecents(storageKey);
    return recentValues
      .map((recentValue) => options.find((option) => normalizeReferenceToken(option?.value) === normalizeReferenceToken(recentValue)))
      .filter(Boolean)
      .slice(0, 4);
  }, [storageKey, options, open]);

  const groups = useMemo(() => groupedOptions(options), [options]);
  const customCandidate = normalizeReferenceValue(query);
  const allowCustomValue = allowCustom && customCandidate
    && !options.some((option) => normalizeReferenceToken(option.value) === normalizeReferenceToken(customCandidate));

  const handleSelect = (nextValue, option = null) => {
    onChange?.(nextValue, option);
    writeRecent(storageKey, nextValue);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setQuery(''); }}>
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
            background: `linear-gradient(135deg, ${open ? palette.glow : 'rgba(255,255,255,0.03)'} 0%, #0D0C0B 72%)`,
            color: palette.text,
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            textAlign: 'left',
            boxShadow: open ? `0 0 0 1px ${palette.glow}` : 'none',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={tokenStyle(palette.accent, Boolean(selectedOption))}>
                {selectedOption?.meta?.token || 'SC'}
              </span>
              <span style={{ color: selectedOption ? palette.text : '#9A9488', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedOption?.label || value || placeholder}
              </span>
            </div>
            <div style={{ marginTop: 4, fontSize: 10, color: selectedOption ? '#9A9488' : '#6F6B64', lineHeight: 1.5 }}>
              {selectedOption?.deprecated
                ? `Legacy value${selectedOption.replacement ? ` · suggested: ${selectedOption.replacement}` : ''}`
                : selectedOption?.meta?.subtitle || helperText || 'Searchable smart reference field'}
            </div>
          </div>
          <ChevronDown size={14} style={{ color: open ? palette.accent : '#5A5850', flexShrink: 0 }} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        style={{
          width: 'min(460px, calc(100vw - 32px))',
          padding: 0,
          borderRadius: 4,
          border: `0.5px solid ${palette.accent}44`,
          background: 'linear-gradient(180deg, rgba(11,11,10,0.98) 0%, rgba(7,7,6,0.98) 100%)',
          boxShadow: `0 24px 54px ${palette.glow}`,
          overflow: 'hidden',
        }}
      >
        <Command
          style={{
            background: 'transparent',
            color: '#E8E4DC',
          }}
        >
          <div style={{ padding: '10px 12px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={12} style={{ color: palette.accent }} />
                <span style={{ color: palette.text, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Smart Combobox</span>
              </div>
              <span style={{ color: '#7E796F', fontSize: 9 }}>{options.length} indexed</span>
            </div>
          </div>

          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
            style={{
              borderColor: 'rgba(200,170,100,0.08)',
              background: 'rgba(255,255,255,0.02)',
              color: '#E8E4DC',
            }}
          />

          {recents.length > 0 ? (
            <div style={{ padding: '8px 12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8E897F', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
                <History size={11} />
                Recent
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 8 }}>
                {recents.map((option) => (
                  <button
                    key={`recent-${option.value}`}
                    type="button"
                    onClick={() => handleSelect(option.value, option)}
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
              <CommandSeparator />
            </div>
          ) : null}

          <CommandList style={{ maxHeight: 360 }}>
            <CommandEmpty style={{ color: '#8E897F', fontSize: 11 }}>
              <div style={{ display: 'grid', justifyItems: 'center', gap: 8, padding: '16px 8px' }}>
                <Search size={14} style={{ color: palette.accent }} />
                <span>{emptyMessage}</span>
                {allowCustom ? <span style={{ fontSize: 10, color: '#6F6B64' }}>Type a new value to mint a custom option.</span> : null}
              </div>
            </CommandEmpty>

            {allowCustomValue ? (
              <CommandGroup heading="Custom">
                <CommandItem
                  value={`custom-${customCandidate}`}
                  keywords={[customCandidate]}
                  onSelect={() => handleSelect(customCandidate)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 3,
                    margin: '4px 6px',
                    background: `${palette.glow}`,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={tokenStyle(palette.accent, true)}>NEW</span>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>Use "{customCandidate}"</span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 10, color: '#9A9488' }}>Preserves custom org language without blocking patch-aware suggestions.</div>
                  </div>
                </CommandItem>
              </CommandGroup>
            ) : null}

            {Object.entries(groups).map(([group, groupOptions]) => (
              <CommandGroup key={group} heading={group}>
                {groupOptions.map((option) => {
                  const active = normalizeReferenceToken(option.value) === normalizeReferenceToken(value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      keywords={option.searchTokens || []}
                      onSelect={() => handleSelect(option.value, option)}
                      style={{
                        margin: '4px 6px',
                        padding: '10px 12px',
                        borderRadius: 3,
                        border: `0.5px solid ${active ? palette.accent : 'rgba(200,170,100,0.08)'}`,
                        background: active ? `${palette.glow}` : 'rgba(255,255,255,0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={tokenStyle(palette.accent, active)}>
                            {option?.meta?.token || 'SC'}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#E8E4DC' }}>{option.label}</span>
                          {option.deprecated ? (
                            <span style={{ padding: '1px 6px', borderRadius: 999, background: 'rgba(224,72,72,0.12)', color: '#E04848', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                              Deprecated
                            </span>
                          ) : null}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 10, color: '#8E897F', lineHeight: 1.5 }}>
                          {option.deprecated
                            ? option.replacement ? `Suggested replacement: ${option.replacement}` : 'Historical value preserved for edit safety.'
                            : option?.meta?.subtitle || option?.meta?.detail || option?.meta?.kind || 'Reference option'}
                        </div>
                      </div>
                      {active ? <Check size={14} style={{ color: palette.accent, flexShrink: 0 }} /> : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
