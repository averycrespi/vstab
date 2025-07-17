import React from 'react';
import { EditorWindow } from '@shared/types';

interface TabProps {
  window: EditorWindow;
  isActive: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const Tab: React.FC<TabProps> = ({
  window,
  isActive,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  return (
    <div
      className="tab flex items-center px-3 h-full cursor-pointer border-r transition-colors duration-150"
      style={{
        backgroundColor: isActive
          ? 'var(--color-editor-tab-active)'
          : 'var(--color-editor-tab-inactive)',
        color: isActive
          ? 'var(--color-editor-text)'
          : 'var(--color-editor-text-inactive)',
        borderColor: 'var(--color-editor-border)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor =
          'var(--color-editor-tab-active)';
        e.currentTarget.style.color = 'var(--color-editor-text)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = isActive
          ? 'var(--color-editor-tab-active)'
          : 'var(--color-editor-tab-inactive)';
        e.currentTarget.style.color = isActive
          ? 'var(--color-editor-text)'
          : 'var(--color-editor-text-inactive)';
      }}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <span className="truncate max-w-xs" style={{ fontSize: '13px' }}>
        {window.path}
      </span>
    </div>
  );
};

export default Tab;
