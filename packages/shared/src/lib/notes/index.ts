export interface NoteDto {
  id: number;
  title: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveNoteRequest {
  title: string;
  text: string;
}

export interface DeleteNotesRequest {
  ids: number[];
}
