import { useState, useEffect } from 'react';
import { Users, Trash2, X, AlertTriangle, ShieldCheck, User } from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../contexts/ToastContext';

export default function UserManagerModal({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [wiping, setWiping] = useState(false);
  const toast = useToast();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast(err.message || 'Erro ao carregar usuários', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadUsers();
  }, [isOpen]);

  const handleDeleteUser = async (id, username) => {
    if (username.toLowerCase() === 'admin') {
      toast('Não é possível remover a conta administradora principal', 'warning');
      return;
    }
    if (!confirm(`Deseja realmente remover o usuário "${username}"?`)) return;

    setDeletingId(id);
    try {
      await api.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast(`Usuário ${username} removido com sucesso`, 'success');
    } catch (err) {
      toast(err.message || 'Erro ao remover usuário', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleWipeAll = async () => {
    if (!confirm('Deseja excluir TODOS os usuários criados, mantendo apenas o administrador principal (admin)?')) return;

    setWiping(true);
    try {
      await api.wipeUsers();
      await loadUsers();
      toast('Todos os usuários extras foram excluídos com sucesso', 'success');
    } catch (err) {
      toast(err.message || 'Erro ao excluir usuários', 'error');
    } finally {
      setWiping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">GESTÃO DE USUÁRIOS</h2>
              <p className="text-xs text-text-muted">Gerencie ou exclua contas criadas no sistema</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loading ? (
            <div className="text-center py-8 text-xs text-text-muted">Carregando lista de usuários...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-xs text-text-muted">Nenhum usuário cadastrado.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {users.map(u => {
                const isAdmin = u.is_admin === 1 || u.username.toLowerCase() === 'admin';
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-bg-secondary hover:border-border-bright transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs"
                        style={{
                          backgroundColor: `${u.avatar_color || '#E5A93C'}20`,
                          borderColor: u.avatar_color || '#E5A93C',
                          color: u.avatar_color || '#E5A93C'
                        }}
                      >
                        {u.display_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{u.display_name}</span>
                          {isAdmin && (
                            <span className="text-[10px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/30 flex items-center gap-1">
                              <ShieldCheck size={10} /> ADMIN
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-text-muted">@{u.username}</span>
                      </div>
                    </div>

                    {!isAdmin && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        disabled={deletingId === u.id}
                        className="p-2 rounded hover:bg-danger/20 text-text-muted hover:text-danger transition-colors"
                        title="Excluir usuário"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer flex items-center justify-between">
          <button
            onClick={handleWipeAll}
            disabled={wiping || users.filter(u => u.username?.toLowerCase() !== 'admin').length === 0}
            className="btn btn-danger btn-sm flex items-center gap-2"
          >
            <AlertTriangle size={14} />
            {wiping ? 'LIMPANDO...' : 'EXCLUIR TODOS OS USUÁRIOS'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
}
