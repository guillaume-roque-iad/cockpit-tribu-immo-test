import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';import path from 'node:path';
export default defineConfig({root:'labft-src',base:'/labft/',plugins:[react()],resolve:{alias:{'@':path.resolve('labft-src')}},build:{outDir:'../dist/labft',emptyOutDir:true},publicDir:'public'});
