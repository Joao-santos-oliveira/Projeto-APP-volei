import { useState, useEffect } from 'react';
import { Users, Trash2, X, AlertTriangle, ShieldCheck } from 'lucide-react';
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
      let data = [];
      try {
        data = await api.getUsers();
      } catch (e) {
        console.warn('Backend getUsers falhou, buscando localmente:', e);
      }

      if (!Array.isArray(data) || data.length === 0) {
        const raw = localStorage.getItem('volei_users');
        data = raw ? JSON.parse(raw) : [];
      }

      // Garante que o admin apareça caso não retorne nada
      if (!data || data.length === 0) {
        data = [{ id: 1, username: 'admin', display_name: 'Admin', is_admin: 1, avatar_color: '#f5c518' }];
      }

      setUsers(data);
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
    if (username?.toLowerCase() === 'admin') {
      toast('Não é permitido excluir a conta administradora principal', 'warning');
      return;
    }
    if (!window.confirm(`Deseja realmente remover o usuário "${username}"?`)) return;

    setDeletingId(id);
    try {
      try {
        await api.deleteUser(id);
      } catch (err) {
        console.warn('Falha na exclusão do backend, removendo localmente:', err);
      }

      // Atualiza localStorage
      const raw = localStorage.getItem('volei_users');
      if (raw) {
        const list = JSON.parse(raw).filter(u => u.id !== id && u.username?.toLowerCase() !== username?.toLowerCase());
        localStorage.setItem('volei_users', JSON.stringify(list));
      }

      setUsers(prev => prev.filter(u => u.id !== id && u.username?.toLowerCase() !== username?.toLowerCase()));
      toast(`Usuário "${username}" removido com sucesso!`, 'success');
    } catch (err) {
      toast(err.message || 'Erro ao remover usuário', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleWipeAll = async () => {
    if (!window.confirm('Atenção: Deseja excluir TODOS os usuários criados, mantendo apenas o administrador principal?')) return;

    setWiping(true);
    try {
      try {
        await api.wipeUsers();
      } catch (err) {
        console.warn('Falha no wipe do backend, limpando localmente:', err);
      }

      // Limpa localStorage mantendo admin
      const adminUser = {
        id: 1,
        username: 'admin',
        display_name: 'Admin',
        is_admin: 1,
        avatar_color: '#f5c518'
      };
      localStorage.setItem('volei_users', JSON.stringify([adminUser]));

      setUsers([adminUser]);
      toast('Todos os usuários extras foram excluídos com sucesso!', 'success');
    } catch (err) {
      toast(err.message || 'Erro ao excluir usuários', 'error');
    } finally {
      setWiping(false);
    }
  };

  if (!isOpen) return null;

  const extraUsersCount = users.filter(u => u.username?.toLowerCase() !== 'admin').length;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'rgba(229, 169, 60, 0.15)',
              border: '1px solid rgba(229, 169, 60, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gold)'
            }}>
              <Users size={18} />
            </div>
            <div>
              <h2 className="modal-title">GESTÃO DE USUÁRIOS</h2>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {users.length} conta{users.length !== 1 ? 's' : ''} cadastrada{users.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Carregando lista de usuários...
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Nenhum usuário cadastrado.
            </div>
          ) : (
            <div className="geo-user-list">
              {users.map(u => {
                const isAdmin = u.is_admin === 1 || u.username?.toLowerCase() === 'admin';
                return (
                  <div key={u.id || u.username} className="geo-user-row">
                    <div className="geo-user-left">
                      <div
                        className="geo-user-avatar-badge"
                        style={{
                          backgroundColor: `${u.avatar_color || '#E5A93C'}20`,
                          borderColor: u.avatar_color || '#E5A93C',
                          color: u.avatar_color || '#E5A93C'
                        }}
                      >
                        {u.display_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="geo-user-info-meta">
                        <div className="geo-user-name-row">
                          <span className="geo-user-display-name">{u.display_name}</span>
                          {isAdmin && (
                            <span className="geo-admin-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <ShieldCheck size={10} /> ADMIN
                            </span>
                          )}
                        </div>
                        <span className="geo-user-handle-tag">@{u.username}</span>
                      </div>
                    </div>

                    {!isAdmin && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        disabled={deletingId === u.id}
                        className="geo-user-del-btn"
                        title="Excluir usuário"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            onClick={handleWipeAll}
            disabled={wiping || extraUsersCount === 0}
            className="btn btn-danger btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
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
