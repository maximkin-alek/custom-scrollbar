import React, { useState, useRef, useEffect, useCallback, useReducer } from 'react';
import styles from './AppleScrollbar.module.css';
import {
  calculateThumbMetrics,
  calculateScrollFromDrag,
} from './utils/scrollbarUtils.ts';
import { scrollbarsReducer } from './scrollbarReducer.ts';
import { AppleScrollbarProps, ScrollbarsState } from './types.ts';

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

  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);

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
    isScrollbarVisible,
  });

  useEffect(() => {
    stateRef.current = {
      verticalHovered: scrollbars.vertical.isHovered,
      horizontalHovered: scrollbars.horizontal.isHovered,
      verticalDragging: scrollbars.vertical.isDragging,
      horizontalDragging: scrollbars.horizontal.isDragging,
      isScrollbarVisible,
    };
  }, [
    scrollbars.vertical.isHovered,
    scrollbars.horizontal.isHovered,
    scrollbars.vertical.isDragging,
    scrollbars.horizontal.isDragging,
    isScrollbarVisible,
  ]);

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

      const trackSize = container[clientProp] - (scrollbarWidth + 10);
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

  // Управление таймаутами
  const manageTimeout = useCallback(
    (isHorizontal: boolean, action: 'clear' | 'schedule') => {
      const scrollbar = isHorizontal ? scrollbars.horizontal : scrollbars.vertical;
      const timeoutRef = scrollbar.hideTimeoutRef;

      if (action === 'clear') {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }

      if (action === 'schedule') {
        timeoutRef.current = setTimeout(() => {
          const {
            verticalHovered,
            horizontalHovered,
            verticalDragging,
            horizontalDragging,
          } = stateRef.current;

          if (isHorizontal) {
            if (!horizontalHovered && !horizontalDragging) {
              setIsScrollbarVisible((prev) =>
                verticalHovered || verticalDragging ? prev : false,
              );
            }
          } else {
            if (!verticalHovered && !verticalDragging) {
              setIsScrollbarVisible((prev) =>
                horizontalHovered || horizontalDragging ? prev : false,
              );
            }
          }
        }, fadeTimeout);
      }
    },
    [fadeTimeout, scrollbars.horizontal, scrollbars.vertical],
  );

  const showScrollbar = useCallback(() => {
    setIsScrollbarVisible(true);
    manageTimeout(false, 'clear');
    manageTimeout(true, 'clear');
    manageTimeout(false, 'schedule');
    manageTimeout(true, 'schedule');
  }, [manageTimeout]);

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
      showScrollbar();
    });
  }, [updateThumbPositions, showScrollbar]);

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

  // Обработчики событий
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    orientation: 'vertical' | 'horizontal',
  ) => {
    if (!containerRef.current || !contentRef.current) return;
    e.preventDefault();

    const position = orientation === 'vertical' ? e.clientY : e.clientX;
    const thumbPosition =
      orientation === 'vertical'
        ? scrollbars.vertical.thumbPosition
        : scrollbars.horizontal.thumbPosition;

    if (orientation === 'vertical') {
      dispatch({
        type: 'SET_DRAGGING',
        value: true,
        orientation: 'vertical',
        startPosition: position,
        startThumbPosition: thumbPosition,
      });
    } else {
      dispatch({
        type: 'SET_DRAGGING',
        value: true,
        orientation: 'horizontal',
        startPosition: position,
        startThumbPosition: thumbPosition,
      });
    }

    showScrollbar();
    document.body.style.userSelect = 'none';
  };

  const stopDragging = useCallback(
    (orientation: 'vertical' | 'horizontal') => {
      // Исправленная версия без ошибки
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
      manageTimeout(orientation === 'horizontal', 'schedule');
    },
    [manageTimeout],
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
        manageTimeout(false, 'clear');
        manageTimeout(true, 'clear');
        setIsScrollbarVisible(false);
      }
    };

    document.addEventListener('mouseleave', handleDocLeave);
    return () => document.removeEventListener('mouseleave', handleDocLeave);
  }, [manageTimeout]);

  // Рендер компонента
  // Рендер компонента
  return (
    <div ref={containerRef} className={`${styles.appleScrollContainer} ${className}`}>
      <div ref={contentRef} className={styles.appleScrollContent}>
        {children}
      </div>

      {/* Вертикальный Scrollbar - показываем только если нужен */}
      {scrollbars.vertical.thumbSize > 0 && (
        <div
          className={styles.appleScrollbarTrackVertical}
          style={{
            width: scrollbarWidth,
            opacity: isScrollbarVisible ? 1 : 0,
            pointerEvents: isScrollbarVisible ? 'auto' : 'none',
            bottom: scrollbarWidth + 10,
            backgroundColor: isTrack ? 'var(--scrollbar-color)' : 'transparent',
          }}
          onMouseEnter={() => {
            dispatch({ type: 'SET_HOVERED', value: true, orientation: 'vertical' });
            manageTimeout(false, 'clear');
          }}
          onMouseLeave={() => {
            dispatch({ type: 'SET_HOVERED', value: false, orientation: 'vertical' });
            manageTimeout(false, 'schedule');
          }}
        >
          <div
            ref={verticalThumbRef}
            className={`${styles.appleScrollbarThumb} ${styles.appleScrollbarThumbVertical}`}
            style={{
              width: scrollbarWidth,
              height: scrollbars.vertical.thumbSize,
              borderRadius: scrollbarWidth / 2,
              transform: `translateY(${scrollbars.vertical.thumbPosition}px)`,
              transition: scrollbars.vertical.isDragging ? 'none' : 'transform 0.1s ease',
            }}
            onPointerDown={(e) => handlePointerDown(e, 'vertical')}
          />
        </div>
      )}

      {/* Горизонтальный Scrollbar - показываем только если нужен */}
      {scrollbars.horizontal.thumbSize > 0 && (
        <div
          className={styles.appleScrollbarTrackHorizontal}
          style={{
            height: scrollbarWidth,
            opacity: isScrollbarVisible ? 1 : 0,
            pointerEvents: isScrollbarVisible ? 'auto' : 'none',
            right: scrollbarWidth + 10,
            backgroundColor: isTrack ? 'var(--scrollbar-color)' : 'transparent',
          }}
          onMouseEnter={() => {
            dispatch({ type: 'SET_HOVERED', value: true, orientation: 'horizontal' });
            manageTimeout(true, 'clear');
          }}
          onMouseLeave={() => {
            dispatch({ type: 'SET_HOVERED', value: false, orientation: 'horizontal' });
            manageTimeout(true, 'schedule');
          }}
        >
          <div
            ref={horizontalThumbRef}
            className={`${styles.appleScrollbarThumb} ${styles.appleScrollbarThumbHorizontal}`}
            style={{
              height: scrollbarWidth,
              width: scrollbars.horizontal.thumbSize,
              borderRadius: scrollbarWidth / 2,
              transform: `translateX(${scrollbars.horizontal.thumbPosition}px)`,
              transition: scrollbars.horizontal.isDragging
                ? 'none'
                : 'transform 0.1s ease',
            }}
            onPointerDown={(e) => handlePointerDown(e, 'horizontal')}
          />
        </div>
      )}
    </div>
  );
};

export default AppleScrollbar;
