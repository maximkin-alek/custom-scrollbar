// Интерфейсы для типизации
export interface ScrollDimensions {
  scrollSize: number;
  clientSize: number;
  scrollPosition: number;
}

export interface ThumbCalculationResult {
  thumbSize: number;
  thumbPosition: number;
}
// Константы
const MIN_THUMB_SIZE = 40;
const TRACK_PADDING = 10;

/**
 * Рассчитывает параметры ползунка для заданного направления
 * @param containerSize - Размер контейнера (ширина/высота)
 * @param scrollbarWidth - Толщина скроллбара
 * @param scrollSize - Полный размер контента (scrollHeight/scrollWidth)
 * @param clientSize - Видимая область контейнера (clientHeight/clientWidth)
 * @param scrollPosition - Текущая позиция скролла (scrollTop/scrollLeft)
 * @returns {ThumbCalculationResult} Размер и позиция ползунка
 */
export const calculateThumbMetrics = (
  containerSize: number,
  scrollbarWidth: number,
  scrollSize: number,
  clientSize: number,
  scrollPosition: number
): ThumbCalculationResult => {
  // Если контент не требует скролла
  if (scrollSize <= clientSize) {
    return { thumbSize: 0, thumbPosition: 0 };
  }

  const trackSize = containerSize - (scrollbarWidth + TRACK_PADDING);
  const maxScroll = Math.max(0, scrollSize - clientSize);
  
  // Рассчитываем размер ползунка
  const sizeRatio = clientSize / scrollSize;
  const thumbSize = Math.max(sizeRatio * trackSize, MIN_THUMB_SIZE);

  // Рассчитываем позицию ползунка
  const thumbMaxPosition = trackSize - thumbSize;
  let thumbPosition = (scrollPosition / maxScroll) * thumbMaxPosition;
  thumbPosition = Math.max(0, Math.min(thumbMaxPosition, thumbPosition));

  return { thumbSize, thumbPosition };
};

/**
 * Рассчитывает позицию контента при перетаскивании ползунка
 * @param dragDelta - Смещение курсора при перетаскивании
 * @param startThumbPosition - Начальная позиция ползунка
 * @param trackSize - Размер трека
 * @param thumbSize - Размер ползунка
 * @param maxScroll - Максимальное значение скролла
 * @returns Новое значение скролла контента
 */
export const calculateScrollFromDrag = (
  dragDelta: number,
  startThumbPosition: number,
  trackSize: number,
  thumbSize: number,
  maxScroll: number
): number => {
  const availableSpace = trackSize - thumbSize;
  if (availableSpace <= 0 || maxScroll <= 0) return 0;
  
  const newThumbPos = Math.max(0, Math.min(
    startThumbPosition + dragDelta,
    availableSpace
  ));
  
  const scrollPercentage = newThumbPos / availableSpace;
  return scrollPercentage * maxScroll;
};