import { 
  useCallback, 
  useEffect 
} from 'react';
import { 
  calculateScrollFromDrag 
} from '../utils/scrollbarUtils.ts';
import { 
  ScrollbarState, 
  ScrollbarAction 
} from '../types';

type UseScrollbarDragProps = {
  orientation: 'vertical' | 'horizontal';
  scrollbar: ScrollbarState;
  scrollbarWidth: number;
  containerRef: React.RefObject<HTMLDivElement>;
  contentRef: React.RefObject<HTMLDivElement>;
  dispatch: React.Dispatch<ScrollbarAction>;
  visibility: {
    showScrollbar: () => void;
    scheduleHide: () => void;
    clearHideTimeout: () => void;
  };
  lastDragUpdateRef: React.MutableRefObject<{ 
    vertical: number; 
    horizontal: number 
  }>;
  isUpdatingFromDragRef: React.MutableRefObject<boolean>;
  thumbRef: React.RefObject<HTMLDivElement>;
};

export const useScrollbarDrag = ({
  orientation,
  scrollbar,
  scrollbarWidth,
  containerRef,
  contentRef,
  dispatch,
  visibility,
  lastDragUpdateRef,
  isUpdatingFromDragRef,
  thumbRef
}: UseScrollbarDragProps) => {
  // Обработчик перемещения указателя
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!scrollbar.isDragging || !containerRef.current || !contentRef.current) return;

    const isVertical = orientation === 'vertical';
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
      maxScroll
    );

    isUpdatingFromDragRef.current = true;
    content[scrollProp] = newScrollPos;

    const availableSpace = trackSize - scrollbar.thumbSize;
    const thumbPosition = maxScroll > 0 
      ? (newScrollPos / maxScroll) * availableSpace 
      : 0;

    // Прямое обновление позиции ползунка
    if (thumbRef.current) {
      if (isVertical) {
        thumbRef.current.style.transform = `translateY(${thumbPosition}px)`;
        lastDragUpdateRef.current.vertical = thumbPosition;
      } else {
        thumbRef.current.style.transform = `translateX(${thumbPosition}px)`;
        lastDragUpdateRef.current.horizontal = thumbPosition;
      }
    }

    setTimeout(() => {
      isUpdatingFromDragRef.current = false;
    }, 0);
  }, [
    scrollbar, 
    scrollbarWidth,
    orientation,
    containerRef,
    contentRef,
    thumbRef,
    isUpdatingFromDragRef,
    lastDragUpdateRef
  ]);

  // Остановка перетаскивания
  const stopDragging = useCallback(() => {
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
  }, [dispatch, visibility, orientation, lastDragUpdateRef]);

  // Обработчик нажатия на ползунок
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !contentRef.current) return;
    e.preventDefault();

    const position = orientation === 'vertical' 
      ? e.clientY 
      : e.clientX;
    
    dispatch({
      type: 'SET_DRAGGING',
      value: true,
      orientation,
      startPosition: position,
      startThumbPosition: scrollbar.thumbPosition,
    });

    visibility.showScrollbar();
    document.body.style.userSelect = 'none';
  }, [
    containerRef, 
    contentRef, 
    dispatch, 
    orientation, 
    scrollbar.thumbPosition, 
    visibility
  ]);

  // Эффект для подписки на глобальные события
  useEffect(() => {
    if (!scrollbar.isDragging) return;

    const handleMove = (e: PointerEvent) => handlePointerMove(e);
    const handleUp = () => stopDragging();

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('pointercancel', handleUp);

    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
    };
  }, [scrollbar.isDragging, handlePointerMove, stopDragging]);

  return { handlePointerDown };
};