# 🏐 Vôlei Manager — Sistema de Gestão de Time e Placar ao Vivo

Sistema web moderno e responsivo para gestão de time de vôlei amador, cartas de jogadores com atributos técnicos e complementares, pontuação ao vivo ponto a ponto e dashboards estatísticos.

---

## ⚡ Destaques da Arquitetura
- **Deploy 1-Clique na Vercel & GitHub Pages**: Configurado com persistência automática no cliente (`localStorage`) e roteamento seguro sem erros de 404 em refresh.
- **Modo Híbrido**: Funciona tanto conectado a um backend Node.js + SQLite quanto de forma 100% estática / offline.
- **Interface Mobile-First**: Otimizada para uso real na beira da quadra em celulares e tablets.

---

## 📦 Estrutura de Diretórios
```
Projeto APP volei/
├── .github/workflows/deploy.yml   # Workflow automático para GitHub Pages
├── backend/                       # API Express + SQLite (sql.js)
│   ├── db/volleyball.db           # Banco SQLite
│   ├── routes/                    # Rotas REST (/players, /matches)
│   └── server.js
├── frontend/                      # App React 19 + Vite + Recharts
│   ├── src/
│   │   ├── api/                   # API client híbrido (Backend + localStore)
│   │   ├── components/            # Componentes visuais, modais, radares
│   │   ├── pages/                 # Páginas (Jogadores, Partidas, Placar, Dashboard)
│   │   └── utils/                 # Constantes e helpers
│   ├── vercel.json                # Configuração para Vercel
│   └── vite.config.js             # Base path relativo para GitHub Pages
├── vercel.json                    # Configuração para deploy na raiz
├── package.json                   # Scripts unificados
└── DEPLOY.md                      # Instruções passo a passo de deploy
```

---

## 🚀 Como Executar Localmente

### Opção 1: Frontend + Backend
```bash
# Terminal 1:
cd backend
node server.js

# Terminal 2:
cd frontend
npm run dev
```

### Opção 2: Apenas Frontend
```bash
cd frontend
npm run dev
```

Acesse em: `http://localhost:5173`

---

## 🌐 Deploy
Consulte o arquivo [DEPLOY.md](file:///c:/Users/Pichau/OneDrive/Desktop/Projeto%20APP%20volei/DEPLOY.md) para instruções detalhadas para **Vercel** e **GitHub Pages**.
