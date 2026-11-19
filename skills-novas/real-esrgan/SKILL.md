---
name: real-esrgan
description: Aumentar a resolução de imagens, fotos antigas, ilustrações e vídeos com o Real-ESRGAN (IA). Use quando o usuário pedir upscale, aumentar resolução, melhorar nitidez, restaurar rosto ou ampliar imagem ou vídeo em 2x/4x.
---

# Real-ESRGAN

Modelo de IA para upscale de imagens e vídeos com boa preservação de detalhes. Há dois caminhos: o executável `realesrgan-ncnn-vulkan` (rápido, sem Python, roda em GPU Vulkan ou CPU) e o script Python `inference_realesrgan.py` (mais controle, precisa de PyTorch).

## Pré-requisitos

Escolha um caminho:

- **Executável pronto:** baixar a release `realesrgan-ncnn-vulkan` do repositório oficial (github.com/xinntao/Real-ESRGAN, seção Releases) e colocar no PATH.
- **Python:** `pip install realesrgan basicsr` (com PyTorch já instalado). Para o modelo de rosto, `pip install gfpgan`.

Verificar: `realesrgan-ncnn-vulkan -h` ou `python -c "import realesrgan"`.

## Escolha do modelo

| Caso | Modelo |
|---|---|
| Foto real, uso geral | `RealESRGAN_x4plus` |
| Ilustração, anime, arte | `RealESRGAN_x4plus_anime_6B` |
| Vídeo de anime | `realesr-animevideov3` |
| Foto com rosto | `RealESRGAN_x4plus` + `--face_enhance` (Python) |

## Comandos

Imagem, executável ncnn:
`realesrgan-ncnn-vulkan -i entrada.jpg -o saida.png -n realesrgan-x4plus -s 4`

Imagem, Python:
`python inference_realesrgan.py -n RealESRGAN_x4plus -i entrada.jpg -o resultados --outscale 4`

Pasta inteira, Python:
`python inference_realesrgan.py -n RealESRGAN_x4plus -i pasta_entrada -o pasta_saida --outscale 4`

Memória limitada (GPU pequena):
adicionar `--tile 256` (Python) ou `-t 256` (ncnn).

Vídeo: extrair os quadros, aplicar o upscale na pasta de quadros e remontar com o áudio original.
1. `ffmpeg -i video.mp4 -qscale:v 1 frames/frame%08d.png`
2. aplicar o upscale em `frames/` para `frames_out/`
3. `ffmpeg -framerate FPS -i frames_out/frame%08d.png -i video.mp4 -map 0:v -map 1:a? -c:v libx264 -pix_fmt yuv420p -c:a copy saida.mp4`

Trocar `FPS` pelo fps do vídeo original (`ffprobe -v error -select_streams v -show_entries stream=r_frame_rate video.mp4`).

## Regras

- Antes de processar um lote grande ou vídeo longo, confirme o fator de escala, o modelo e a pasta de saída com o usuário.
- Mantenha o original. Nunca sobrescreva o arquivo de entrada.
- Vídeo gera muitos arquivos temporários. Verifique o espaço em disco antes de extrair os quadros e apague a pasta de quadros no fim, se o usuário não pedir para manter.
- Se faltar memória, reduza com `--tile` antes de tentar de novo.
- Relate o resultado: caminho, resolução final e modelo usado.
