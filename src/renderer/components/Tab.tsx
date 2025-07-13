import React from 'react';
import { VSCodeWindow } from '@shared/types';

interface TabProps {
  window: VSCodeWindow;
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
  onDrop
}) => {
  return (
    <div
      className="tab flex items-center px-3 h-full cursor-pointer border-r transition-colors duration-150"
      style={{
        backgroundColor: isActive ? 'var(--color-vscode-tab-active)' : 'var(--color-vscode-tab-inactive)',
        color: isActive ? 'var(--color-vscode-text)' : 'var(--color-vscode-text-inactive)',
        borderColor: 'var(--color-vscode-border)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-vscode-tab-active)';
        e.currentTarget.style.color = 'var(--color-vscode-text)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isActive ? 'var(--color-vscode-tab-active)' : 'var(--color-vscode-tab-inactive)';
        e.currentTarget.style.color = isActive ? 'var(--color-vscode-text)' : 'var(--color-vscode-text-inactive)';
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