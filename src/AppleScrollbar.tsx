import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './AppleScrollbar.module.css';

interface AppleScrollbarProps {
  children: React.ReactNode;
  className?: string;
  scrollbarWidth?: number;
  fadeTimeout?: number;
}

const AppleScrollbar: React.FC<AppleScrollbarProps> = ({
  children,
  className = '',
  scrollbarWidth = 8,
  fadeTimeout = 1000,
}) => {
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);
  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const [isHoveredOverVertical, setIsHoveredOverVertical] = useState(false);
  const [isHoveredOverHorizontal, setIsHoveredOverHorizontal] = useState(false);

  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbPosition, setThumbPosition] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(0);
  const [thumbXPosition, setThumbXPosition] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const verticalThumbRef = useRef<HTMLDivElement>(null);
  const horizontalThumbRef = useRef<HTMLDivElement>(null);

  const verticalHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const horizontalHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startYRef = useRef(0);
  const startThumbTopRef = useRef(0);
  const startXRef = useRef(0);
  const startThumbLeftRef = useRef(0);

  const stateRef = useRef({
    isHoveredOverVertical,
    isHoveredOverHorizontal,
    isDraggingVertical,
    isDraggingHorizontal,
    isScrollbarVisible,
  });

  useEffect(() => {
    stateRef.current = {
      isHoveredOverVertical,
      isHoveredOverHorizontal,
      isDraggingVertical,
      isDraggingHorizontal,
      isScrollbarVisible,
    };
  }, [
    isHoveredOverVertical,
    isHoveredOverHorizontal,
    isDraggingVertical,
    isDraggingHorizontal,
    isScrollbarVisible,
  ]);

  // Функция расчета размеров и позиций ползунков
  const calculateThumb = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;

    const container = containerRef.current;
    const content = contentRef.current;

    // Вертикальные расчеты
    const verticalTrackHeight = container.clientHeight - (scrollbarWidth + 10);
    const scrollRatioY = container.clientHeight / content.scrollHeight;
    const newThumbH = Math.max(scrollRatioY * verticalTrackHeight, 40);
    setThumbHeight(newThumbH);

    const maxScrollY = Math.max(0, content.scrollHeight - container.clientHeight);
    const newPosY =
      maxScrollY > 0
        ? (content.scrollTop / maxScrollY) * (verticalTrackHeight - newThumbH)
        : 0;
    setThumbPosition(newPosY);

    // Горизонтальные расчеты
    const horizontalTrackWidth = container.clientWidth - (scrollbarWidth + 10);
    const scrollRatioX = container.clientWidth / content.scrollWidth;
    const newThumbW = Math.max(scrollRatioX * horizontalTrackWidth, 40);
    setThumbWidth(newThumbW);

    const maxScrollX = Math.max(0, content.scrollWidth - container.clientWidth);
    const newPosX =
      maxScrollX > 0
        ? (content.scrollLeft / maxScrollX) * (horizontalTrackWidth - newThumbW)
        : 0;
    setThumbXPosition(newPosX);
  }, [scrollbarWidth]);

  const clearHideTimeout = (isHorizontal = false) => {
    const timeoutRef = isHorizontal ? horizontalHideTimeoutRef : verticalHideTimeoutRef;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const scheduleHide = useCallback(
    (isHorizontal = false) => {
      const timeoutRef = isHorizontal ? horizontalHideTimeoutRef : verticalHideTimeoutRef;
      clearHideTimeout(isHorizontal);

      timeoutRef.current = setTimeout(() => {
        const {
          isHoveredOverVertical,
          isHoveredOverHorizontal,
          isDraggingVertical,
          isDraggingHorizontal,
        } = stateRef.current;

        if (isHorizontal) {
          if (!isHoveredOverHorizontal && !isDraggingHorizontal) {
            setIsScrollbarVisible((prev) => {
              if (!isHoveredOverVertical && !isDraggingVertical) return false;
              return prev;
            });
          }
        } else {
          if (!isHoveredOverVertical && !isDraggingVertical) {
            setIsScrollbarVisible((prev) => {
              if (!isHoveredOverHorizontal && !isDraggingHorizontal) return false;
              return prev;
            });
          }
        }
      }, fadeTimeout);
    },
    [fadeTimeout],
  );

  const showScrollbar = useCallback(() => {
    setIsScrollbarVisible(true);
    clearHideTimeout(false);
    clearHideTimeout(true);
    scheduleHide(false);
    scheduleHide(true);
  }, [scheduleHide]);

  // Обработчик скролла контента
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const container = containerRef.current;
    const content = contentRef.current;

    // Рассчитываем актуальные максимумы
    const maxScrollY = Math.max(0, content.scrollHeight - container.clientHeight);
    const maxScrollX = Math.max(0, content.scrollWidth - container.clientWidth);

    // Ограничиваем скролл реальными пределами
    content.scrollTop = Math.min(content.scrollTop, maxScrollY);
    content.scrollLeft = Math.min(content.scrollLeft, maxScrollX);

    // Вертикальный скролл
    const verticalTrackHeight = container.clientHeight - (scrollbarWidth + 10);
    if (maxScrollY > 0) {
      const thumbMaxPosition = verticalTrackHeight - thumbHeight;
      let newPosY = (content.scrollTop / maxScrollY) * thumbMaxPosition;
      newPosY = Math.max(0, Math.min(thumbMaxPosition, newPosY));
      setThumbPosition(newPosY);
    }

    // Горизонтальный скролл
    const horizontalTrackWidth = container.clientWidth - (scrollbarWidth + 10);
    if (maxScrollX > 0) {
      const thumbMaxPosition = horizontalTrackWidth - thumbWidth;
      let newPosX = (content.scrollLeft / maxScrollX) * thumbMaxPosition;
      newPosX = Math.max(0, Math.min(thumbMaxPosition, newPosX));
      setThumbXPosition(newPosX);
    }

    showScrollbar();
  }, [thumbHeight, thumbWidth, showScrollbar, scrollbarWidth]);

  // Вертикальное перетаскивание
  const handleVerticalPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !contentRef.current) return;
    e.preventDefault();
    startYRef.current = e.clientY;
    startThumbTopRef.current = thumbPosition;
    setIsDraggingVertical(true);
    showScrollbar();
    document.body.style.userSelect = 'none';
  };

  const handleVerticalPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingVertical || !containerRef.current || !contentRef.current) return;
      const container = containerRef.current;
      const content = contentRef.current;

      // ВСЕГДА используем актуальные значения размеров
      const verticalTrackHeight = container.clientHeight - (scrollbarWidth + 10);
      const scrollHeight = content.scrollHeight;
      const clientHeight = container.clientHeight;
      const maxScrollY = Math.max(0, scrollHeight - clientHeight);

      const availableSpace = verticalTrackHeight - thumbHeight;

      if (availableSpace <= 0 || maxScrollY <= 0) return;

      const delta = e.clientY - startYRef.current;
      let newTop = startThumbTopRef.current + delta;

      // Ограничиваем в пределах доступного пространства
      newTop = Math.max(0, Math.min(availableSpace, newTop));

      // Рассчитываем скролл на основе новой позиции
      const scrollPercentage = newTop / availableSpace;
      const newScrollTop = scrollPercentage * maxScrollY;

      // Устанавливаем точное значение
      content.scrollTop = newScrollTop;
      setThumbPosition(newTop);
    },
    [isDraggingVertical, thumbHeight, scrollbarWidth],
  );

  const stopVerticalDragging = useCallback(() => {
    setIsDraggingVertical(false);
    document.body.style.userSelect = '';
    scheduleHide(false);
  }, [scheduleHide]);

  // Горизонтальное перетаскивание
  const handleHorizontalPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !contentRef.current) return;
    e.preventDefault();
    startXRef.current = e.clientX;
    startThumbLeftRef.current = thumbXPosition;
    setIsDraggingHorizontal(true);
    showScrollbar();
    document.body.style.userSelect = 'none';
  };

  const handleHorizontalPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingHorizontal || !containerRef.current || !contentRef.current) return;
      const container = containerRef.current;
      const content = contentRef.current;

      // ВСЕГДА используем актуальные значения размеров
      const horizontalTrackWidth = container.clientWidth - (scrollbarWidth + 10);
      const scrollWidth = content.scrollWidth;
      const clientWidth = container.clientWidth;
      const maxScrollX = Math.max(0, scrollWidth - clientWidth);

      const availableSpace = horizontalTrackWidth - thumbWidth;

      if (availableSpace <= 0 || maxScrollX <= 0) return;

      const delta = e.clientX - startXRef.current;
      let newLeft = startThumbLeftRef.current + delta;

      // Ограничиваем в пределах доступного пространства
      newLeft = Math.max(0, Math.min(availableSpace, newLeft));

      // Рассчитываем скролл на основе новой позиции
      const scrollPercentage = newLeft / availableSpace;
      const newScrollLeft = scrollPercentage * maxScrollX;

      // Устанавливаем точное значение
      content.scrollLeft = newScrollLeft;
      setThumbXPosition(newLeft);
    },
    [isDraggingHorizontal, thumbWidth, scrollbarWidth],
  );

  const stopHorizontalDragging = useCallback(() => {
    setIsDraggingHorizontal(false);
    document.body.style.userSelect = '';
    scheduleHide(true);
  }, [scheduleHide]);

  useEffect(() => {
    calculateThumb();
    const ro = new ResizeObserver(calculateThumb);
    if (containerRef.current) ro.observe(containerRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [calculateThumb]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    content.addEventListener('scroll', handleScroll);
    return () => content.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (isDraggingVertical) {
      document.addEventListener('pointermove', handleVerticalPointerMove);
      document.addEventListener('pointerup', stopVerticalDragging);
    }

    if (isDraggingHorizontal) {
      document.addEventListener('pointermove', handleHorizontalPointerMove);
      document.addEventListener('pointerup', stopHorizontalDragging);
    }

    return () => {
      document.removeEventListener('pointermove', handleVerticalPointerMove);
      document.removeEventListener('pointerup', stopVerticalDragging);
      document.removeEventListener('pointermove', handleHorizontalPointerMove);
      document.removeEventListener('pointerup', stopHorizontalDragging);
    };
  }, [
    isDraggingVertical,
    isDraggingHorizontal,
    handleVerticalPointerMove,
    handleHorizontalPointerMove,
    stopVerticalDragging,
    stopHorizontalDragging,
  ]);

  // Обработка ухода мыши за пределы окна
  useEffect(() => {
    const handleDocLeave = (e: MouseEvent) => {
      if (
        e.clientY <= 0 ||
        e.clientX <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        clearHideTimeout(false);
        clearHideTimeout(true);
        setIsScrollbarVisible(false);
      }
    };

    document.addEventListener('mouseleave', handleDocLeave);
    return () => {
      document.removeEventListener('mouseleave', handleDocLeave);
    };
  }, []);

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
          setIsHoveredOverVertical(true);
          clearHideTimeout(false);
        }}
        onMouseLeave={() => {
          setIsHoveredOverVertical(false);
          scheduleHide(false);
        }}
      >
        <div
          ref={verticalThumbRef}
          className={`${styles.appleScrollbarThumb} ${styles.appleScrollbarThumbVertical}`}
          style={{
            width: scrollbarWidth,
            height: thumbHeight,
            borderRadius: scrollbarWidth / 2,
            transform: `translateY(${thumbPosition}px)`,
            transition: isDraggingVertical ? 'none' : 'transform 0.1s ease',
          }}
          onPointerDown={handleVerticalPointerDown}
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
          setIsHoveredOverHorizontal(true);
          clearHideTimeout(true);
        }}
        onMouseLeave={() => {
          setIsHoveredOverHorizontal(false);
          scheduleHide(true);
        }}
      >
        <div
          ref={horizontalThumbRef}
          className={`${styles.appleScrollbarThumb} ${styles.appleScrollbarThumbHorizontal}`}
          style={{
            height: scrollbarWidth,
            width: thumbWidth,
            borderRadius: scrollbarWidth / 2,
            transform: `translateX(${thumbXPosition}px)`,
            transition: isDraggingHorizontal ? 'none' : 'transform 0.1s ease',
          }}
          onPointerDown={handleHorizontalPointerDown}
        />
      </div>
    </div>
  );
};

export default AppleScrollbar;
