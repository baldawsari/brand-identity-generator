import type { Chat } from "@google/genai";

export interface ColorInfo {
  hex: string;
  name: string;
  usage: string;
}

export interface FontPair {
  header: string;
  body: string;
  notes: string;
}

export interface DesignSystem {
  layoutStyle: 'minimal' | 'bold' | 'corporate';
  titleAlignment: 'left' | 'center' | 'right';
  borderRadius: number;
  accentPosition: 'top' | 'bottom' | 'left' | 'right';
}

export interface LogoVariations {
  horizontal?: string;
  vertical?: string;
  iconOnly?: string;
}

export interface BrandIdentity {
  companyName: string;
  logo: {
    prompt: string;
    style: string;
  };
  logoConcepts: string[];
  colorPalette: ColorInfo[];
  fontPairings: FontPair;
  designSystem?: DesignSystem;
  logoImage?: string; // Optional: for user-uploaded logos or primary generated logo
  logoMark?: string; // AI-generated icon only (no text)
  logoVariations?: LogoVariations; // Code-generated composite logos
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export interface ChatSession {
  chat: Chat;
  history: ChatMessage[];
}

export interface BrandAssets {
  businessCardUrl: string;
  letterheadUrl: string;
  socialPostUrl: string;
}