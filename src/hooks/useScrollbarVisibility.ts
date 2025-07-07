import { useState, useRef, useCallback, useEffect } from 'react';

export const useScrollbarVisibility = (
  fadeTimeout: number,
  getScrollbarState: () => {
    verticalHovered: boolean;
    horizontalHovered: boolean;
    verticalDragging: boolean;
    horizontalDragging: boolean;
  }
) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Очистка таймаута
  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Принудительный показ скроллбаров
  const forceShow = useCallback(() => {
    setIsVisible(true);
    clearTimeoutRef();
  }, [clearTimeoutRef]);

  // Скрытие с проверкой состояния
  const scheduleHide = useCallback(() => {
    clearTimeoutRef();
    
    timeoutRef.current = setTimeout(() => {
      const state = getScrollbarState();
      const shouldHide = 
        !state.verticalHovered && 
        !state.horizontalHovered && 
        !state.verticalDragging && 
        !state.horizontalDragging;
      
      if (shouldHide) {
        setIsVisible(false);
      }
    }, fadeTimeout);
  }, [fadeTimeout, getScrollbarState, clearTimeoutRef]);

  // Комбинированный показ + планирование скрытия
  const showAndScheduleHide = useCallback(() => {
    forceShow();
    scheduleHide();
  }, [forceShow, scheduleHide]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => clearTimeoutRef();
  }, [clearTimeoutRef]);

  return {
    isScrollbarVisible: isVisible,
    forceShow,
    scheduleHide,
    showScrollbar: showAndScheduleHide,
    clearHideTimeout: clearTimeoutRef,
  };
};