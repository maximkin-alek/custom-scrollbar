import React from 'react';

export interface ScrollbarState {
  isDragging: boolean;
  isHovered: boolean;
  thumbSize: number;
  thumbPosition: number;
  startPosition: number;
  startThumbPosition: number;
  hideTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

export type ScrollbarsState = {
  vertical: ScrollbarState;
  horizontal: ScrollbarState;
};

export type ScrollbarAction =
  | {
      type: 'SET_DRAGGING';
      orientation: 'vertical' | 'horizontal';
      value: boolean;
      startPosition?: number;
      startThumbPosition?: number;
    }
  | { type: 'SET_HOVERED'; orientation: 'vertical' | 'horizontal'; value: boolean }
  | { type: 'SET_THUMB_SIZE'; orientation: 'vertical' | 'horizontal'; value: number }
  | { type: 'SET_THUMB_POSITION'; orientation: 'vertical' | 'horizontal'; value: number };

	export interface AppleScrollbarProps {
		children: React.ReactNode;
		className?: string;
		size?: 's' | 'm';
		fadeTimeout?: number;
		isTrack?: boolean;
	}
	

	