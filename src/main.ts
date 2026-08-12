import { Game } from './Game';

window.addEventListener('DOMContentLoaded', () => {
    (window as any).game = new Game();
});