import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AtSign } from 'lucide-react';

/**
 * MentionInput — a text input that shows a user dropdown when typing @.
 * Props:
 *  - value, onChange, onKeyDown, placeholder, disabled
 *  - users: [{ email, full_name }]
 */
export default function MentionInput({ value, onChange, onKeyDown, placeholder, disabled, users = [] }) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuFilter, setMenuFilter] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  const filtered = users.filter(u => {
    if (!menuFilter) return true;
    const q = menuFilter.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  }).slice(0, 8);

  // Detect @ trigger
  const handleChange = useCallback((e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(e);

    // Find the last @ before cursor
    const textBeforeCursor = val.substring(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt >= 0) {
      // Check there's no space between @ and cursor (simple heuristic)
      const afterAt = textBeforeCursor.substring(lastAt + 1);
      if (!afterAt.includes('\n')) {
        setShowMenu(true);
        setMentionStart(lastAt);
        setMenuFilter(afterAt);
        setSelectedIdx(0);
        return;
      }
    }
    setShowMenu(false);
  }, [onChange]);

  const insertMention = useCallback((user) => {
    const before = value.substring(0, mentionStart);
    const after = value.substring(inputRef.current?.selectionStart || value.length);
    const displayName = user.full_name || user.email.split('@')[0];
    const newVal = `${before}@${displayName} ${after}`;
    // Trigger synthetic change
    onChange({ target: { value: newVal } });
    setShowMenu(false);
    setMenuFilter('');
    // Focus and set cursor after the mention
    setTimeout(() => {
      if (inputRef.current) {
        const pos = before.length + displayName.length + 2; // @name + space
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [value, mentionStart, onChange]);

  const handleKeyDown = useCallback((e) => {
    if (showMenu && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(prev => (prev + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(prev => (prev - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filtered[selectedIdx]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMenu(false);
        return;
      }
    }
    onKeyDown?.(e);
  }, [showMenu, filtered, selectedIdx, insertMention, onKeyDown]);

  // Close on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
      />
      {showMenu && filtered.length > 0 && (
        <div
          ref={menuRef}
          className="absolute bottom-full mb-1 left-0 w-full max-h-[200px] overflow-y-auto rounded-md border bg-popover shadow-md z-50"
        >
          <div className="p-1">
            <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-muted-foreground border-b mb-1">
              <AtSign className="w-3 h-3" /> Mention สมาชิก
            </div>
            {filtered.map((user, idx) => (
              <button
                key={user.email}
                type="button"
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-sm text-left transition-colors ${
                  idx === selectedIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                }`}
                onMouseEnter={() => setSelectedIdx(idx)}
                onClick={() => insertMention(user)}
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-medium text-primary">
                  {(user.full_name || user.email)[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{user.full_name || user.email.split('@')[0]}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}