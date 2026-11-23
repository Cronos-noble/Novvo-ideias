#!/usr/bin/env node
// node init_project.js "<Tema>" <voice.wav>  → ~/shorts/<Tema>_<id>/
const fs = require('fs'), path = require('path'), os = require('os');
const [theme, wav] = process.argv.slice(2);
if (!theme || !wav) { console.error('uso: init_project.js "<Tema>" <voice.wav>'); process.exit(1); }
const slug = theme.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '');
const id = Math.random().toString(36).slice(2, 8);
const dir = path.join(os.homedir(), 'shorts', `${slug}_${id}`);
fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
const T = path.join(__dirname, '..', 'templates');
for (const f of ['engine.html', 'engine.js']) fs.copyFileSync(path.join(T, f), path.join(dir, f));
fs.copyFileSync(path.join(T, 'scenes.example.json'), path.join(dir, 'scenes.json'));
fs.copyFileSync(wav, path.join(dir, 'voice.wav'));
console.log(dir);
