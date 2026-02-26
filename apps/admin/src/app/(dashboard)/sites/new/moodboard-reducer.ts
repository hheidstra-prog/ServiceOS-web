import type { DesignerState, DesignerAction } from "./types";

const STORAGE_KEY = "servible-designer-session";

export const initialDesignerState: DesignerState = {
  messages: [],
  moodboard: {
    items: [],
    designDirection: null,
  },
  logoUrl: null,
  isLoading: false,
  isGenerating: false,
  isUploading: false,
};

/** Save messages and moodboard to localStorage. */
function saveToStorage(state: DesignerState) {
  try {
    const data = {
      messages: state.messages,
      moodboard: state.moodboard,
      logoUrl: state.logoUrl,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/** Load saved session from localStorage. Returns null if nothing saved. */
export function loadFromStorage(): { messages: DesignerState["messages"]; moodboard: DesignerState["moodboard"]; logoUrl: string | null } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.messages || !data.moodboard) return null;
    // Rehydrate Date objects
    data.messages = data.messages.map((m: Record<string, unknown>) => ({
      ...m,
      timestamp: new Date(m.timestamp as string),
    }));
    return { ...data, logoUrl: data.logoUrl ?? null };
  } catch {
    return null;
  }
}

/** Clear saved session from localStorage. */
export function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function designerReducer(
  state: DesignerState,
  action: DesignerAction
): DesignerState {
  let next: DesignerState;

  switch (action.type) {
    case "ADD_USER_MESSAGE":
      next = {
        ...state,
        messages: [
          ...state.messages,
          {
            id: `user-${Date.now()}`,
            role: "user",
            content: action.content,
            images: action.images,
            timestamp: new Date(),
          },
        ],
      };
      saveToStorage(next);
      return next;

    case "ADD_AI_MESSAGE":
      next = {
        ...state,
        messages: [
          ...state.messages,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: action.content,
            references: action.references,
            timestamp: new Date(),
          },
        ],
      };
      saveToStorage(next);
      return next;

    case "ADD_MOODBOARD_ITEM":
      next = {
        ...state,
        moodboard: {
          ...state.moodboard,
          items: [...state.moodboard.items, action.item],
        },
      };
      saveToStorage(next);
      return next;

    case "REMOVE_MOODBOARD_ITEM":
      next = {
        ...state,
        moodboard: {
          ...state.moodboard,
          items: state.moodboard.items.filter((i) => i.id !== action.id),
        },
      };
      saveToStorage(next);
      return next;

    case "TOGGLE_PIN_ITEM":
      next = {
        ...state,
        moodboard: {
          ...state.moodboard,
          items: state.moodboard.items.map((i) =>
            i.id === action.id ? { ...i, pinned: !i.pinned } : i
          ),
        },
      };
      saveToStorage(next);
      return next;

    case "UPDATE_DESIGN_DIRECTION":
      next = {
        ...state,
        moodboard: {
          ...state.moodboard,
          designDirection: action.direction,
        },
      };
      saveToStorage(next);
      return next;

    case "SET_LOGO_URL":
      next = {
        ...state,
        logoUrl: action.url,
      };
      saveToStorage(next);
      return next;

    case "RESTORE_STATE":
      return {
        ...state,
        messages: action.messages,
        moodboard: action.moodboard,
        logoUrl: action.logoUrl,
      };

    case "SET_LOADING":
      return { ...state, isLoading: action.value };

    case "SET_GENERATING":
      return { ...state, isGenerating: action.value };

    case "SET_UPLOADING":
      return { ...state, isUploading: action.value };

    case "CLEAR_MOODBOARD":
      next = {
        ...state,
        moodboard: { items: [], designDirection: null },
      };
      saveToStorage(next);
      return next;

    default:
      return state;
  }
}
