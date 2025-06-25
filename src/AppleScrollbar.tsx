import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './AppleScrollbar.module.css';

interface AppleScrollbarProps {
  children: React.ReactNode;
  className?: string;
  scrollbarWidth?: number;
  fadeTimeout?: number;
}

interface ScrollbarState {
  isDragging: boolean;
  isHovered: boolean;
  thumbSize: number;
  thumbPosition: number;
  startPosition: number;
  startThumbPosition: number;
  hideTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

const AppleScrollbar: React.FC<AppleScrollbarProps> = ({
  children,
  className = '',
  scrollbarWidth = 8,
  fadeTimeout = 1000,
}) => {
  // Состояния для скроллбаров
  const [vertical, setVertical] = useState<ScrollbarState>({
    isDragging: false,
    isHovered: false,
    thumbSize: 0,
    thumbPosition: 0,
    startPosition: 0,
    startThumbPosition: 0,
    hideTimeoutRef: useRef<NodeJS.Timeout | null>(null),
  });

  const [horizontal, setHorizontal] = useState<ScrollbarState>({
    isDragging: false,
    isHovered: false,
    thumbSize: 0,
    thumbPosition: 0,
    startPosition: 0,
    startThumbPosition: 0,
    hideTimeoutRef: useRef<NodeJS.Timeout | null>(null),
  });

  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const verticalThumbRef = useRef<HTMLDivElement>(null);
  const horizontalThumbRef = useRef<HTMLDivElement>(null);

  // Общее состояние для синхронизации
  const stateRef = useRef({
    verticalHovered: vertical.isHovered,
    horizontalHovered: horizontal.isHovered,
    verticalDragging: vertical.isDragging,
    horizontalDragging: horizontal.isDragging,
    isScrollbarVisible,
  });

  useEffect(() => {
    stateRef.current = {
      verticalHovered: vertical.isHovered,
      horizontalHovered: horizontal.isHovered,
      verticalDragging: vertical.isDragging,
      horizontalDragging: horizontal.isDragging,
      isScrollbarVisible,
    };
  }, [
    vertical.isHovered,
    horizontal.isHovered,
    vertical.isDragging,
    horizontal.isDragging,
    isScrollbarVisible,
  ]);

  // Функция для расчета размеров ползунков
  const calculateThumb = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const container = containerRef.current;
    const content = contentRef.current;

    // Вертикальный расчет
    const verticalTrackHeight = container.clientHeight - (scrollbarWidth + 10);
    const verticalScrollRatio = container.clientHeight / content.scrollHeight;
    const verticalThumbSize = Math.max(verticalScrollRatio * verticalTrackHeight, 40);

    // Горизонтальный расчет
    const horizontalTrackWidth = container.clientWidth - (scrollbarWidth + 10);
    const horizontalScrollRatio = container.clientWidth / content.scrollWidth;
    const horizontalThumbSize = Math.max(
      horizontalScrollRatio * horizontalTrackWidth,
      40,
    );

    // Обновление состояний
    setVertical((prev) => ({ ...prev, thumbSize: verticalThumbSize }));
    setHorizontal((prev) => ({ ...prev, thumbSize: horizontalThumbSize }));
  }, [scrollbarWidth]);

  // Функция для обновления позиций ползунков
  const updateThumbPositions = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const container = containerRef.current;
    const content = contentRef.current;

    // Вертикальные расчеты
    const verticalTrackHeight = container.clientHeight - (scrollbarWidth + 10);
    const verticalMaxScroll = Math.max(0, content.scrollHeight - container.clientHeight);

    let verticalThumbPos = 0;
    if (verticalMaxScroll > 0) {
      const thumbMaxPosition = verticalTrackHeight - vertical.thumbSize;
      verticalThumbPos = (content.scrollTop / verticalMaxScroll) * thumbMaxPosition;
      verticalThumbPos = Math.max(0, Math.min(thumbMaxPosition, verticalThumbPos));
    }

    // Горизонтальные расчеты
    const horizontalTrackWidth = container.clientWidth - (scrollbarWidth + 10);
    const horizontalMaxScroll = Math.max(0, content.scrollWidth - container.clientWidth);

    let horizontalThumbPos = 0;
    if (horizontalMaxScroll > 0) {
      const thumbMaxPosition = horizontalTrackWidth - horizontal.thumbSize;
      horizontalThumbPos = (content.scrollLeft / horizontalMaxScroll) * thumbMaxPosition;
      horizontalThumbPos = Math.max(0, Math.min(thumbMaxPosition, horizontalThumbPos));
    }

    // Обновление позиций
    setVertical((prev) => ({ ...prev, thumbPosition: verticalThumbPos }));
    setHorizontal((prev) => ({ ...prev, thumbPosition: horizontalThumbPos }));
  }, [vertical.thumbSize, horizontal.thumbSize, scrollbarWidth]);

  // Управление таймаутами
  const manageTimeout = useCallback(
    (isHorizontal: boolean, action: 'clear' | 'schedule') => {
      const scrollbar = isHorizontal ? horizontal : vertical;
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
    [fadeTimeout, horizontal, vertical],
  );

  const showScrollbar = useCallback(() => {
    setIsScrollbarVisible(true);
    manageTimeout(false, 'clear');
    manageTimeout(true, 'clear');
    manageTimeout(false, 'schedule');
    manageTimeout(true, 'schedule');
  }, [manageTimeout]);

  // Обработчик скролла
  const handleScroll = useCallback(() => {
    updateThumbPositions();
    showScrollbar();
  }, [updateThumbPositions, showScrollbar]);

  // Обработчик перетаскивания
  const handlePointerMove = useCallback(
    (e: PointerEvent, orientation: 'vertical' | 'horizontal') => {
      const isVertical = orientation === 'vertical';
      const scrollbar = isVertical ? vertical : horizontal;

      if (!scrollbar.isDragging || !containerRef.current || !contentRef.current) return;

      const container = containerRef.current;
      const content = contentRef.current;
      const positionProp = isVertical ? 'clientY' : 'clientX';
      const scrollProp = isVertical ? 'scrollTop' : 'scrollLeft';
      const sizeProp = isVertical ? 'scrollHeight' : 'scrollWidth';
      const clientProp = isVertical ? 'clientHeight' : 'clientWidth';

      // Всегда используем АКТУАЛЬНЫЕ размеры в реальном времени
      const trackSize = container[clientProp] - (scrollbarWidth + 10);
      const contentSize = content[sizeProp];
      const containerSize = content[clientProp];
      const maxScroll = Math.max(0, contentSize - containerSize + 1);
      const availableSpace = trackSize - scrollbar.thumbSize;

      if (availableSpace <= 0 || maxScroll <= 0) return;

      const delta = e[positionProp] - scrollbar.startPosition;
      let newThumbPos = scrollbar.startThumbPosition + delta;
      newThumbPos = Math.max(0, Math.min(availableSpace, newThumbPos));

      const scrollPercentage = newThumbPos / availableSpace;
      let newScrollPos = scrollPercentage * maxScroll;

      // Гарантируем достижение конца скролла
      if (newThumbPos >= availableSpace - 1) {
        newScrollPos = maxScroll;
      }

      content[scrollProp] = newScrollPos;

      // Обновляем позицию ползунка
      if (isVertical) {
        setVertical((prev) => ({ ...prev, thumbPosition: newThumbPos }));
      } else {
        setHorizontal((prev) => ({ ...prev, thumbPosition: newThumbPos }));
      }
    },
    [vertical, horizontal, scrollbarWidth],
  );

  // Обработчики событий
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    orientation: 'vertical' | 'horizontal',
  ) => {
    if (!containerRef.current || !contentRef.current) return;
    e.preventDefault();

    const position = orientation === 'vertical' ? e.clientY : e.clientX;
    const thumbPosition =
      orientation === 'vertical' ? vertical.thumbPosition : horizontal.thumbPosition;

    if (orientation === 'vertical') {
      setVertical((prev) => ({
        ...prev,
        isDragging: true,
        startPosition: position,
        startThumbPosition: thumbPosition,
      }));
    } else {
      setHorizontal((prev) => ({
        ...prev,
        isDragging: true,
        startPosition: position,
        startThumbPosition: thumbPosition,
      }));
    }

    showScrollbar();
    document.body.style.userSelect = 'none';
  };

  const stopDragging = useCallback(
    (orientation: 'vertical' | 'horizontal') => {
      if (orientation === 'vertical') {
        setVertical((prev) => ({ ...prev, isDragging: false }));
      } else {
        setHorizontal((prev) => ({ ...prev, isDragging: false }));
      }

      document.body.style.userSelect = '';
      manageTimeout(orientation === 'horizontal', 'schedule');
    },
    [manageTimeout],
  );

  // Эффекты
  useEffect(() => {
    calculateThumb();
    const ro = new ResizeObserver(() => {
      calculateThumb();
      updateThumbPositions();
    });

    if (containerRef.current) ro.observe(containerRef.current);
    if (contentRef.current) ro.observe(contentRef.current);

    return () => ro.disconnect();
  }, [calculateThumb, updateThumbPositions]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    content.addEventListener('scroll', handleScroll);
    return () => content.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (vertical.isDragging) handlePointerMove(e, 'vertical');
      if (horizontal.isDragging) handlePointerMove(e, 'horizontal');
    };

    const handleUp = () => {
      if (vertical.isDragging) stopDragging('vertical');
      if (horizontal.isDragging) stopDragging('horizontal');
    };

    if (vertical.isDragging || horizontal.isDragging) {
      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
      document.addEventListener('pointercancel', handleUp);
    }

    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
    };
  }, [vertical.isDragging, horizontal.isDragging, handlePointerMove, stopDragging]);

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
  return (
    <div ref={containerRef} className={`${styles.appleScrollContainer} ${className}`}>
      <div ref={contentRef} className={styles.appleScrollContent}>
        {children}
      </div>

      {/* Вертикальный Scrollbar */}
      <div
        className={styles.appleScrollbarTrackVertical}
        style={{
          width: scrollbarWidth + 4,
          opacity: isScrollbarVisible ? 1 : 0,
          pointerEvents: isScrollbarVisible ? 'auto' : 'none',
          bottom: scrollbarWidth + 10,
        }}
        onMouseEnter={() => {
          setVertical((prev) => ({ ...prev, isHovered: true }));
          manageTimeout(false, 'clear');
        }}
        onMouseLeave={() => {
          setVertical((prev) => ({ ...prev, isHovered: false }));
          manageTimeout(false, 'schedule');
        }}
      >
        <div
          ref={verticalThumbRef}
          className={`${styles.appleScrollbarThumb} ${styles.appleScrollbarThumbVertical}`}
          style={{
            width: scrollbarWidth,
            height: vertical.thumbSize,
            borderRadius: scrollbarWidth / 2,
            transform: `translateY(${vertical.thumbPosition}px)`,
            transition: vertical.isDragging ? 'none' : 'transform 0.1s ease',
          }}
          onPointerDown={(e) => handlePointerDown(e, 'vertical')}
        />
      </div>

      {/* Горизонтальный Scrollbar */}
      <div
        className={styles.appleScrollbarTrackHorizontal}
        style={{
          height: scrollbarWidth + 4,
          opacity: isScrollbarVisible ? 1 : 0,
          pointerEvents: isScrollbarVisible ? 'auto' : 'none',
          right: scrollbarWidth + 10,
        }}
        onMouseEnter={() => {
          setHorizontal((prev) => ({ ...prev, isHovered: true }));
          manageTimeout(true, 'clear');
        }}
        onMouseLeave={() => {
          setHorizontal((prev) => ({ ...prev, isHovered: false }));
          manageTimeout(true, 'schedule');
        }}
      >
        <div
          ref={horizontalThumbRef}
          className={`${styles.appleScrollbarThumb} ${styles.appleScrollbarThumbHorizontal}`}
          style={{
            height: scrollbarWidth,
            width: horizontal.thumbSize,
            borderRadius: scrollbarWidth / 2,
            transform: `translateX(${horizontal.thumbPosition}px)`,
            transition: horizontal.isDragging ? 'none' : 'transform 0.1s ease',
          }}
          onPointerDown={(e) => handlePointerDown(e, 'horizontal')}
        />
      </div>
    </div>
  );
};

export default AppleScrollbar;
