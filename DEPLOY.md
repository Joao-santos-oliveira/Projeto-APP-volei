# 🚀 Guia de Deploy — Vôlei Manager

O sistema foi arquitetado com **modo híbrido**:
- **Com Backend Local / Servidor (Node + Express + SQLite)**: Conecta automaticamente na API REST.
- **Sem Backend / Estático (GitHub Pages, Vercel, Netlify)**: Ativa automaticamente a persistência client-side (`localStorage`), funcionando 100% offline e em qualquer hospedagem estática, mantendo todos os dados, cartas, histórico e placar salvos no navegador.

---

## 1. Deploy na Vercel (Recomendado - 1 Clique)

### Opção A: Pelo Painel da Vercel
1. Suba seu código para um repositório no **GitHub**.
2. Acesse [vercel.com](https://vercel.com) e clique em **"Add New Project"** -> **"Import"** no seu repositório.
3. Se o projeto estiver na raiz, a Vercel já reconhecerá o arquivo `vercel.json` configurado automaticamente.
4. Clique em **"Deploy"**.
5. Pronto! O app estará no ar com HTTPS e URL própria (ex: `meu-time-volei.vercel.app`).

---

## 2. Deploy no GitHub Pages

### Opção A: Automático via GitHub Actions (Sem precisar rodar comandos)
1. Suba o projeto para um repositório no GitHub (`main` ou `master`).
2. No seu repositório do GitHub, vá em **Settings** > **Pages**.
3. Na seção **Build and deployment** > **Source**, selecione **"GitHub Actions"**.
4. O arquivo `.github/workflows/deploy.yml` já está configurado e fará o build e publicação automáticos a cada `git push`.

### Opção B: Manual via terminal
1. Abra o terminal na pasta `frontend`:
   ```bash
   cd frontend
   npm run deploy
   ```
2. Isso fará o build e publicará diretamente na branch `gh-pages` do seu repositório.

---

## 3. Rodando Localmente

### Modo Completo (Frontend + Backend SQLite):
```bash
# Terminal 1 - Backend API (porta 3001)
cd backend
node server.js

# Terminal 2 - Frontend Vite (porta 5173)
cd frontend
npm run dev
```

### Modo Estático / Apenas Frontend:
```bash
cd frontend
npm run dev
```
*(Se o backend não estiver rodando, o frontend ativa automaticamente o modo offline com `localStorage` sem nenhum erro).*
