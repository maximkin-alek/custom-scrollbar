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
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isThumbHovered, setIsThumbHovered] = useState(false);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbPosition, setThumbPosition] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startYRef = useRef(0);
  const startThumbTopRef = useRef(0);

  const calculateThumb = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;

    const container = containerRef.current;
    const content = contentRef.current;
    const scrollRatio = container.clientHeight / content.scrollHeight;
    const newThumbH = Math.max(scrollRatio * container.clientHeight, 40);
    setThumbHeight(newThumbH);

    const maxScroll = content.scrollHeight - container.clientHeight;
    const newPos = maxScroll > 0
      ? (content.scrollTop / maxScroll) * (container.clientHeight - newThumbH)
      : 0;
    setThumbPosition(newPos);
  }, []);

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(prev => {
        if (!isThumbHovered && !isDragging) {
          return false;
        }
        return prev;
      });
    }, fadeTimeout);
  }, [fadeTimeout, isThumbHovered, isDragging]);

  const showScrollbar = useCallback(() => {
    clearHideTimeout();
    setIsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const container = containerRef.current;
    const content = contentRef.current;
    const maxScroll = content.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) return;

    const newPos = (content.scrollTop / maxScroll) * (container.clientHeight - thumbHeight);
    setThumbPosition(newPos);
    showScrollbar();
  }, [thumbHeight, showScrollbar]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !contentRef.current) return;
    e.preventDefault();
    startYRef.current = e.clientY;
    startThumbTopRef.current = thumbPosition;
    setIsDragging(true);
    showScrollbar();
    document.body.style.userSelect = 'none';
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging || !containerRef.current || !contentRef.current) return;
      const container = containerRef.current;
      const content = contentRef.current;
      const maxScroll = content.scrollHeight - container.clientHeight;
      const trackH = container.clientHeight - thumbHeight;
      const delta = e.clientY - startYRef.current;
      let newTop = startThumbTopRef.current + delta;
      newTop = Math.max(0, Math.min(trackH, newTop));
      content.scrollTop = (newTop / trackH) * maxScroll;
      setThumbPosition(newTop);
    },
    [isDragging, thumbHeight]
  );

  const stopDragging = useCallback(() => {
    setIsDragging(false);
    document.body.style.userSelect = '';
    if (!isThumbHovered) {
      setIsVisible(false);
    } else {
      scheduleHide();
    }
  }, [isThumbHovered, scheduleHide]);

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
    if (!isDragging) return;
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', stopDragging);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', stopDragging);
    };
  }, [isDragging, handlePointerMove, stopDragging]);

  useEffect(() => {
    const handleDocLeave = (e: MouseEvent) => {
      if (!isDragging && !isThumbHovered) {
        setIsVisible(false);
      }
    };
    document.addEventListener('mouseleave', handleDocLeave);
    return () => {
      document.removeEventListener('mouseleave', handleDocLeave);
    };
  }, [isDragging, isThumbHovered]);

  return (
    <div ref={containerRef} className={`${styles.appleScrollContainer} ${className}`}>
      <div ref={contentRef} className={styles.appleScrollContent}>
        {children}
      </div>
      <div
        className={styles.appleScrollbarTrack}
        style={{
          width: scrollbarWidth + 4,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.2s ease',
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
        onMouseLeave={() => {
          if (!isDragging && !isThumbHovered) setIsVisible(false);
        }}
      >
        <div
          ref={thumbRef}
          className={styles.appleScrollbarThumb}
          style={{
            width: scrollbarWidth,
            height: thumbHeight,
            borderRadius: scrollbarWidth / 2,
            transform: `translateY(${thumbPosition}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease',
            touchAction: 'none',
            pointerEvents: isVisible ? 'auto' : 'none',
          }}
          onPointerDown={handlePointerDown}
          onMouseEnter={() => {
            setIsThumbHovered(true);
            clearHideTimeout();
          }}
          onMouseLeave={() => {
            setIsThumbHovered(false);
            if (!isDragging) setIsVisible(false);
            else scheduleHide();
          }}
        />
      </div>
    </div>
  );
};

export default AppleScrollbar;
