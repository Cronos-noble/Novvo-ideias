---
name: yt-dlp
description: Baixar vídeos e áudios de sites como YouTube usando o yt-dlp via linha de comando. Use quando o usuário pedir para baixar, salvar, converter em MP3 ou listar formatos/legendas de um link de vídeo.
---

# yt-dlp

Ferramenta de linha de comando para baixar vídeos e áudios. Só baixe conteúdo que o usuário tem direito de salvar.

## Pré-requisitos

- Verificar se está instalado: `yt-dlp --version`
- Se não estiver: `pip install -U yt-dlp` (ou `brew install yt-dlp` / `winget install yt-dlp`)
- Para mesclar vídeo e áudio ou converter formatos, o `ffmpeg` também precisa estar instalado: `ffmpeg -version`

## Fluxo padrão

1. Listar formatos disponíveis, se o usuário quiser escolher qualidade:
   `yt-dlp -F "URL"`
2. Baixar com a melhor qualidade de vídeo e áudio, saída em MP4:
   `yt-dlp -f "bv*+ba/b" --merge-output-format mp4 "URL"`
3. Confirmar o arquivo gerado e informar o caminho final.

## Comandos úteis

| Objetivo | Comando |
|---|---|
| Só áudio em MP3 | `yt-dlp -x --audio-format mp3 "URL"` |
| Qualidade máxima de 1080p | `yt-dlp -f "bv*[height<=1080]+ba/b[height<=1080]" "URL"` |
| Escolher pasta de destino | `yt-dlp -P "pasta/destino" "URL"` |
| Nome do arquivo personalizado | `yt-dlp -o "%(title)s.%(ext)s" "URL"` |
| Baixar legendas PT | `yt-dlp --write-subs --sub-langs "pt.*" "URL"` |
| Baixar playlist inteira | `yt-dlp -o "%(playlist_index)03d - %(title)s.%(ext)s" "URL_DA_PLAYLIST"` |
| Baixar só uma faixa da playlist | `yt-dlp --playlist-items 1-3 "URL_DA_PLAYLIST"` |
| Conteúdo com login (privado, idade) | `yt-dlp --cookies-from-browser chrome "URL"` |

## Regras

- Antes de rodar um download longo ou de playlist, confirme o link e a pasta de destino com o usuário.
- Se o download falhar com erro de extrator, atualize a ferramenta com `yt-dlp -U` ou `pip install -U yt-dlp` e tente de novo.
- Não use cookies do navegador sem o usuário pedir. Trate esses cookies como credenciais.
- Relate o resultado: caminho do arquivo, tamanho e qualidade escolhida.
