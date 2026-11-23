---
name: cartoon-audio-short
description: Cria shorts animados verticais (1080x1920, 9:16) em desenho 2D recortado (cut-out/vetorial) a partir de um áudio de narração, tudo gerado em código (Node + Puppeteer + FFmpeg). Use quando o usuário pedir "criar short animado", "desenho animado vertical", "vídeo de curiosidade", "short de história real", "cartoon com narração" ou mandar um .wav de narração para virar animação.
---

# cartoon-audio-short

Gera shorts verticais 2D "recortados": cores chapadas, bonecos articulados (cabeça, corpo, braços, olhos que piscam, 4 formatos de boca), fundos com pan lento, textos só como objetos de cena (placas, jornais, faixas). Sem legenda corrida. Sem API paga.

Pasta da skill: `~/.claude/skills/cartoon-audio-short/` (chame de `$SKILL`).

## Fluxo (siga nesta ordem; use AskUserQuestion para as perguntas)

1. **Abertura.** Pergunte "Por onde você quer começar?" com as opções: "Preciso de ideias + roteiro", "Já tenho o tema", "Já tenho o roteiro".
2. **Idioma e duração.** Opções: PT-BR 20–30 s, PT-BR 45–60 s, EN 20–30 s, EN 45–60 s.
3. **Ideias** (só se pedirem). Gere 10 temas de curiosidade/história real com gancho forte (ex.: "O homem que vendeu a Torre Eiffel"). **Cheque os fatos antes de mostrar** (WebSearch). Espere o usuário responder "Crie a ideia N".
4. **Roteiro.** Narração com ~150 palavras/minuto, gancho na 1ª frase, frases curtas, números por extenso. Entregue: contagem de palavras, duração estimada, plano visual cena a cena, dicas de voz. Termine dizendo para gerar o áudio no **Google AI Studio → Text to speech, modelo Gemini Flash TTS, voz Mako, estilo Promote**, e arrastar o `.wav` para o chat.
5. **Render** (quando chegar o áudio). Mostre este checklist (TaskCreate) e execute cada item:
   1. Kit + pasta: `bash $SKILL/scripts/setup.sh` (1ª vez) e `node $SKILL/scripts/init_project.js "<Tema>" <caminho-do-wav>` → cria `~/shorts/<Tema>_<id>/`.
   2. Medir falas: `bash $SKILL/scripts/transcribe.sh <proj> <pt|en>` → `words.json`; `node $SKILL/scripts/amplitude.js <proj>` → `amp.json`.
   3. Plano de cenas: escreva `<proj>/scenes.json` sincronizado com os timestamps de `words.json` (formato abaixo; exemplo em `templates/scenes.example.json`). Cada cena começa na palavra em que o assunto muda; cenas contíguas (`end` de uma = `start` da próxima; a 1ª começa em 0; a última termina na duração do áudio).
   4. Mundo, elenco e movimentos: defina `characters` e `bg`/`actors`/`props` por cena. Personagens são SVG com partes separadas (`templates/engine.js`). Se faltar um visual, edite `engine.js` da pasta do projeto.
   5. Stills: `node $SKILL/scripts/render.js <proj> --stills` → `stills/` + `contact_sheet.png`. **Mostre a folha de contato (Read na imagem) e espere aprovação** antes de seguir.
   6. Áudio: `node $SKILL/scripts/audio_synth.js <proj>` → `music.wav` (jazz | suspense | upbeat) e `sfx.wav` (register, whoosh, pop) conforme `music` e `sfx` do scenes.json.
   7. Render final: `node $SKILL/scripts/render.js <proj>` → `<Titulo_Do_Video>.mp4` (H.264 + AAC, 30 fps). Informe o caminho absoluto.
6. **Ajustes.** Pedidos como "troca a cena 3" ou "música mais baixa": edite `scenes.json` (ex.: `music.volume`) e rode `render.js` de novo. Só as cenas cujo hash mudou são re-renderizadas (cache em `segments/`). Mudou música/sfx? Rode `audio_synth.js` antes.

## scenes.json

```jsonc
{
  "title": "O Homem Que Vendeu A Torre Eiffel",
  "audio": "voice.wav", "fps": 30,
  "music": { "style": "jazz", "bpm": 118, "volume": 0.16 },
  "sfx": [ { "t": 12.4, "type": "register" } ],
  "characters": {
    "victor": { "skin": "#f2c9a0", "shirt": "#2b4c7e", "pants": "#222", "hair": "#3b2a20",
                "hairStyle": "short|bald|long", "hat": "none|top|cap", "mustache": true, "glasses": false }
  },
  "scenes": [{
    "start": 0, "end": 6.2,
    "bg": { "type": "city|room|outdoor|office", "colors": ["#f6d6a8","#e07a5f","#3d405b"], "pan": 0.25 },
    "actors": [ { "id": "victor", "x": 540, "y": 1500, "scale": 1.6, "enter": "left|right|pop|none", "speaks": true, "flip": false } ],
    "props":  [ { "type": "sign|newspaper|banner", "text": "PARIS|1925", "x": 540, "y": 520, "w": 640, "h": 260, "t_in": 0.4 } ]
  }]
}
```
`text` usa `|` para quebrar linhas. Tempos em segundos do áudio. `speaks:true` liga a boca à amplitude do áudio (lip-sync); só um ator por cena deve falar.

## Regras de estilo
- Cores chapadas, sem gradiente nem sombra suave; no máximo 4–5 cores por cena.
- Nada de legenda corrida; texto só dentro de objetos (placa, jornal, faixa).
- Cena nova a cada 3–6 s; mudança de assunto = nova cena. Use `enter` e props com `t_in` para dar ritmo.
- Efeitos sonoros nos momentos-chave (dinheiro = `register`, entrada de objeto = `pop`, troca de cena forte = `whoosh`).

## Dependências
`setup.sh` verifica/instala Node ≥18, FFmpeg, Python+openai-whisper e `puppeteer` (Chromium). Avise o usuário do que faltar; não instale nada fora disso.
