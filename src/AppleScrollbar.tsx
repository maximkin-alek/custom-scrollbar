import React, {
  useRef,
  useEffect,
  useCallback,
  useReducer,
  useLayoutEffect,
} from 'react';
import styles from './AppleScrollbar.module.css';
import { calculateThumbMetrics } from './utils/scrollbarUtils.ts';
import { AppleScrollbarProps, ScrollbarsState } from './types.ts';
import { scrollbarsReducer } from './scrollbarReducer.ts';
import { useScrollbarVisibility } from './hooks/useScrollbarVisibility.ts';
import ScrollbarTrack from './components/ScrollbarTrack.tsx';
import { useScrollbarDrag } from './hooks/useScrollbarDrag.ts';

const WIDTHS = {
  s: 4,
  m: 8,
};

const AppleScrollbar: React.FC<AppleScrollbarProps> = ({
  children,
  className = '',
  size = 's',
  fadeTimeout = 1000,
  isTrack = true,
}) => {
  const scrollbarWidth = WIDTHS[size];

  const initialState: ScrollbarsState = {
    vertical: {
      isDragging: false,
      isHovered: false,
      thumbSize: 0,
      thumbPosition: 0,
      startPosition: 0,
      startThumbPosition: 0,
      hideTimeoutRef: useRef<NodeJS.Timeout | null>(null),
    },
    horizontal: {
      isDragging: false,
      isHovered: false,
      thumbSize: 0,
      thumbPosition: 0,
      startPosition: 0,
      startThumbPosition: 0,
      hideTimeoutRef: useRef<NodeJS.Timeout | null>(null),
    },
  };

  const [scrollbars, dispatch] = useReducer(scrollbarsReducer, initialState);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const verticalThumbRef = useRef<HTMLDivElement>(null);
  const horizontalThumbRef = useRef<HTMLDivElement>(null);

  const animationFrameRef = useRef<number | null>(null);
  const isUpdatingFromDragRef = useRef(false);
  const lastDragUpdateRef = useRef({ vertical: 0, horizontal: 0 });

  const stateRef = useRef({
    verticalHovered: scrollbars.vertical.isHovered,
    horizontalHovered: scrollbars.horizontal.isHovered,
    verticalDragging: scrollbars.vertical.isDragging,
    horizontalDragging: scrollbars.horizontal.isDragging,
  });

  useEffect(() => {
    stateRef.current = {
      verticalHovered: scrollbars.vertical.isHovered,
      horizontalHovered: scrollbars.horizontal.isHovered,
      verticalDragging: scrollbars.vertical.isDragging,
      horizontalDragging: scrollbars.horizontal.isDragging,
    };
  }, [
    scrollbars.vertical.isHovered,
    scrollbars.horizontal.isHovered,
    scrollbars.vertical.isDragging,
    scrollbars.horizontal.isDragging,
  ]);

  const visibility = useScrollbarVisibility(fadeTimeout, () => stateRef.current);

  const calculateThumbSizes = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const container = containerRef.current;
    const content = contentRef.current;

    const verticalThumbSize = calculateThumbMetrics(
      container.clientHeight,
      scrollbarWidth,
      content.scrollHeight,
      container.clientHeight,
      content.scrollTop,
    ).thumbSize;

    const horizontalThumbSize = calculateThumbMetrics(
      container.clientWidth,
      scrollbarWidth,
      content.scrollWidth,
      container.clientWidth,
      content.scrollLeft,
    ).thumbSize;

    dispatch({
      type: 'SET_THUMB_SIZE',
      orientation: 'vertical',
      value: verticalThumbSize,
    });
    dispatch({
      type: 'SET_THUMB_SIZE',
      orientation: 'horizontal',
      value: horizontalThumbSize,
    });
  }, [scrollbarWidth]);

  const updateThumbPositions = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const container = containerRef.current;
    const content = contentRef.current;

    if (isUpdatingFromDragRef.current) return;

    const verticalResult = calculateThumbMetrics(
      container.clientHeight,
      scrollbarWidth,
      content.scrollHeight,
      container.clientHeight,
      content.scrollTop,
    );

    const horizontalResult = calculateThumbMetrics(
      container.clientWidth,
      scrollbarWidth,
      content.scrollWidth,
      container.clientWidth,
      content.scrollLeft,
    );

    dispatch({
      type: 'SET_THUMB_POSITION',
      orientation: 'vertical',
      value: verticalResult.thumbPosition,
    });
    dispatch({
      type: 'SET_THUMB_POSITION',
      orientation: 'horizontal',
      value: horizontalResult.thumbPosition,
    });
  }, [scrollbarWidth]);

  const handleScroll = useCallback(() => {
    if (stateRef.current.verticalDragging || stateRef.current.horizontalDragging) {
      return;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      updateThumbPositions();
      visibility.showScrollbar();
    });
  }, [updateThumbPositions, visibility]);

  // Используем кастомный хук для перетаскивания
  const verticalDrag = useScrollbarDrag({
    orientation: 'vertical',
    scrollbar: scrollbars.vertical,
    scrollbarWidth,
    containerRef,
    contentRef,
    dispatch,
    visibility,
    lastDragUpdateRef,
    isUpdatingFromDragRef,
    thumbRef: verticalThumbRef,
  });

  const horizontalDrag = useScrollbarDrag({
    orientation: 'horizontal',
    scrollbar: scrollbars.horizontal,
    scrollbarWidth,
    containerRef,
    contentRef,
    dispatch,
    visibility,
    lastDragUpdateRef,
    isUpdatingFromDragRef,
    thumbRef: horizontalThumbRef,
  });

  useLayoutEffect(() => {
    calculateThumbSizes();
    const ro = new ResizeObserver(() => {
      calculateThumbSizes();
      updateThumbPositions();
    });

    if (containerRef.current) ro.observe(containerRef.current);
    if (contentRef.current) ro.observe(contentRef.current);

    if (contentRef.current) {
      Array.from(contentRef.current.children).forEach((child) => {
        ro.observe(child);
      });
    }

    return () => ro.disconnect();
  }, [calculateThumbSizes, updateThumbPositions]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    content.addEventListener('scroll', handleScroll);
    return () => {
      content.removeEventListener('scroll', handleScroll);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleScroll]);

  useEffect(() => {
    const handleDocLeave = (e: MouseEvent) => {
      if (
        e.clientY <= 0 ||
        e.clientX <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        visibility.clearHideTimeout();
        visibility.scheduleHide();
      }
    };

    document.addEventListener('mouseleave', handleDocLeave);
    return () => document.removeEventListener('mouseleave', handleDocLeave);
  }, [visibility]);

  return (
    <div ref={containerRef} className={`${styles.appleScrollContainer} ${className}`}>
      <div ref={contentRef} className={styles.appleScrollContent}>
        {children}
      </div>

      {scrollbars.vertical.thumbSize > 0 && (
        <ScrollbarTrack
          orientation="vertical"
          scrollbarWidth={scrollbarWidth}
          isTrack={isTrack}
          thumbSize={scrollbars.vertical.thumbSize}
          thumbPosition={scrollbars.vertical.thumbPosition}
          isDragging={scrollbars.vertical.isDragging}
          onPointerDown={verticalDrag.handlePointerDown}
          onMouseEnter={() => {
            dispatch({ type: 'SET_HOVERED', value: true, orientation: 'vertical' });
            visibility.forceShow();
          }}
          onMouseLeave={() => {
            dispatch({ type: 'SET_HOVERED', value: false, orientation: 'vertical' });
            visibility.scheduleHide();
          }}
          visibility={visibility}
          thumbRef={verticalThumbRef}
        />
      )}

      {scrollbars.horizontal.thumbSize > 0 && (
        <ScrollbarTrack
          orientation="horizontal"
          scrollbarWidth={scrollbarWidth}
          isTrack={isTrack}
          thumbSize={scrollbars.horizontal.thumbSize}
          thumbPosition={scrollbars.horizontal.thumbPosition}
          isDragging={scrollbars.horizontal.isDragging}
          onPointerDown={horizontalDrag.handlePointerDown}
          onMouseEnter={() => {
            dispatch({ type: 'SET_HOVERED', value: true, orientation: 'horizontal' });
            visibility.forceShow();
          }}
          onMouseLeave={() => {
            dispatch({ type: 'SET_HOVERED', value: false, orientation: 'horizontal' });
            visibility.scheduleHide();
          }}
          visibility={visibility}
          thumbRef={horizontalThumbRef}
        />
      )}
    </div>
  );
};

export default AppleScrollbar;
