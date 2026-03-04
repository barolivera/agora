export interface LumaEventData {
  title: string;
  description: string;
  date: string;        // ISO datetime-local format for the form input
  endTime?: string;    // HH:MM format (same day assumed)
  location: string;
  coverImageUrl: string;
  organizer: string;
  lumaUrl: string;
}

export interface AIEnrichment {
  category: string | null;
  tags: string[];
  summary: string | null;
  suggestedCommunities: string[];
  language: string | null;
  translatedTitle: string | null;
  translatedDescription: string | null;
}

export interface LumaImportResponse extends LumaEventData {
  ai?: AIEnrichment | null;
  aiError?: string;
}
