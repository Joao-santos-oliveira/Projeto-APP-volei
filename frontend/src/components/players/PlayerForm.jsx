import { useState, useRef } from 'react';
import { X, Camera } from 'lucide-react';
import { POSITIONS, TECHNICAL_ATTRS, COMPLEMENTARY_ATTRS, ALL_ATTRS, getInitials } from '../../utils/constants';

const DEFAULT_ATTRS = { attack:5, serve:5, reception:5, block:5, defense:5, setting:5, communication:5, consistency:5, versatility:5 };

export default function PlayerForm({ player, onSave, onCancel, isQuick = false }) {
  const [form, setForm] = useState({
    name:               player?.name || '',
    nickname:           player?.nickname || '',
    number:             player?.number || '',
    height:             player?.height || '',
    primary_position:   player?.primary_position || 'Ponteiro',
    secondary_positions:player?.secondary_positions || [],
    notes:              player?.notes || '',
    photo:              player?.photo || null,
    attributes:         { ...DEFAULT_ATTRS, ...(player?.attributes || {}) }
  });
  const [tab, setTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setAttr = (key, val) => setForm(f => ({ ...f, attributes: { ...f.attributes, [key]: Number(val) } }));

  const toggleSecondary = (pos) => {
    set('secondary_positions', form.secondary_positions.includes(pos)
      ? form.secondary_positions.filter(p => p !== pos)
      : [...form.secondary_positions, pos]
    );
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set('photo', ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        number: form.number ? parseInt(form.number) : null,
        height: form.height ? parseInt(form.height) : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Tabs (somente no modo completo) */}
      {!isQuick && (
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {[
            { key:'basic',  label:'Dados' },
            { key:'attrs',  label:'Atributos' },
            { key:'notes',  label:'Observações' }
          ].map(t => (
            <button key={t.key} type="button"
              className={`tab-btn${tab === t.key ? ' active' : ''}`}
              style={{ flex:1 }}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── Dados básicos ─── */}
      {(tab === 'basic' || isQuick) && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Foto */}
          {!isQuick && (
            <div style={{ display:'flex', justifyContent:'center' }}>
              <div
                className="photo-preview"
                onClick={() => fileRef.current?.click()}
                title="Clique para adicionar foto"
              >
                {form.photo
                  ? <img src={form.photo} alt="foto" />
                  : <span style={{ fontSize:32 }}>{form.name ? getInitials(form.name) : <Camera size={28} />}</span>
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input className="form-input" value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Nome completo" required />
            </div>
            <div className="form-group">
              <label className="form-label">Apelido</label>
              <input className="form-input" value={form.nickname}
                onChange={e => set('nickname', e.target.value)}
                placeholder="Apelido" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Camisa</label>
              <input className="form-input" type="number" min="1" max="99" value={form.number}
                onChange={e => set('number', e.target.value)}
                placeholder="N°" />
            </div>
            {!isQuick && (
              <div className="form-group">
                <label className="form-label">Altura (cm)</label>
                <input className="form-input" type="number" min="140" max="230" value={form.height}
                  onChange={e => set('height', e.target.value)}
                  placeholder="ex: 181" />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Posição Principal *</label>
            <select className="form-select" value={form.primary_position}
              onChange={e => set('primary_position', e.target.value)}>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {!isQuick && (
            <div className="form-group">
              <label className="form-label">Posições Secundárias</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {POSITIONS.filter(p => p !== form.primary_position).map(p => (
                  <button key={p} type="button"
                    className={`btn btn-sm ${form.secondary_positions.includes(p) ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => toggleSecondary(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Atributos ─── */}
      {tab === 'attrs' && !isQuick && (
        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-secondary)', marginBottom:12 }}>
              Técnicos
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {TECHNICAL_ATTRS.map(({ key, label }) => (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:13, color:'var(--text-secondary)', minWidth:110 }}>{label}</span>
                  <input type="range" min="0" max="10" step="0.5"
                    className="attribute-input"
                    style={{ flex:1 }}
                    value={form.attributes[key]}
                    onChange={e => setAttr(key, e.target.value)} />
                  <span style={{ fontSize:15, fontWeight:700, color:'var(--text-accent)', minWidth:28, textAlign:'right' }}>
                    {form.attributes[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-secondary)', marginBottom:12 }}>
              Complementares
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {COMPLEMENTARY_ATTRS.map(({ key, label }) => (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:13, color:'var(--text-secondary)', minWidth:110 }}>{label}</span>
                  <input type="range" min="0" max="10" step="0.5"
                    className="attribute-input"
                    style={{ flex:1 }}
                    value={form.attributes[key]}
                    onChange={e => setAttr(key, e.target.value)} />
                  <span style={{ fontSize:15, fontWeight:700, color:'var(--text-accent)', minWidth:28, textAlign:'right' }}>
                    {form.attributes[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Observações ─── */}
      {tab === 'notes' && !isQuick && (
        <div className="form-group">
          <label className="form-label">Observações táticas</label>
          <textarea className="form-textarea"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder='Ex: "Bom saque flutuante. Cansa no 3º set."'
            style={{ minHeight: 160 }}
          />
        </div>
      )}

      {/* ─── Ações ─── */}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:12, marginTop:24, paddingTop:20, borderTop:'1px solid var(--border)' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim()}>
          {saving ? 'Salvando...' : (player ? 'Salvar Alterações' : 'Criar Jogador')}
        </button>
      </div>
    </form>
  );
}
