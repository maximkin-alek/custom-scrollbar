import React, { useRef, useEffect, useCallback, useReducer } from 'react';
import styles from './AppleScrollbar.module.css';
import {
  calculateThumbMetrics,
  calculateScrollFromDrag,
} from './utils/scrollbarUtils.ts';
import { AppleScrollbarProps, ScrollbarsState } from './types.ts';
import { scrollbarsReducer } from './scrollbarReducer.ts';
import { useScrollbarVisibility } from './hooks/useScrollbarVisibility.ts';
import ScrollbarThumb from './ScrollbarThumb.tsx';

const WIDTHS = {
  s: 4,
  m: 8,
};

const TRACK_PADDING = 10;

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

  // Рефы для управления анимацией и блокировками
  const animationFrameRef = useRef<number | null>(null);
  const isUpdatingFromDragRef = useRef(false);
  const lastDragUpdateRef = useRef({ vertical: 0, horizontal: 0 });

  // Общее состояние для синхронизации
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

    // Вертикальный расчет
    const verticalThumbSize = calculateThumbMetrics(
      container.clientHeight,
      scrollbarWidth,
      content.scrollHeight,
      container.clientHeight,
      content.scrollTop,
    ).thumbSize;

    // Горизонтальный расчет
    const horizontalThumbSize = calculateThumbMetrics(
      container.clientWidth,
      scrollbarWidth,
      content.scrollWidth,
      container.clientWidth,
      content.scrollLeft,
    ).thumbSize;

    // Обновление размеров
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

  // функция позиций
  const updateThumbPositions = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const container = containerRef.current;
    const content = contentRef.current;

    if (isUpdatingFromDragRef.current) return;

    // Вертикальные расчеты
    const verticalResult = calculateThumbMetrics(
      container.clientHeight,
      scrollbarWidth,
      content.scrollHeight,
      container.clientHeight,
      content.scrollTop,
    );

    // Горизонтальные расчеты
    const horizontalResult = calculateThumbMetrics(
      container.clientWidth,
      scrollbarWidth,
      content.scrollWidth,
      container.clientWidth,
      content.scrollLeft,
    );

    // Обновление позиций
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

  // обработчик перетаскивания
  const handlePointerMove = useCallback(
    (e: PointerEvent, orientation: 'vertical' | 'horizontal') => {
      const isVertical = orientation === 'vertical';
      const scrollbar = isVertical ? scrollbars.vertical : scrollbars.horizontal;

      if (!scrollbar.isDragging || !containerRef.current || !contentRef.current) return;

      const container = containerRef.current;
      const content = contentRef.current;
      const positionProp = isVertical ? 'clientY' : 'clientX';
      const scrollProp = isVertical ? 'scrollTop' : 'scrollLeft';
      const sizeProp = isVertical ? 'scrollHeight' : 'scrollWidth';
      const clientProp = isVertical ? 'clientHeight' : 'clientWidth';

      const trackSize = container[clientProp] - (scrollbarWidth + TRACK_PADDING);
      const maxScroll = Math.max(0, content[sizeProp] - content[clientProp]);

      const delta = e[positionProp] - scrollbar.startPosition;
      const newScrollPos = calculateScrollFromDrag(
        delta,
        scrollbar.startThumbPosition,
        trackSize,
        scrollbar.thumbSize,
        maxScroll,
      );

      // Устанавливаем флаг, что обновление идет от перетаскивания
      isUpdatingFromDragRef.current = true;
      content[scrollProp] = newScrollPos;

      // Прямое обновление позиции ползунка
      const availableSpace = trackSize - scrollbar.thumbSize;
      const thumbPosition =
        maxScroll > 0 ? (newScrollPos / maxScroll) * availableSpace : 0;

      updateThumbPositionDirectly(orientation, thumbPosition);

      setTimeout(() => {
        isUpdatingFromDragRef.current = false;
      }, 0);
    },
    [scrollbars.vertical, scrollbars.horizontal, scrollbarWidth],
  );

  // Оптимизированный обработчик скролла
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

  // Прямое обновление позиции ползунка без setState
  const updateThumbPositionDirectly = (
    orientation: 'vertical' | 'horizontal',
    position: number,
  ) => {
    const thumbRef =
      orientation === 'vertical' ? verticalThumbRef.current : horizontalThumbRef.current;

    if (!thumbRef) return;

    if (orientation === 'vertical') {
      thumbRef.style.transform = `translateY(${position}px)`;
      lastDragUpdateRef.current.vertical = position;
    } else {
      thumbRef.style.transform = `translateX(${position}px)`;
      lastDragUpdateRef.current.horizontal = position;
    }
  };

  // Обработчик событий pointer down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, orientation: 'vertical' | 'horizontal') => {
      if (!containerRef.current || !contentRef.current) return;
      e.preventDefault();

      const position = orientation === 'vertical' ? e.clientY : e.clientX;
      const thumbPosition =
        orientation === 'vertical'
          ? scrollbars.vertical.thumbPosition
          : scrollbars.horizontal.thumbPosition;

      dispatch({
        type: 'SET_DRAGGING',
        value: true,
        orientation,
        startPosition: position,
        startThumbPosition: thumbPosition,
      });

      visibility.showScrollbar();
      document.body.style.userSelect = 'none';
    },
    [scrollbars.horizontal.thumbPosition, scrollbars.vertical.thumbPosition, visibility],
  );

  // Фабрика обработчиков для создания специфичных обработчиков
  const createPointerDownHandler = useCallback(
    (orientation: 'vertical' | 'horizontal') => {
      return (e: React.PointerEvent<HTMLDivElement>) => {
        handlePointerDown(e, orientation);
      };
    },
    [handlePointerDown],
  );

  const stopDragging = useCallback(
    (orientation: 'vertical' | 'horizontal') => {
      dispatch({
        type: 'SET_DRAGGING',
        value: false,
        orientation,
      });

      dispatch({
        type: 'SET_THUMB_POSITION',
        value: lastDragUpdateRef.current[orientation],
        orientation,
      });

      document.body.style.userSelect = '';
      visibility.scheduleHide();
    },
    [visibility],
  );

  // Эффекты
  useEffect(() => {
    calculateThumbSizes();
    const ro = new ResizeObserver(() => {
      calculateThumbSizes();
      updateThumbPositions();
    });

    if (containerRef.current) ro.observe(containerRef.current);
    if (contentRef.current) ro.observe(contentRef.current);

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

  // Обработчик перемещения указателя
  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (scrollbars.vertical.isDragging) handlePointerMove(e, 'vertical');
      if (scrollbars.horizontal.isDragging) handlePointerMove(e, 'horizontal');
    };

    const handleUp = () => {
      if (scrollbars.vertical.isDragging) stopDragging('vertical');
      if (scrollbars.horizontal.isDragging) stopDragging('horizontal');
    };

    if (scrollbars.vertical.isDragging || scrollbars.horizontal.isDragging) {
      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
      document.addEventListener('pointercancel', handleUp);
    }

    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
    };
  }, [
    scrollbars.vertical.isDragging,
    scrollbars.horizontal.isDragging,
    handlePointerMove,
    stopDragging,
  ]);

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

      {/* Вертикальный Scrollbar */}
      {scrollbars.vertical.thumbSize > 0 && (
        <div
          className={styles.appleScrollbarTrackVertical}
          style={{
            width: scrollbarWidth,
            opacity: visibility.isScrollbarVisible ? 1 : 0,
            pointerEvents: visibility.isScrollbarVisible ? 'auto' : 'none',
            bottom: scrollbarWidth + TRACK_PADDING,
            backgroundColor: isTrack ? 'var(--scrollbar-color)' : 'transparent',
          }}
          onMouseEnter={() => {
            dispatch({ type: 'SET_HOVERED', value: true, orientation: 'vertical' });
            visibility.forceShow();
          }}
          onMouseLeave={() => {
            dispatch({ type: 'SET_HOVERED', value: false, orientation: 'vertical' });
            visibility.scheduleHide();
          }}
        >
          <ScrollbarThumb
            ref={verticalThumbRef}
            orientation="vertical"
            thumbSize={scrollbars.vertical.thumbSize}
            thumbPosition={scrollbars.vertical.thumbPosition}
            isDragging={scrollbars.vertical.isDragging}
            scrollbarWidth={scrollbarWidth}
            onPointerDown={createPointerDownHandler('vertical')}
          />
        </div>
      )}

      {/* Горизонтальный Scrollbar */}
      {scrollbars.horizontal.thumbSize > 0 && (
        <div
          className={styles.appleScrollbarTrackHorizontal}
          style={{
            height: scrollbarWidth,
            opacity: visibility.isScrollbarVisible ? 1 : 0,
            pointerEvents: visibility.isScrollbarVisible ? 'auto' : 'none',
            right: scrollbarWidth + TRACK_PADDING,
            backgroundColor: isTrack ? 'var(--scrollbar-color)' : 'transparent',
          }}
          onMouseEnter={() => {
            dispatch({ type: 'SET_HOVERED', value: true, orientation: 'horizontal' });
            visibility.forceShow();
          }}
          onMouseLeave={() => {
            dispatch({ type: 'SET_HOVERED', value: false, orientation: 'horizontal' });
            visibility.scheduleHide();
          }}
        >
          <ScrollbarThumb
            ref={horizontalThumbRef}
            orientation="horizontal"
            thumbSize={scrollbars.horizontal.thumbSize}
            thumbPosition={scrollbars.horizontal.thumbPosition}
            isDragging={scrollbars.horizontal.isDragging}
            scrollbarWidth={scrollbarWidth}
            onPointerDown={createPointerDownHandler('horizontal')}
          />
        </div>
      )}
    </div>
  );
};

export default AppleScrollbar;
