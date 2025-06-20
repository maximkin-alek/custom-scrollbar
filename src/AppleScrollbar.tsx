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
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isThumbHovered, setIsThumbHovered] = useState<boolean>(false);
  const [thumbHeight, setThumbHeight] = useState<number>(0);
  const [thumbPosition, setThumbPosition] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastYRef = useRef<number>(0);
  const startThumbPositionRef = useRef<number>(0);
  const isTouchDeviceRef = useRef<boolean>(false);
  const trackHeightRef = useRef<number>(0);

  // Рассчет размеров скроллбара
  const calculateThumb = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;

    const container = containerRef.current;
    const content = contentRef.current;

    const scrollRatio = container.clientHeight / content.scrollHeight;
    const newThumbHeight = Math.max(scrollRatio * container.clientHeight, 40);

    setThumbHeight(newThumbHeight);

    const maxScroll = content.scrollHeight - container.clientHeight;
    const newThumbPosition =
      maxScroll > 0
        ? (content.scrollTop / maxScroll) * (container.clientHeight - newThumbHeight)
        : 0;

    setThumbPosition(newThumbPosition);
    trackHeightRef.current = container.clientHeight - newThumbHeight;
  }, []);

  // Показать скроллбар и запустить таймер скрытия
  const showScrollbar = useCallback(() => {
    setIsVisible(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, fadeTimeout);
  }, [fadeTimeout]);

  // Обновление позиции при скролле
  const handleScroll = useCallback(() => {
    if (isDragging) return;

    if (!containerRef.current || !contentRef.current) return;

    const container = containerRef.current;
    const content = contentRef.current;

    const maxScroll = content.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) return;

    const newThumbPosition =
      (content.scrollTop / maxScroll) * (container.clientHeight - thumbHeight);

    setThumbPosition(newThumbPosition);
    showScrollbar();
  }, [showScrollbar, thumbHeight, isDragging]);

  // Общая логика начала перетаскивания
  const startDragCommon = useCallback(() => {
    setIsDragging(true);
    setIsVisible(true);

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    document.body.style.userSelect = 'none';
  }, []);

  // Начало перетаскивания ползунка (мышь)
  const startDrag = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      lastYRef.current = e.clientY;
      startThumbPositionRef.current = thumbPosition;
      isTouchDeviceRef.current = false;

      startDragCommon();
    },
    [startDragCommon, thumbPosition],
  );

  // Начало перетаскивания для touch
  const startTouchDrag = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 0) return;

      const touch = e.touches[0];
      lastYRef.current = touch.clientY;
      startThumbPositionRef.current = thumbPosition;
      isTouchDeviceRef.current = true;

      // Важно: не вызываем preventDefault() здесь, чтобы не блокировать скролл
      startDragCommon();
    },
    [startDragCommon, thumbPosition],
  );

  // Инициализация ResizeObserver
  useEffect(() => {
    if (containerRef.current && contentRef.current) {
      calculateThumb();

      observerRef.current = new ResizeObserver(() => {
        calculateThumb();
      });

      observerRef.current.observe(contentRef.current);
      observerRef.current.observe(containerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [calculateThumb]);

  // Обработчики событий скролла
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    content.addEventListener('scroll', handleScroll);
    return () => content.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Обработчики событий перетаскивания
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleDragCommon(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      console.log(e.touches, 'handleTouchMove');
      if (e.touches.length === 0) return;

      // Для touchmove вызываем preventDefault только если это возможно
      if (e.cancelable) {
        e.preventDefault();
      }

      handleDragCommon(e.touches[0].clientY);
    };

    const handleDragCommon = (clientY: number) => {
      if (!containerRef.current || !contentRef.current) return;

      const container = containerRef.current;
      const content = contentRef.current;
      const maxScroll = content.scrollHeight - container.clientHeight;
      const trackHeight = container.clientHeight - thumbHeight;

      // Рассчитываем относительное смещение
      const deltaY = clientY - lastYRef.current;
      lastYRef.current = clientY;

      // Вычисляем новую позицию на основе смещения
      let newThumbPosition = thumbPosition + deltaY;

      // Ограничиваем позицию в пределах трека
      newThumbPosition = Math.max(0, Math.min(trackHeight, newThumbPosition));

      // Рассчитываем соответствующий scrollTop
      if (trackHeight > 0 && maxScroll > 0) {
        const scrollPercentage = newThumbPosition / trackHeight;
        content.scrollTop = scrollPercentage * maxScroll;
      }

      // Обновляем позицию ползунка
      setThumbPosition(newThumbPosition);
    };

    const stopDrag = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';

      if (isThumbHovered && !isTouchDeviceRef.current) {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
      } else {
        showScrollbar();
      }
    };

    // Добавляем обработчики
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('mouseleave', stopDrag);

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', stopDrag);
    document.addEventListener('touchcancel', stopDrag);

    return () => {
      // Удаляем обработчики мыши
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('mouseleave', stopDrag);

      // Удаляем обработчики тач-устройств
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', stopDrag);
      document.removeEventListener('touchcancel', stopDrag);
    };
  }, [isDragging, thumbHeight, isThumbHovered, showScrollbar, thumbPosition]);

  // Обработчики для ползунка
  const handleThumbEnter = useCallback(() => {
    setIsThumbHovered(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  }, []);

  const handleThumbLeave = useCallback(() => {
    setIsThumbHovered(false);
    if (isVisible && !isDragging) {
      showScrollbar();
    }
  }, [isVisible, isDragging, showScrollbar]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      console.log(e.touches, 'handleTouchStart');
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  return (
    <div ref={containerRef} className={`${styles.appleScrollContainer} ${className}`}>
      <div ref={contentRef} className={styles.appleScrollContent}>
        {children}
      </div>

      {/* Кастомный скроллбар */}
      <div
        className={styles.appleScrollbarTrack}
        style={{
          width: scrollbarWidth + 4,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.2s ease',
          pointerEvents: isDragging ? 'auto' : 'none',
        }}
      >
        <div
          ref={thumbRef}
          className={styles.appleScrollbarThumb}
          style={{
            width: scrollbarWidth,
            height: thumbHeight,
            borderRadius: scrollbarWidth / 2,
            cursor: 'pointer',
            transform: `translateY(${thumbPosition}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease',
            touchAction: 'none',
          }}
          onMouseDown={startDrag}
          onTouchStart={startTouchDrag}
          onMouseEnter={handleThumbEnter}
          onMouseLeave={handleThumbLeave}
        />
      </div>
    </div>
  );
};

export default AppleScrollbar;
