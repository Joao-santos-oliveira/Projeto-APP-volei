import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Search, Shield, LayoutGrid, List, ChevronRight, ChevronDown, Folder, Users
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import {
  POSITIONS, positionBadgeClass, getInitials,
  getPlayerProficiencies, avgTechnical
} from '../utils/constants';
import PlayerCard from '../components/players/PlayerCard';
import PlayerForm from '../components/players/PlayerForm';
import Modal from '../components/ui/Modal';

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPos, setFilterPos] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'list'
  const [collapsedFolders, setCollapsedFolders] = useState({}); // { [folderId]: boolean }
  const toast = useToast();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([api.getPlayers(), api.getTeams()]);
      setPlayers(p);
      setTeams(t);
    } catch {
      toast('Erro ao carregar elenco e equipes', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    try {
      const newP = await api.createPlayer(data);
      toast(`${newP.name} cadastrado com sucesso!`, 'success');
      setShowCreate(false);
      load();
      navigate(`/players/${newP.id}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const toggleFolder = (folderId) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Filtro de Atletas
  const filterPlayer = (p) => {
    const s = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(s) ||
      (p.nickname && p.nickname.toLowerCase().includes(s)) ||
      (p.number && String(p.number).includes(s));

    const matchPos = !filterPos ||
      p.primary_position === filterPos ||
      (p.secondary_positions && p.secondary_positions.includes(filterPos));

    return matchSearch && matchPos;
  };

  // Agrupamento por Equipes / Pastas
  // Cada time tem seus jogadores. Jogadores sem time vão para a pasta "Sem Equipe".
  const playerToTeamIdsMap = {};
  teams.forEach(t => {
    (t.players || []).forEach(tp => {
      if (!playerToTeamIdsMap[tp.id]) playerToTeamIdsMap[tp.id] = [];
      playerToTeamIdsMap[tp.id].push(t.id);
    });
  });

  // Monta estrutura de pastas
  const teamFolders = teams.map(t => {
    const teamPlayerIds = (t.players || []).map(tp => tp.id);
    const teamAthletes = players.filter(p => teamPlayerIds.includes(p.id) && filterPlayer(p));
    return {
      id: `team_${t.id}`,
      teamId: t.id,
      name: t.name,
      color: t.color || '#E5A93C',
      athletes: teamAthletes,
      totalInTeam: teamPlayerIds.length
    };
  });

  // Atletas Avulsos (não pertencem a nenhum time)
  const unassignedAthletes = players.filter(p => !playerToTeamIdsMap[p.id]?.length && filterPlayer(p));

  const hasAnyResults = teamFolders.some(f => f.athletes.length > 0) || unassignedAthletes.length > 0;

  // Renderizador de grade de atletas dentro de uma pasta
  const renderAthletesContent = (athletesList) => {
    if (viewMode === 'cards') {
      return (
        <div className="geo-player-grid">
          {athletesList.map(p => (
            <PlayerCard key={p.id} player={p} onClick={() => navigate(`/players/${p.id}`)} />
          ))}
        </div>
      );
    }

    return (
      <div className="geo-dynamic-roster-list">
        {athletesList.map(p => {
          const profs = getPlayerProficiencies(p);
          const avg = avgTechnical(p.attributes);

          return (
            <div
              key={p.id}
              className="geo-roster-row-card"
              onClick={() => navigate(`/players/${p.id}`)}
            >
              <div className="roster-avatar-box">
                {p.photo ? (
                  <img src={p.photo} alt={p.name} className="roster-avatar-img" />
                ) : (
                  <span className="roster-avatar-initials">{getInitials(p.name)}</span>
                )}
                {p.number && <span className="roster-jersey-tag">#{p.number}</span>}
              </div>

              <div className="roster-identity-col">
                <div className="roster-name-row">
                  <span className="roster-player-name">{p.name}</span>
                  {p.nickname && <span className="roster-player-alias">"{p.nickname}"</span>}
                </div>

                <div className="roster-positions-row">
                  <span className={positionBadgeClass(p.primary_position)}>
                    {p.primary_position}
                  </span>
                  {p.secondary_positions?.map(sec => (
                    <span key={sec} className="badge badge-default" style={{ opacity: 0.85 }}>
                      {sec}
                    </span>
                  ))}
                  {p.height && <span className="roster-height-tag">{p.height}cm</span>}
                </div>

                <div className="roster-prof-chips-row">
                  {profs.map(prof => (
                    <div
                      key={prof.position}
                      className="roster-prof-chip"
                      style={{ borderColor: `${prof.tierColor}40` }}
                    >
                      <span className="chip-pos">{prof.position}:</span>
                      <span className="chip-score" style={{ color: prof.tierColor }}>
                        {prof.score.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="roster-stats-col">
                <div className="roster-score-badge">
                  <span className="score-num">{avg}</span>
                  <span className="score-label">MÉD GER</span>
                </div>
                <ChevronRight size={16} className="roster-arrow" />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page-container">
      {/* ── Page Header ── */}
      <div className="geo-page-header">
        <div className="geo-header-title-block">
          <div className="geo-eyebrow">PLANTEL & SCOUTING</div>
          <h1 className="geo-main-title">ELENCO DE ATLETAS</h1>
          <p className="geo-sub-title">
            {players.length} ATLETA{players.length !== 1 ? 'S' : ''} EM {teams.length} EQUIPE{teams.length !== 1 ? 'S' : ''}
          </p>
        </div>

        <button className="btn btn-gold" onClick={() => setShowCreate(true)}>
          <UserPlus size={16} />
          NOVO ATLETA
        </button>
      </div>

      {/* ── Precision Filter Toolbar ── */}
      <div className="geo-filter-bar">
        {/* Search */}
        <div className="geo-search-field">
          <Search size={15} className="geo-search-icon" />
          <input
            type="text"
            className="geo-search-input"
            placeholder="BUSCAR POR NOME, APELIDO OU NÚMERO..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Position Select */}
        <div className="geo-select-wrap">
          <select
            className="geo-select-input"
            value={filterPos}
            onChange={e => setFilterPos(e.target.value)}
          >
            <option value="">TODAS AS POSIÇÕES (PRINCIPAL OU SECUNDÁRIA)</option>
            {POSITIONS.map(pos => (
              <option key={pos} value={pos}>{pos.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* View Mode Switcher */}
        <div className="geo-view-switcher">
          <button
            type="button"
            className={`geo-view-btn ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
            title="Visualização em Cards Detalhados"
          >
            <LayoutGrid size={15} />
            <span className="view-btn-text">CARDS</span>
          </button>
          <button
            type="button"
            className={`geo-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Visualização Rápida em Lista Dinâmica"
          >
            <List size={15} />
            <span className="view-btn-text">LISTA RÁPIDA</span>
          </button>
        </div>
      </div>

      {/* ── Conteúdo Agrupado por Pastas de Times ── */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : !hasAnyResults ? (
        <div className="geo-empty-panel">
          <Shield size={36} className="geo-empty-icon" />
          <div className="geo-empty-title">NENHUM ATLETA ENCONTRADO</div>
          <div className="geo-empty-desc">
            {search || filterPos
              ? 'Nenhum atleta corresponde aos filtros aplicados. Tente redefinir a busca ou a posição selecionada.'
              : 'Cadastre o primeiro atleta da equipe para registrar notas técnicas e scout.'}
          </div>
          {(!search && !filterPos) && (
            <button className="btn btn-gold btn-sm" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
              <UserPlus size={14} /> CADASTRAR PRIMEIRO ATLETA
            </button>
          )}
        </div>
      ) : (
        <div className="geo-team-folder-container">
          {/* Pastas das Equipes Cadastradas */}
          {teamFolders.map(folder => {
            if (folder.athletes.length === 0 && (search || filterPos)) return null;
            const isCollapsed = !!collapsedFolders[folder.id];

            return (
              <div key={folder.id} className="geo-team-folder" style={{ borderColor: `${folder.color}40` }}>
                <div
                  className="geo-team-folder-header"
                  onClick={() => toggleFolder(folder.id)}
                >
                  <div className="geo-folder-info-left">
                    <div className="geo-folder-color-mark" style={{ background: folder.color }} />
                    <Folder size={18} color={folder.color} />
                    <span className="geo-folder-title">{folder.name}</span>
                    <span className="geo-folder-count-badge">
                      {folder.athletes.length} ATLETA{folder.athletes.length !== 1 ? 'S' : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/teams/${folder.teamId}`);
                      }}
                    >
                      VER TIME →
                    </button>
                    {isCollapsed ? <ChevronRight size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="geo-folder-content">
                    {folder.athletes.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                        Nenhum atleta vinculado a esta equipe no momento.
                      </div>
                    ) : (
                      renderAthletesContent(folder.athletes)
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pasta de Atletas Sem Equipe / Avulsos */}
          {unassignedAthletes.length > 0 && (
            <div className="geo-team-folder" style={{ borderColor: 'var(--border)' }}>
              <div
                className="geo-team-folder-header"
                onClick={() => toggleFolder('unassigned')}
              >
                <div className="geo-folder-info-left">
                  <div className="geo-folder-color-mark" style={{ background: 'var(--text-muted)' }} />
                  <Users size={18} color="var(--text-muted)" />
                  <span className="geo-folder-title" style={{ color: 'var(--text-secondary)' }}>SEM EQUIPE / ATLETAS AVULSOS</span>
                  <span className="geo-folder-count-badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                    {unassignedAthletes.length} ATLETA{unassignedAthletes.length !== 1 ? 'S' : ''}
                  </span>
                </div>

                <div>
                  {collapsedFolders['unassigned'] ? <ChevronRight size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                </div>
              </div>

              {!collapsedFolders['unassigned'] && (
                <div className="geo-folder-content">
                  {renderAthletesContent(unassignedAthletes)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Modal Cadastro de Atleta ── */}
      {showCreate && (
        <Modal title="CADASTRAR NOVO ATLETA" onClose={() => setShowCreate(false)} size="lg">
          <PlayerForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}
    </div>
  );
}
