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
  const startYRef = useRef<number>(0);
  const startThumbPositionRef = useRef<number>(0);
  const startScrollTopRef = useRef<number>(0);
  const touchOffsetYRef = useRef<number>(0);
  const isTouchDeviceRef = useRef<boolean>(false);
  const lastPositionRef = useRef<number>(0);

  // Рассчет размеров скроллбара
  const calculateThumb = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;

    const container = containerRef.current;
    const content = contentRef.current;

    const scrollRatio = container.clientHeight / content.scrollHeight;
    const newThumbHeight = Math.max(scrollRatio * container.clientHeight, 40);
    
    setThumbHeight(newThumbHeight);

    const maxScroll = content.scrollHeight - container.clientHeight;
    const newThumbPosition = maxScroll > 0
      ? (content.scrollTop / maxScroll) * (container.clientHeight - newThumbHeight)
      : 0;

    setThumbPosition(newThumbPosition);
    lastPositionRef.current = newThumbPosition;
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
    lastPositionRef.current = newThumbPosition;
    showScrollbar();
  }, [showScrollbar, thumbHeight, isDragging]);

  // Начало перетаскивания ползунка
  const startDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const thumbRect = thumbRef.current?.getBoundingClientRect();
    if (!thumbRect) return;
    
    startYRef.current = e.clientY;
    startThumbPositionRef.current = thumbPosition;
    touchOffsetYRef.current = e.clientY - thumbRect.top;
    isTouchDeviceRef.current = false;
    
    startDragCommon();
  }, [thumbPosition]);

  // Начало перетаскивания для touch
  const startTouchDrag = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) return;
    
    const thumbRect = thumbRef.current?.getBoundingClientRect();
    if (!thumbRect) return;
    
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    startThumbPositionRef.current = thumbPosition;
    touchOffsetYRef.current = touch.clientY - thumbRect.top;
    isTouchDeviceRef.current = true;
    
    startDragCommon();
  }, [thumbPosition]);

  // Общая логика начала перетаскивания
  const startDragCommon = useCallback(() => {
    setIsDragging(true);
    setIsVisible(true);
    
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    startScrollTopRef.current = contentRef.current?.scrollTop || 0;
    document.body.style.userSelect = 'none';
  }, []);

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
      if (e.touches.length === 0) return;
      handleDragCommon(e.touches[0].clientY);
    };

    const handleDragCommon = (clientY: number) => {
      if (!containerRef.current || !contentRef.current) return;

      const container = containerRef.current;
      const content = contentRef.current;
      const containerRect = container.getBoundingClientRect();
      const maxScroll = content.scrollHeight - container.clientHeight;
      const trackHeight = container.clientHeight - thumbHeight;

      // Рассчитываем новую позицию ползунка с учетом смещения
      const thumbTop = clientY - containerRect.top - touchOffsetYRef.current;
      let newThumbPosition = Math.max(0, Math.min(trackHeight, thumbTop));
      
      // Рассчитываем соответствующий scrollTop
      if (trackHeight > 0 && maxScroll > 0) {
        const scrollPercentage = newThumbPosition / trackHeight;
        content.scrollTop = scrollPercentage * maxScroll;
      }

      // Обновляем позицию ползунка
      setThumbPosition(newThumbPosition);
      lastPositionRef.current = newThumbPosition;
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
  }, [isDragging, thumbHeight, isThumbHovered, showScrollbar]);

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

  // Сохраняем позицию для анимации
  useEffect(() => {
    lastPositionRef.current = thumbPosition;
  }, [thumbPosition]);

  return (
    <div
      ref={containerRef}
      className={`${styles.appleScrollContainer} ${className}`}
    >
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