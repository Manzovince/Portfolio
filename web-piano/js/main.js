import { initMIDI } from './midi.js';
import { setupUI, updateUI, drawPianoRoll } from './ui.js';
import { initScore } from './score.js';

initMIDI();
setupUI();
updateUI();
drawPianoRoll();
initScore();

const consoleDiv = document.getElementById('console');

function appendToConsole(type, ...args) {
    if (consoleDiv) {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        const line = document.createElement('div');
        line.textContent = msg;
        if (type === 'error') line.style.color = '#ff6b6b';
        if (type === 'warn') line.style.color = '#ffe066';
        consoleDiv.appendChild(line);
        while (consoleDiv.children.length > 10) consoleDiv.removeChild(consoleDiv.firstChild);
        consoleDiv.scrollTop = consoleDiv.scrollHeight;
    }
}

const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;

console.log = function (...args) {
    origLog.apply(console, args);
    appendToConsole('log', ...args);
};
console.warn = function (...args) {
    origWarn.apply(console, args);
    appendToConsole('warn', ...args);
};
console.error = function (...args) {
    origError.apply(console, args);
    appendToConsole('error', ...args);
};

window.addEventListener('error', function (event) {
    appendToConsole('error', event.message + ' (' + event.filename + ':' + event.lineno + ')');
});
window.addEventListener('unhandledrejection', function (event) {
    appendToConsole('error', 'Unhandled promise rejection: ' + event.reason);
});