---
name: lossless-cut
description: Cortar e juntar vídeos sem perda de qualidade e sem reencodar, usando ffmpeg com cópia de fluxo (o mesmo princípio do app LosslessCut). Use quando o usuário pedir para cortar um trecho de vídeo, remover partes, extrair um clipe ou juntar vários vídeos rapidamente.
---

# Lossless Cut

Corta e junta vídeos com `-c copy`, sem reencodar. A operação é quase instantânea e mantém a qualidade original. O app LosslessCut (github.com/mifi/lossless-cut) faz isso com interface gráfica e usa o ffmpeg por baixo; esta skill faz o mesmo pela linha de comando.

## Pré-requisitos

- Verificar: `ffmpeg -version` e `ffprobe -version`
- Se não estiver instalado: `brew install ffmpeg`, `sudo apt install ffmpeg` ou `winget install ffmpeg`.

## Limitação importante: keyframes

Com `-c copy`, o corte só acontece em keyframes (quadros-chave). O início pode ser ligeiramente antecipado ou atrasado, em geral até alguns segundos. Para corte exato, é preciso reencodar, o que perde a vantagem do método. Avise o usuário disso antes de cortar.

## Cortar um trecho

Dados necessários: arquivo de entrada, início e fim (formato `HH:MM:SS` ou segundos).

```
ffmpeg -ss INICIO -i entrada.mp4 -to FIM -c copy -avoid_negative_ts make_zero saida.mp4
```

Usar a duração em vez do fim: trocar `-to FIM` por `-t DURACAO`.

Para manter o nome original com sufixo: `saida_corte.mp4` ao lado do arquivo.

## Juntar vários vídeos

Todos precisam ter o mesmo codec, resolução e fps. Se não tiverem, o concat sem reencode falha ou sai com defeito. Verifique com `ffprobe` antes.

1. Criar `lista.txt`:
   ```
   file 'parte1.mp4'
   file 'parte2.mp4'
   ```
2. Rodar:
   `ffmpeg -f concat -safe 0 -i lista.txt -c copy juntado.mp4`

## Remover um trecho do meio

Cortar as duas partes (antes e depois do trecho) separadamente e juntá-las com o método acima.

## Regras

- Nunca sobrescreva o arquivo original. Sempre gere um novo.
- Antes de cortar, rode `ffprobe -v error -show_entries format=duration -of csv=p=0 entrada.mp4` para confirmar a duração e validar os tempos pedidos.
- Se o usuário pedir corte exato ao frame, avise da limitação de keyframes e pergunte se aceita reencodar (`-c:v libx264 -crf 18`).
- Relate o resultado: caminho do arquivo, duração final e se o corte foi por cópia ou reencode.
