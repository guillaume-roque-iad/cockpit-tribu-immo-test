import React from 'react';
import {createRoot} from 'react-dom/client';
import Workspace from './workspace';
import './globals.css';
createRoot(document.getElementById('root')!).render(<><div style={{background:'#fff0cc',padding:'10px 18px',fontSize:12}}>LAB-FT · TEST — Données et pièces dans ce navigateur uniquement. Utilisez des données fictives. IA et contrôle automatique des gels non raccordés. <a href="/" target="_top">Retour au Cockpit</a></div><Workspace/></>);
