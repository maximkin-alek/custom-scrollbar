import { ScrollbarsState, ScrollbarAction } from './types';

export const scrollbarsReducer = (
  state: ScrollbarsState,
  action: ScrollbarAction,
): ScrollbarsState => {
  switch (action.type) {
    case 'SET_DRAGGING':
      return {
        ...state,
        [action.orientation]: {
          ...state[action.orientation],
          isDragging: action.value,
          ...(action.startPosition !== undefined && {
            startPosition: action.startPosition,
          }),
          ...(action.startThumbPosition !== undefined && {
            startThumbPosition: action.startThumbPosition,
          }),
        },
      };

    case 'SET_HOVERED':
      return {
        ...state,
        [action.orientation]: {
          ...state[action.orientation],
          isHovered: action.value,
        },
      };

    case 'SET_THUMB_SIZE':
      return {
        ...state,
        [action.orientation]: {
          ...state[action.orientation],
          thumbSize: action.value,
        },
      };

    case 'SET_THUMB_POSITION':
      return {
        ...state,
        [action.orientation]: {
          ...state[action.orientation],
          thumbPosition: action.value,
        },
      };

    default:
      return state;
  }
};
