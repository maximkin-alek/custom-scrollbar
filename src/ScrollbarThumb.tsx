import React, { CSSProperties, useMemo, forwardRef } from 'react';
import styles from './AppleScrollbar.module.css';

interface ScrollbarThumbProps {
  orientation: 'vertical' | 'horizontal';
  thumbSize: number;
  thumbPosition: number;
  isDragging: boolean;
  scrollbarWidth: number;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}

const ScrollbarThumb = forwardRef<HTMLDivElement, ScrollbarThumbProps>(
  (
    { orientation, thumbSize, thumbPosition, isDragging, scrollbarWidth, onPointerDown },
    ref,
  ) => {
    // Мемоизация стилей для оптимизации
    const thumbStyle = useMemo<CSSProperties>(() => {
      const isVertical = orientation === 'vertical';

      return {
        [isVertical ? 'height' : 'width']: thumbSize,
        [isVertical ? 'width' : 'height']: scrollbarWidth,
        borderRadius: scrollbarWidth / 2,
        transform: isVertical
          ? `translateY(${thumbPosition}px)`
          : `translateX(${thumbPosition}px)`,
        transition: isDragging ? 'none' : 'transform 0.1s ease',
      };
    }, [orientation, thumbSize, thumbPosition, isDragging, scrollbarWidth]);

    const className = useMemo(
      () =>
        `${styles.appleScrollbarThumb} ${
          styles[
            `appleScrollbarThumb${orientation === 'vertical' ? 'Vertical' : 'Horizontal'}`
          ]
        }`,
      [orientation],
    );

    return (
      <div
        ref={ref}
        className={className}
        style={thumbStyle}
        onPointerDown={onPointerDown}
      />
    );
  },
);

ScrollbarThumb.displayName = 'ScrollbarThumb'; // Для отладки

export default React.memo(ScrollbarThumb);
