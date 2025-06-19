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

  // Начало перетаскивания ползунка
  const startDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    
    // Отменяем скрытие скроллбара
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    // Запоминаем начальные позиции
    startYRef.current = e.clientY;
    startThumbPositionRef.current = thumbPosition;
    startScrollTopRef.current = contentRef.current?.scrollTop || 0;

    // Показываем скроллбар при начале перетаскивания
    setIsVisible(true);

    // Блокируем выделение текста на странице
    document.body.style.userSelect = 'none';
  }, [thumbPosition]);

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

    const handleDrag = (e: MouseEvent) => {
      if (!containerRef.current || !contentRef.current) return;

      e.preventDefault();

      const container = containerRef.current;
      const content = contentRef.current;
      const maxScroll = content.scrollHeight - container.clientHeight;
      const trackHeight = container.clientHeight - thumbHeight;

      // Рассчитываем смещение курсора от начальной точки
      const deltaY = e.clientY - startYRef.current;
      
      // Вычисляем новую позицию ползунка с ограничениями
      let newThumbPosition = startThumbPositionRef.current + deltaY;
      newThumbPosition = Math.max(0, Math.min(trackHeight, newThumbPosition));
      
      // Рассчитываем соответствующий scrollTop
      if (trackHeight > 0 && maxScroll > 0) {
        const scrollPercentage = newThumbPosition / trackHeight;
        content.scrollTop = scrollPercentage * maxScroll;
      }

      // Принудительно обновляем позицию ползунка
      setThumbPosition(newThumbPosition);
    };

    const stopDrag = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
      
      // После перетаскивания не скрываем, если курсор над ползунком
      if (isThumbHovered) {
        // Отменяем любой активный таймер скрытия
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
      } else {
        // Если курсор не над ползунком, запускаем таймер скрытия
        showScrollbar();
      }
    };

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('mouseleave', stopDrag);

    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('mouseleave', stopDrag);
    };
  }, [isDragging, thumbHeight, isThumbHovered, showScrollbar]);

  // Обработчики для ползунка
  const handleThumbEnter = useCallback(() => {
    setIsThumbHovered(true);
    
    // Отменяем таймер скрытия при наведении на ползунок
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  }, []);

  const handleThumbLeave = useCallback(() => {
    setIsThumbHovered(false);
    
    // При уходе курсора запускаем таймер скрытия
    if (isVisible && !isDragging) {
      showScrollbar();
    }
  }, [isVisible, isDragging, showScrollbar]);

  // Эффект для очистки таймера при размонтировании
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

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
          opacity: isVisible || isDragging ? 1 : 0,
          transition: 'opacity 0.2s ease',
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
          }}
          onMouseDown={startDrag}
          onMouseEnter={handleThumbEnter}
          onMouseLeave={handleThumbLeave}
        />
      </div>
    </div>
  );
};

export default AppleScrollbar;