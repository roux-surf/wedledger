'use client';

import { forwardRef } from 'react';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import type { DraggableAttributes } from '@dnd-kit/core/dist/hooks/useDraggable';

interface DragHandleProps {
  listeners?: DraggableSyntheticListeners;
  attributes?: DraggableAttributes;
}

const DragHandle = forwardRef<HTMLButtonElement, DragHandleProps>(
  ({ listeners, attributes }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors print:hidden touch-none"
        {...attributes}
        {...listeners}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </button>
    );
  }
);

DragHandle.displayName = 'DragHandle';

export default DragHandle;
