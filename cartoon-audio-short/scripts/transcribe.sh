#!/usr/bin/env bash
# transcribe.sh <proj> <pt|en>  → <proj>/words.json  [{word,start,end}]
set -e
P="$1"; L="${2:-pt}"
whisper "$P/voice.wav" --model small --language "$L" --word_timestamps True \
  --output_format json --output_dir "$P/_whisper" >/dev/null
node -e '
const fs=require("fs"),p=process.argv[1];
const j=JSON.parse(fs.readFileSync(p+"/_whisper/voice.json"));
const w=[];for(const s of j.segments)for(const x of (s.words||[]))w.push({word:x.word.trim(),start:+x.start.toFixed(2),end:+x.end.toFixed(2)});
fs.writeFileSync(p+"/words.json",JSON.stringify(w));
const d=w.length?w[w.length-1].end:0;console.log(w.length+" palavras, ~"+d+"s");
' "$P"
