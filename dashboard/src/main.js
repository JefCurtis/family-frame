import { mount } from 'svelte';
import App from './App.svelte';
import { startDiag } from './diag.js';

const target = document.getElementById('app');
target.textContent = ''; // drop the 'Starting…' placeholder
mount(App, { target });
startDiag();
window.__booted = true;
