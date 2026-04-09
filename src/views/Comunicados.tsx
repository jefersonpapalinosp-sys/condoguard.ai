import { useEffect, useRef, useState } from 'react';
import {
  fetchComunicados,
  createComunicado,
  archiveComunicado,
  deleteComunicado,
  type Comunicado,
  type ComunicadoCategory,
  type ComunicadoStatus,
} from '../services/comunicadosService';
import { useAuth } from '../features/auth/context/AuthContext';
import { LoadingState } from '../shared/ui/states/LoadingState';
import { ErrorState } from '../shared/ui/states/ErrorState';
import { EmptyState } from '../shared/ui/states/EmptyState';

// ─── Styles ───────────────────────────────────────────────────────────────────

const CAT_STYLE: Record<ComunicadoCategory, { badge: string; icon: string; label: string }> = {
  urgente:   { badge: 'bg-error-container text-on-error-container',                      icon: 'priority_high',  label: 'Urgente'    },
  assembleia:{ badge: 'bg-primary/15 text-primary',                                      icon: 'groups',         label: 'Assembleia' },
  manutencao:{ badge: 'bg-secondary-container/60 text-on-secondary-container',            icon: 'build',          label: 'Manutenção' },
  financeiro:{ badge: 'bg-tertiary-fixed-dim/30 text-on-tertiary-fixed-variant',          icon: 'payments',       label: 'Financeiro' },
  aviso:     { badge: 'bg-surface-container-highest text-on-surface-variant',             icon: 'info',           label: 'Aviso'      },
};

const STATUS_FILTER: Array<{ id: ComunicadoStatus | 'all'; label: string }> = [
  { id: 'all',      label: 'Todos'     },
  { id: 'ativo',    label: 'Ativos'    },
  { id: 'arquivado',label: 'Arquivados'},
];

const CATEGORIES: Array<{ id: ComunicadoCategory; label: string }> = [
  { id: 'aviso',     label: 'Aviso'      },
  { id: 'urgente',   label: 'Urgente'    },
  { id: 'assembleia',label: 'Assembleia' },
  { id: 'manutencao',label: 'Manutenção' },
  { id: 'financeiro',label: 'Financeiro' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

// ─── Create form (modal) ──────────────────────────────────────────────────────

type CreateFormProps = {
  onCreated: (c: Comunicado) => void;
  onClose: () => void;
};

function CreateModal({ onCreated, onClose }: CreateFormProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<ComunicadoCategory>('aviso');
  const [targetRole, setTargetRole] = useState<'all' | 'morador' | 'sindico'>('all');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { setErr('Título e corpo são obrigatórios.'); return; }
    setSaving(true);
    setErr(null);
    try {
      const item = await createComunicado({ title: title.trim(), body: body.trim(), category, targetRole });
      onCreated(item);
    } catch {
      setErr('Falha ao criar comunicado. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-lg rounded-3xl bg-surface border border-outline-variant/20 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
          <h2 className="font-headline font-bold text-lg">Novo Comunicado</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1.5">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Manutenção dos elevadores — Bloco A"
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-highest px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1.5">Mensagem</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escreva o comunicado completo aqui..."
              className="w-full resize-none rounded-xl border border-outline-variant/40 bg-surface-container-highest px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1.5">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ComunicadoCategory)}
                className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-highest px-3 py-2.5 text-sm focus:outline-none"
              >
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1.5">Destinatário</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as 'all' | 'morador' | 'sindico')}
                className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-highest px-3 py-2.5 text-sm focus:outline-none"
              >
                <option value="all">Todos</option>
                <option value="morador">Somente moradores</option>
                <option value="sindico">Somente síndico</option>
              </select>
            </div>
          </div>

          {err && (
            <p className="text-xs text-error font-semibold">{err}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-outline-variant/40 py-2.5 text-sm font-semibold hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-on-primary disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {saving ? 'Enviando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ComunicadoCard({
  item,
  canManage,
  onArchive,
  onDelete,
}: {
  item: Comunicado;
  canManage: boolean;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cat = CAT_STYLE[item.category];
  const isArchived = item.status === 'arquivado';

  return (
    <article className={`rounded-2xl border transition-all ${isArchived ? 'border-outline-variant/20 bg-surface-container-low opacity-70' : 'border-outline-variant/25 bg-surface-container-highest shadow-sm'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cat.badge}`}>
              <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cat.badge}`}>
                  {cat.label}
                </span>
                {isArchived && (
                  <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Arquivado
                  </span>
                )}
                {item.targetRole !== 'all' && (
                  <span className="rounded-full border border-outline-variant/30 px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                    {item.targetRole === 'morador' ? 'Moradores' : 'Síndico'}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-on-surface leading-snug">{item.title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-lg p-1 hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              {expanded ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>

        {expanded && (
          <div className="mt-3 pl-11">
            <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{item.body}</p>
          </div>
        )}

        <div className="mt-3 pl-11 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[12px]">person</span>
            {item.authorName}
            <span className="mx-1 opacity-40">·</span>
            <span className="material-symbols-outlined text-[12px]">schedule</span>
            {fmtDate(item.createdAt)}
          </div>

          {canManage && !isArchived && (
            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onArchive(item.id)}
                title="Arquivar"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined text-[13px]">archive</span>
                Arquivar
              </button>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                title="Excluir"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-on-error-container hover:bg-error-container/30 transition-colors"
              >
                <span className="material-symbols-outlined text-[13px]">delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Comunicados() {
  const { role } = useAuth();
  const canManage = role === 'admin' || role === 'sindico';

  const [items, setItems] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ComunicadoStatus | 'all'>('ativo');
  const [categoryFilter, setCategoryFilter] = useState<ComunicadoCategory | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchComunicados({
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
      });
      setItems(r.items);
    } catch {
      setError('Falha ao carregar comunicados.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [statusFilter, categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(text: string, ok = true) {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function handleCreated(item: Comunicado) {
    setItems((prev) => [item, ...prev]);
    setShowCreate(false);
    showToast('Comunicado publicado com sucesso.');
  }

  async function handleArchive(id: string) {
    try {
      const updated = await archiveComunicado(id);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      showToast('Comunicado arquivado.');
    } catch {
      showToast('Falha ao arquivar.', false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este comunicado permanentemente?')) return;
    try {
      await deleteComunicado(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast('Comunicado excluído.');
    } catch {
      showToast('Falha ao excluir.', false);
    }
  }

  const activeCount = items.filter((i) => i.status === 'ativo').length;
  const urgentCount = items.filter((i) => i.category === 'urgente' && i.status === 'ativo').length;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight">Comunicados</h2>
          <p className="text-on-surface-variant mt-1">Avisos, assembleias e informações para o condomínio.</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary shadow-sm hover:opacity-90 active:scale-95 transition-all self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Novo comunicado
          </button>
        )}
      </section>

      {/* KPI strip */}
      {!loading && !error && (
        <div className="flex gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-surface-container-highest px-4 py-2.5">
            <span className="material-symbols-outlined text-[16px] text-primary">campaign</span>
            <span className="text-sm font-bold">{activeCount}</span>
            <span className="text-xs text-on-surface-variant">ativos</span>
          </div>
          {urgentCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-error-container/30 px-4 py-2.5">
              <span className="material-symbols-outlined text-[16px] text-error">priority_high</span>
              <span className="text-sm font-bold text-on-error-container">{urgentCount}</span>
              <span className="text-xs text-on-error-container">urgentes</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 rounded-xl bg-surface-container p-1">
          {STATUS_FILTER.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === f.id
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ComunicadoCategory | 'all')}
          className="rounded-xl border border-outline-variant/30 bg-surface-container-highest px-3 py-2 text-sm focus:outline-none"
        >
          <option value="all">Todas categorias</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      {/* Content */}
      {loading && <LoadingState message="Carregando comunicados..." />}
      {error && !loading && <ErrorState message={error} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState message="Nenhum comunicado encontrado para os filtros selecionados." />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <ComunicadoCard
              key={item.id}
              item={item}
              canManage={canManage}
              onArchive={(id) => void handleArchive(id)}
              onDelete={(id) => void handleDelete(id)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateModal onCreated={handleCreated} onClose={() => setShowCreate(false)} />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-xl transition-all ${
            toast.ok ? 'bg-surface-container-highest text-on-surface' : 'bg-error-container text-on-error-container'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">{toast.ok ? 'check_circle' : 'error'}</span>
          {toast.text}
        </div>
      )}
    </div>
  );
}
