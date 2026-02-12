# Design References

## Dithering / Halftone

- [Real-Time Dithering Shader (Codrops)](https://tympanus.net/Development/DitheringShader) — WebGL ordered dithering on imagery. Closest live demo to our background.
- [Interactive Bayer Dithering Backgrounds (Codrops)](https://tympanus.net/codrops/2025/07/30/interactive-webgl-backgrounds-a-quick-guide-to-bayer-dithering/) — CodePen demos of Bayer 2x2 through 16x16 with ripple effects. Sub-0.2ms at 4K.
- [Building a Real-Time Dithering Shader (Codrops)](https://tympanus.net/codrops/2025/06/04/building-a-real-time-dithering-shader/) — Step-by-step WebGL tutorial. Source on GitHub.
- [The Art of Dithering (Maxime Heckel)](https://blog.maximeheckel.com/posts/the-art-of-dithering-and-retro-shading-web/) — Interactive sandboxes with parameter sliders.
- [Ditherpunk (surma.dev)](https://surma.dev/things/ditherpunk/) — Definitive article on monochrome dithering. Upload your own images.
- [Halftone Aberration (CodePen)](https://codepen.io/theo-gil/pen/XzEMKY) — Blue-on-black halftone with hover. Close to "ghostly figure on dark background" vibe.
- [Parallax Halftone (CodePen)](https://codepen.io/ericjacksonwood/pen/LbVKoa) — 3D parallax on colored halftone dots.

## ASCII Art / Video-to-ASCII

- [Video-to-ASCII Converter](https://collidingscopes.github.io/ascii/) — Upload video, converts to ASCII in browser. Good for gut-checking the aesthetic.
- [ASCIIGen.art](https://asciigen.art) — React component + CLI for MP4→ASCII. $10 one-time.

## Return of the Obra Dinn (Gold Standard)

- [Obra Dinn Dithering Breakdown (Alan Zucconi)](https://www.alanzucconi.com/2018/10/24/shader-showcase-saturday-11/) — Bayer for characters, blue noise for environments.
- [Obra Dinn Forum Post Deep Dive](https://setsideb.com/a-forum-post-about-the-dithering-in-return-of-the-obra-dinn/) — Lucas Pope's own explanation including temporal stability techniques.
- [Godot Dither Shader](https://sambigos.itch.io/godot-dither-shader) — Obra Dinn-inspired, playable in browser.
