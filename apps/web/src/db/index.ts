import Dexie, { type EntityTable } from 'dexie';

// Define the interface for a Bookmark
interface Bookmark {
    id: string;
    title: string;
    url: string;
    dateAdded: number;
    domain: string;
    folderId?: string;
    visualColor?: string; // Hex code for color coding
}

// THE BACKEND (Local Database)
// This class acts as your "Server" & "Database" combined.
const db = new Dexie('BookmarkifyDB') as Dexie & {
    bookmarks: EntityTable<Bookmark, 'id'>;
};

// Schema Definition
db.version(1).stores({
    bookmarks: 'id, domain, dateAdded, folderId' // Indexed fields for fast searching
});

export type { Bookmark };
export { db };
