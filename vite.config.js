import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A publicação fica em /nome-do-repositorio/ no GitHub Pages.
// Localmente, os caminhos continuam na raiz.
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.GITHUB_ACTIONS === 'true' && repo
  ? `/${repo}/`
  : '/';

export default defineConfig({ plugins: [react()], base });
