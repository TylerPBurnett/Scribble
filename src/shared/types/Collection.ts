export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  noteIds: string[]; // Array of note IDs in this collection
  isDefault?: boolean; // For the "All" collection
  sortOrder?: number; // For custom ordering
}

export interface CollectionWithNoteCount extends Collection {
  noteCount: number;
}

export type CollectionCreateInput = Omit<Collection, 'id' | 'createdAt' | 'updatedAt' | 'noteIds'>;
export type CollectionUpdateInput = Partial<Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>>;