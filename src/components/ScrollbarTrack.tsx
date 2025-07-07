import React, { CSSProperties, useMemo } from 'react';
import styles from '../AppleScrollbar.module.css';
import ScrollbarThumb from './ScrollbarThumb.tsx';

interface ScrollbarTrackProps {
  orientation: 'vertical' | 'horizontal';
  scrollbarWidth: number;
  isTrack: boolean;
  thumbSize: number;
  thumbPosition: number;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  visibility: {
    isScrollbarVisible: boolean;
  };
  thumbRef: React.RefObject<HTMLDivElement>;
}

const ScrollbarTrack: React.FC<ScrollbarTrackProps> = ({
  orientation,
  scrollbarWidth,
  isTrack,
  thumbSize,
  thumbPosition,
  isDragging,
  onPointerDown,
  onMouseEnter,
  onMouseLeave,
  visibility,
  thumbRef,
}) => {
  const isVertical = orientation === 'vertical';

  const trackStyle = useMemo<CSSProperties>(() => {
    const baseStyle: CSSProperties = {
      opacity: visibility.isScrollbarVisible ? 1 : 0,
      pointerEvents: visibility.isScrollbarVisible ? 'auto' : 'none',
      backgroundColor: isTrack ? 'var(--scrollbar-color)' : 'transparent',
    };

    if (isVertical) {
      return {
        ...baseStyle,
        width: scrollbarWidth,
        bottom: scrollbarWidth + 10,
      };
    } else {
      return {
        ...baseStyle,
        height: scrollbarWidth,
        right: scrollbarWidth + 10,
      };
    }
  }, [isVertical, scrollbarWidth, isTrack, visibility.isScrollbarVisible]);

  const className = useMemo(
    () =>
      `${styles.appleScrollbarTrack} ${
        isVertical
          ? styles.appleScrollbarTrackVertical
          : styles.appleScrollbarTrackHorizontal
      }`,
    [isVertical],
  );

  return (
    <div
      className={className}
      style={trackStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <ScrollbarThumb
        ref={thumbRef}
        orientation={orientation}
        thumbSize={thumbSize}
        thumbPosition={thumbPosition}
        isDragging={isDragging}
        scrollbarWidth={scrollbarWidth}
        onPointerDown={onPointerDown}
      />
    </div>
  );
};

export default React.memo(ScrollbarTrack);
