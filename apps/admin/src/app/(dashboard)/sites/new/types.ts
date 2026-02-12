// ===========================================
// AI Designer — Types
// ===========================================

export type MoodboardItemType =
  | "color_palette"
  | "typography"
  | "style_keyword"
  | "uploaded_image"
  | "layout_preference"
  | "design_token"
  | "mood_description";

export interface ColorPaletteItem {
  type: "color_palette";
  id: string;
  colors: string[];
  name: string;
  pinned?: boolean;
}

export interface TypographyItem {
  type: "typography";
  id: string;
  heading: string;
  body: string;
  vibe: string;
  pinned?: boolean;
}

export interface StyleKeywordItem {
  type: "style_keyword";
  id: string;
  keyword: string;
  category: "mood" | "density" | "shape" | "feel";
  pinned?: boolean;
}

export interface UploadedImageItem {
  type: "uploaded_image";
  id: string;
  url: string;
  filename: string;
  analysis?: ImageAnalysis;
  pinned?: boolean;
}

export interface LayoutPreferenceItem {
  type: "layout_preference";
  id: string;
  key: string;
  value: string;
  pinned?: boolean;
}

export interface DesignTokenItem {
  type: "design_token";
  id: string;
  token: string;
  value: string;
  description: string;
  pinned?: boolean;
}

export interface MoodDescriptionItem {
  type: "mood_description";
  id: string;
  description: string;
  pinned?: boolean;
}

export type MoodboardItem =
  | ColorPaletteItem
  | TypographyItem
  | StyleKeywordItem
  | UploadedImageItem
  | LayoutPreferenceItem
  | DesignTokenItem
  | MoodDescriptionItem;

export interface ImageAnalysis {
  dominantColors: string[];
  mood: string[];
  typography: string;
  layout: string;
  summary: string;
}

export interface DesignDirection {
  colorMode: "light" | "dark";
  primaryColor: string;
  secondaryColor: string;
  fontHeading: string;
  fontBody: string;
  heroStyle: string;
  headerStyle: string;
  footerStyle: string;
  designTokens: Record<string, string>;
  confidence: number;
  summary: string;
  logoUrl?: string | null;
  blogPreferences?: { topics?: string[]; style?: string };
}

export interface Moodboard {
  items: MoodboardItem[];
  designDirection: DesignDirection | null;
}

export interface SiteReference {
  url: string;
  title: string;
  description: string;
}

export interface DesignerMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  references?: SiteReference[];
  timestamp: Date;
}

export interface DesignerState {
  messages: DesignerMessage[];
  moodboard: Moodboard;
  logoUrl: string | null;
  isLoading: boolean;
  isGenerating: boolean;
  isUploading: boolean;
}

export type DesignerAction =
  | { type: "ADD_USER_MESSAGE"; content: string; images?: string[] }
  | { type: "ADD_AI_MESSAGE"; content: string; references?: SiteReference[] }
  | { type: "ADD_MOODBOARD_ITEM"; item: MoodboardItem }
  | { type: "REMOVE_MOODBOARD_ITEM"; id: string }
  | { type: "TOGGLE_PIN_ITEM"; id: string }
  | { type: "UPDATE_DESIGN_DIRECTION"; direction: DesignDirection }
  | { type: "SET_LOGO_URL"; url: string | null }
  | { type: "SET_LOADING"; value: boolean }
  | { type: "SET_GENERATING"; value: boolean }
  | { type: "SET_UPLOADING"; value: boolean }
  | { type: "CLEAR_MOODBOARD" }
  | { type: "RESTORE_STATE"; messages: DesignerMessage[]; moodboard: Moodboard; logoUrl: string | null };
