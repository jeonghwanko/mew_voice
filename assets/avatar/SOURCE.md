# 3D cat asset provenance

Retrieved 2026-09-11. These files are open licensed 3D artwork, not an application code library.

| File | Purpose |
| --- | --- |
| `quaternius-cat.glb` | Unmodified source, 238,672 bytes; retained for reproducibility, not imported by the app |
| `mew-cat.glb` | App variant, 280,612 bytes; bundled locally by Metro |

- Title: **Cat**
- Creator: **Quaternius**
- Source/model/license declaration: https://poly.pizza/m/qKICY6xla2
- Download: https://static.poly.pizza/67f5e3fe-37ee-4c86-95c8-d269d8c9f8ba.glb
- License: **CC0 1.0 Universal**, https://creativecommons.org/publicdomain/zero/1.0/
- Legal code: https://creativecommons.org/publicdomain/zero/1.0/legalcode.en
- Source SHA-256: `842c5f96c480b9a7800994345ed83be5e9ba5fc8e18be633f2b7cfe09cf8fef7`
- Variant SHA-256: `4e7b65c267783fa189b15b081b91272bfad4bce35b1e4709d1fb80035a128b8f`

CC0 permits copying, modification and distribution, including commercial use. Attribution is not required; creator/source are retained here for provenance. No proprietary model, subscription or runtime CDN is used.

## Modifications

`../../scripts/prepare-cat.cjs` reproducibly splits atlas-colored faces into named Fur/Muzzle/Nose/Iris materials, adds inset pupils that retain the original skin weights, replaces glossy metallic material with matte PBR, and simplifies clip names. It preserves the original mesh silhouette, skeleton and all eight animations. The app imports only the variant. Unused original binary buffer sections remain in the variant so accessor offsets remain stable; no image/texture is referenced or decoded at runtime.

Runtime changes: cream/ginger/smoke/tuxedo palettes, iris colors, body width, head scale, view angle, optional ribbon, soft lighting, pedestal and restrained idle/head gestures. There is no jaw bone, facial blendshape or phoneme lip sync in this source. `ears` is the v1 preference field for the UI's **face size**, applied to the Head bone.

Rebuild after `npm install` in apps/mobile:

```powershell
node apps/mobile/scripts/prepare-cat.cjs
```

Run that command from the repository root. The script reads the original file, never downloads a mutable replacement automatically. If replacing the source, review its license, palette, joints and tests again.

## Alternatives researched

- [Kenney Cube Pets](https://kenney.nl/assets/cube-pets): CC0, animated block animal pack. A viable alternate art direction.
- [Cat by madtrollstudio](https://poly.pizza/m/YvVobPlTlQ): Creative Commons Attribution; no animation tag on listing. Less convenient for the initial animated customization flow.
- [Quaternius Ultimate Animated Animal Pack](https://quaternius.com/packs/ultimateanimatedanimals.html): CC0, glTF and Blender source available. This pack's listing is supporting pipeline research, not evidence that our downloaded cat belongs to that exact pack.
