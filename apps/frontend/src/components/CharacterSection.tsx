import { useState, type FormEvent } from 'react';
import type { SaveUserCharacterDto, UserCharacterDto } from '@swuniverse/shared';
import { api } from '../services/api';
import { BbCodeText } from './BbCodeText';

export function CharacterSection({ characters, owner, editing, onEdit, onChange }: {
  characters: UserCharacterDto[];
  owner: boolean;
  editing: UserCharacterDto | 'new' | null;
  onEdit: (value: UserCharacterDto | 'new' | null) => void;
  onChange: (value: UserCharacterDto[]) => void;
}) {
  return <section className="rounded-lg border border-swu-border bg-swu-surface p-4">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-bold text-swu-primary">Charaktere</h2>
      {owner && <button type="button" onClick={() => onEdit('new')} className="text-xs text-swu-accent">Charakter anlegen</button>}
    </div>
    {characters.length === 0 ? <p className="text-sm italic text-swu-muted">Keine Charaktere</p> : <div className="space-y-3">{characters.map((character) => <article key={character.id} className="border border-swu-border bg-swu-bg p-3">
      <div className="flex gap-3">
        {character.avatar ? <img src={character.avatar} alt={`${character.name} Avatar`} className="size-20 rounded object-cover" /> : <div aria-label={`${character.name} Avatar`} className="flex size-20 items-center justify-center rounded bg-swu-surface text-2xl text-swu-muted">{character.name[0]}</div>}
        <div className="min-w-0 flex-1"><h3 className="font-bold text-swu-primary">{character.name}</h3><BbCodeText text={character.description} className="whitespace-pre-wrap text-sm" /></div>
        {owner && <div className="flex flex-col gap-2"><button type="button" aria-label={`${character.name} bearbeiten`} onClick={() => onEdit(character)} className="text-xs text-swu-accent">Bearbeiten</button><button type="button" aria-label={`${character.name} löschen`} onClick={async () => { if (window.confirm(`${character.name} wirklich löschen?`)) { await api.delete(`/rpg/characters/${character.id}`); onChange(characters.filter((item) => item.id !== character.id)); } }} className="text-xs text-swu-danger">Löschen</button></div>}
      </div>
    </article>)}</div>}
    {editing && <CharacterForm character={editing === 'new' ? null : editing} onCancel={() => onEdit(null)} onSave={(saved) => { onChange(editing === 'new' ? [...characters, saved] : characters.map((item) => item.id === saved.id ? saved : item)); onEdit(null); }} />}
  </section>;
}

function CharacterForm({ character, onCancel, onSave }: { character: UserCharacterDto | null; onCancel: () => void; onSave: (value: UserCharacterDto) => void }) {
  const [name, setName] = useState(character?.name ?? '');
  const [description, setDescription] = useState(character?.description ?? '');
  const [avatar, setAvatar] = useState<string | null>(character?.avatar ?? null);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const body: SaveUserCharacterDto = { name, description, avatar };
      onSave(character ? await api.patch<UserCharacterDto>(`/rpg/characters/${character.id}`, body) : await api.post<UserCharacterDto>('/rpg/characters', body));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Charakter konnte nicht gespeichert werden'); }
  }
  return <form onSubmit={submit} className="mt-4 space-y-3 border-t border-swu-border pt-4">
    <label className="block text-xs text-swu-muted">Charaktername<input aria-label="Charaktername" required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full border border-swu-border bg-swu-bg p-2 text-swu-text" /></label>
    <label className="block text-xs text-swu-muted">Beschreibung<textarea aria-label="Charakterbeschreibung" maxLength={5000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full border border-swu-border bg-swu-bg p-2 text-swu-text" /></label>
    <label className="block text-xs text-swu-muted">Avatar<input aria-label="Charakteravatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 250 * 1024) { setError('Der Avatar darf höchstens 250 KB groß sein'); return; } const reader = new FileReader(); reader.onload = () => setAvatar(String(reader.result)); reader.readAsDataURL(file); }} className="mt-1 block" /></label>
    {error && <p className="text-xs text-swu-danger">{error}</p>}
    <div className="flex gap-2"><button type="submit" className="border border-swu-accent px-3 py-1 text-sm text-swu-accent">Speichern</button><button type="button" onClick={onCancel} className="px-3 py-1 text-sm text-swu-muted">Abbrechen</button></div>
  </form>;
}
