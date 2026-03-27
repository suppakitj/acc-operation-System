import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AtSign, Users } from 'lucide-react';

/**
 * MentionInput — text input with @ dropdown.
 * Props:
 *  - value, onChange, onKeyDown, placeholder, disabled
 *  - users: [{ email, full_name }] — internal users
 *  - lineMembers: [{ line_user_id, display_name, picture_url }] — LINE group members
 *  - chatType: 'user' | 'group'
 *  - onMentionsChange: (mentions) => void — callback with active LINE mentions
 */
export default function MentionInput({
  value, onChange, onKeyDown, placeholder, disabled,
  users = [], lineMembers = [], chatType = 'user', onMentionsChange
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuFilter, setMenuFilter] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeMentions, setActiveMentions] = useState([]);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  const isGroup = chatType === 'group';

  // Build combined list: LINE members first (for groups), then internal users
  const buildItems = () => {
    const items = [];
    if (isGroup && lineMembers.length > 0) {
      lineMembers.forEach(m => {
        items.push({
          key: `line_${m.line_user_id}`,
          display_name: m.display_name,
          subtitle: 'LINE member',
          picture_url: m.picture_url,
          isLineMember: true,
          line_user_id: m.line_user_id,
        });
      });
    }
    // Internal users
    users.forEach(u => {
      items.push({
        key: `user_${u.email}`,
        display_name: u.full_name || u.email.split('@')[0],
        subtitle: u.email,
        isLineMember: false,
      });
    });
    return items;
  };

  const allItems = buildItems();

  const matchesFilter = (item) => {
    if (!menuFilter) return true;
    const q = menuFilter.toLowerCase();
    return (item.display_name || '').toLowerCase().includes(q) ||
           (item.subtitle || '').toLowerCase().includes(q);
  };

  const filtered = allItems.filter(matchesFilter).slice(0, 10);

  // Detect @ trigger
  const handleChange = useCallback((e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(e);

    const textBeforeCursor = val.substring(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt >= 0) {
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

    // Update active mentions based on current text
    updateActiveMentions(val);
  }, [onChange, activeMentions]);

  const updateActiveMentions = useCallback((text) => {
    // Keep only mentions whose @displayName still exists in the text
    const kept = activeMentions.filter(m => text.includes(`@${m.display_name}`));
    if (kept.length !== activeMentions.length) {
      setActiveMentions(kept);
      onMentionsChange?.(kept);
    }
  }, [activeMentions, onMentionsChange]);

  const insertMention = useCallback((item) => {
    const before = value.substring(0, mentionStart);
    const after = value.substring(inputRef.current?.selectionStart || value.length);
    const displayName = item.display_name;
    const newVal = `${before}@${displayName} ${after}`;

    onChange({ target: { value: newVal } });
    setShowMenu(false);
    setMenuFilter('');

    // Track LINE member mention
    if (item.isLineMember && item.line_user_id) {
      const newMentions = [...activeMentions.filter(m => m.line_user_id !== item.line_user_id), {
        line_user_id: item.line_user_id,
        display_name: displayName,
      }];
      setActiveMentions(newMentions);
      onMentionsChange?.(newMentions);
    }

    setTimeout(() => {
      if (inputRef.current) {
        const pos = before.length + displayName.length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [value, mentionStart, onChange, activeMentions, onMentionsChange]);

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

  // Reset mentions when value is cleared
  useEffect(() => {
    if (!value) {
      setActiveMentions([]);
      onMentionsChange?.([]);
    }
  }, [value]);

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
            {filtered.map((item, idx) => (
              <button
                key={item.key}
                type="button"
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-sm text-left transition-colors ${
                  idx === selectedIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                }`}
                onMouseEnter={() => setSelectedIdx(idx)}
                onClick={() => insertMention(item)}
              >
                {item.picture_url ? (
                  <img src={item.picture_url} className="w-6 h-6 rounded-full object-cover shrink-0" alt="" />
                ) : item.isLineMember ? (
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <Users className="w-3 h-3 text-green-700" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-medium text-primary">
                    {(item.display_name)[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">
                    {item.display_name}
                    {item.isLineMember && <span className="ml-1 text-[9px] text-green-600 font-normal">LINE</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}