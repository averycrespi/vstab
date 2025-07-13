import React, { useState, useEffect, useCallback } from 'react';
import { VSCodeWindow } from '@shared/types';
import Tab from './components/Tab';
import { useWindowVisibility } from './hooks/useWindowVisibility';
import { useTabOrder } from './hooks/useTabOrder';

function App() {
  const [windows, setWindows] = useState<VSCodeWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const { isVisible } = useWindowVisibility();
  const { orderedWindows, reorderWindows } = useTabOrder(windows);

  useEffect(() => {
    // Listen for window updates
    window.vstab.onWindowsUpdate((updatedWindows) => {
      setWindows(updatedWindows);
      
      // Set first window as active if none selected
      if (!activeWindowId && updatedWindows.length > 0) {
        setActiveWindowId(updatedWindows[0].id);
      }
    });

    // Resize VS Code windows on mount
    window.vstab.resizeWindows(35);
  }, [activeWindowId]);

  const handleTabClick = useCallback(async (windowId: string) => {
    setActiveWindowId(windowId);
    await window.vstab.focusWindow(windowId);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, windowId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', windowId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    
    if (draggedId !== targetId) {
      const newOrder = [...orderedWindows];
      const draggedIndex = newOrder.findIndex(w => w.id === draggedId);
      const targetIndex = newOrder.findIndex(w => w.id === targetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [draggedWindow] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedWindow);
        reorderWindows(newOrder.map(w => w.id));
      }
    }
  }, [orderedWindows, reorderWindows]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="h-9 flex items-center border-b" style={{ backgroundColor: 'var(--color-vscode-dark)', borderColor: 'var(--color-vscode-border)' }}>
      {orderedWindows.map((window) => (
        <Tab
          key={window.id}
          window={window}
          isActive={window.id === activeWindowId}
          onClick={() => handleTabClick(window.id)}
          onDragStart={(e) => handleDragStart(e, window.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, window.id)}
        />
      ))}
    </div>
  );
}

export default App;