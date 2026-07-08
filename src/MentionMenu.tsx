import React, { useEffect, useRef } from 'react';
import { MentionableItem } from './types';

interface MentionMenuProps {
  items: MentionableItem[];
  selectedIndex: number;
  onSelect: (item: MentionableItem) => void;
  onHover: (index: number) => void;
  targetRect: DOMRect | null;
}

export const MentionMenu: React.FC<MentionMenuProps> = ({
  items,
  selectedIndex,
  onSelect,
  onHover,
  targetRect,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Reposition menu whenever the cursor moves
  useEffect(() => {
    if (!targetRect || !menuRef.current) return;

    const menu = menuRef.current;
    menu.style.top = `${targetRect.top + window.scrollY + targetRect.height + 8}px`;
    menu.style.left = `${targetRect.left + window.scrollX}px`;
  }, [targetRect]);

  if (!targetRect || items.length === 0) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        zIndex: 9999,
        background: '#2f3136', // Discord dark theme
        border: '1px solid #202225',
        borderRadius: '8px',
        width: '300px',
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '8px 0',
        boxShadow: '0 8px 16px rgba(0,0,0,0.24)',
        pointerEvents: 'auto',
      }}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          onClick={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
          onMouseDown={(e) => e.preventDefault()} // Prevent editor blur
          onMouseEnter={() => onHover(index)}
          style={{
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            backgroundColor: index === selectedIndex ? '#393c43' : 'transparent',
            color: '#dcddde',
          }}
        >
          {/* Simple avatar circle */}
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: item.avatarColor || '#5865f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {item.label.charAt(0).toUpperCase()}
          </div>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};
