import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface HolonetPost {
  id: number;
  title: string;
  body: string;
  category: string;
  createdAt: string;
  author: { username: string };
}

interface PostsResponse {
  data: HolonetPost[];
  total: number;
  page: number;
}

const CATEGORIES = ['NEWS', 'ROLEPLAY', 'TRADE', 'RECRUITMENT'] as const;

const CATEGORY_STYLES: Record<string, string> = {
  NEWS: 'bg-blue-900/30 text-blue-300',
  ROLEPLAY: 'bg-purple-900/30 text-purple-300',
  TRADE: 'bg-green-900/30 text-green-300',
  RECRUITMENT: 'bg-orange-900/30 text-orange-300',
};

export function HolonetPage() {
  const [posts, setPosts] = useState<HolonetPost[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [selected, setSelected] = useState<HolonetPost | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState({ title: '', body: '', category: 'NEWS' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const params = filter ? `?category=${filter}` : '';
    const res = await api.get<PostsResponse>(`/holonet${params}`);
    setPosts(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const createPost = async () => {
    await api.post('/holonet', compose);
    setCompose({ title: '', body: '', category: 'NEWS' });
    setShowCompose(false);
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-swu-accent">HoloNet</h1>
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="px-3 py-1 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm rounded hover:bg-swu-accent/30 transition-colors"
        >
          {showCompose ? 'Cancel' : 'New Post'}
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('')}
          className={`px-2 py-1 text-xs rounded border transition-colors ${
            !filter ? 'border-swu-accent text-swu-accent' : 'border-swu-border text-swu-muted hover:border-swu-primary'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              filter === cat ? 'border-swu-accent text-swu-accent' : 'border-swu-border text-swu-muted hover:border-swu-primary'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Compose */}
      {showCompose && (
        <div className="bg-swu-surface border border-swu-border rounded-lg p-4 mb-4 max-w-lg space-y-3">
          <input
            value={compose.title}
            onChange={(e) => setCompose({ ...compose, title: e.target.value })}
            placeholder="Title"
            className="w-full bg-swu-bg border border-swu-border rounded px-3 py-1.5 text-sm text-swu-primary"
          />
          <select
            value={compose.category}
            onChange={(e) => setCompose({ ...compose, category: e.target.value })}
            className="bg-swu-bg border border-swu-border rounded px-3 py-1.5 text-sm text-swu-primary"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <textarea
            value={compose.body}
            onChange={(e) => setCompose({ ...compose, body: e.target.value })}
            rows={4}
            placeholder="Write your post..."
            className="w-full bg-swu-bg border border-swu-border rounded px-3 py-1.5 text-sm text-swu-primary resize-none"
          />
          <button
            onClick={createPost}
            className="px-4 py-1.5 bg-swu-accent/20 border border-swu-accent text-swu-accent text-sm rounded hover:bg-swu-accent/30 transition-colors"
          >
            Post
          </button>
        </div>
      )}

      {/* Posts */}
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          {loading ? (
            <p className="text-swu-muted text-sm">Loading...</p>
          ) : posts.length === 0 ? (
            <p className="text-swu-muted text-sm">No posts yet.</p>
          ) : (
            posts.map((post) => (
              <button
                key={post.id}
                onClick={() => setSelected(post)}
                className={`w-full text-left bg-swu-surface border rounded-lg p-3 transition-colors hover:border-swu-primary ${
                  selected?.id === post.id ? 'border-swu-accent' : 'border-swu-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_STYLES[post.category] || ''}`}>
                    {post.category}
                  </span>
                  <span className="text-sm font-bold text-swu-primary">{post.title}</span>
                </div>
                <p className="text-[10px] text-swu-muted">
                  by {post.author.username} · {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="w-96 bg-swu-surface border border-swu-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_STYLES[selected.category] || ''}`}>
                {selected.category}
              </span>
            </div>
            <h2 className="text-lg font-bold text-swu-primary mb-1">{selected.title}</h2>
            <p className="text-[10px] text-swu-muted mb-3">
              by {selected.author.username} · {new Date(selected.createdAt).toLocaleString()}
            </p>
            <div className="text-sm text-swu-muted whitespace-pre-wrap">{selected.body}</div>
          </div>
        )}
      </div>
    </div>
  );
}
