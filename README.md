## TILESMAP Editor

**TILESMAP Editor** is a standalone HTML/CSS/JavaScript web application designed to convert PNG images into Sega Master System and Game Gear compatible **tile**, **palette**, and **tilemap** data.

The tool runs entirely in the browser and does not require any server-side processing.

<img width="1566" height="901" alt="Capture d’écran 2026-07-01 à 17 17 30 (2)" src="https://github.com/user-attachments/assets/b703ea1c-4312-4ded-b0fb-76f24919765c" />

**Online version** https://tilesmap.2minds.fr/


### Main Features

* Import PNG images: indexed (up to 32 colors) or 24-bit RGB.
* Validate PNG dimensions, which must be multiples of 8 pixels.
* Automatically quantize 24-bit PNGs to RGB222 (SMS) or RGB444 (Game Gear) with automatic mode detection.
* Automatically split the source image into 8×8 tiles.
* Generate Sega Master System / Game Gear tile data, with each tile encoded as 32 bytes.
* Remove duplicate tiles.
* Detect and remove horizontally, vertically, and HV mirrored tiles.
* Reorganize tiles manually through a visual tile shelf.
* Highlight all source occurrences of a tile when hovering over it.
* Hover a tile in the source image to highlight it in the tile shelf with an ID/occurrences tooltip.
* Edit individual tiles directly in the browser with an 8×8 pixel editor.
* Rebuild the source image, tile shelf, exports, and tilemap after editing.
* Define a maximum tile budget and display warnings when the optimized tile count exceeds it.
* Dynamic tile shelf column count that adapts to the panel width.

### Palette Features

* Display and edit 16-color palettes.
* Reorder palette colors for export.
* Support both Sega Master System and Game Gear palette modes.
* Use SMS RGB222 colors by default.
* Automatically switch to Game Gear mode when colors exceed the SMS RGB222 color space.
* Edit SMS colors through a 64-color RGB222 picker.
* Edit Game Gear colors through an RGB picker, with values exported as RGB444.
* Automatic hue-based sorting when quantizing 24-bit PNGs.
* Automatic padding with black entries for palettes with fewer than 16 colors on export.
* Import external palettes without changing tile pixel indices.
* Add multiple palette variants to quickly test different color sets on the same image.
* Switch between palette variants instantly.
* Delete inactive palette variants.
* Export palettes using the current palette order.

### Dual-Palette Support

For 24-bit PNGs requiring more than 16 unique colors (up to 32), the editor automatically distributes tiles across **two 16-color palettes** using a greedy per-tile color-set assignment algorithm.

* Each tile is constrained to reference only one of the two palettes.
* Palette 1 and Palette 2 are exposed as two separate variants that can each be edited and reordered independently.
* A visual `[2]` badge (rendered as SVG, crisp at any zoom level) marks tiles that use Palette 2 in both the source view and the tile shelf.
* One-click swap button (`⇅ Échanger P1 ↔ P2`) exchanges the two palettes and remaps every tile accordingly; `[2]` badges follow automatically.
* Clicking a tile in the shelf toggles its palette assignment between P1 and P2.
* Importing a new palette variant while in dual mode prompts for slot assignment (P1 or P2).
* Palette color reordering is scoped to the active slot only, preserving the pal1/pal2 boundary.
* The Palette 2 bit (`0x0800`) is automatically set per-tile in tilemap exports based on each tile's palette assignment.

### Supported Palette Formats

Import:

* BIN
* ASM WLA-DX
* ACT Photoshop palette
* GPL GIMP palette
* Indexed PNG palette

Export:

* BIN
* ASM WLA-DX
* C (`.c` + `.h` header pair packaged as a ZIP archive)
* ACT Photoshop palette
* GPL GIMP palette
* JASC Paint Shop Pro palette (`.pal`)

### Palette Export Modes

SMS mode:

* BIN export uses 8-bit values.
* ASM export uses WLA-DX `.db $00` values.
* C export declares `extern const unsigned char {name}_palette[N];` with `0x00` values in the header/implementation pair.
* Colors are encoded as SMS RGB222 values.

Game Gear mode:

* BIN export uses 16-bit little-endian values.
* ASM export uses WLA-DX `.dw $0000` values.
* C export declares `extern const unsigned short {name}_palette[N];` with `0x0000` values.
* Colors are encoded as Game Gear RGB444 values.

### Tile Export Formats

* PNG tileset
* BIN raw tile data
* C (`.c` + `.h` header pair packaged as a ZIP archive, declaring `extern const unsigned char {name}_tiles[N];`)
* PSG compressed data using PSGaiden compression
* ZX7 compressed tile data
* TSX Tiled tileset XML

For TSX export, the editor can generate either a standalone TSX file or a ZIP archive containing both the TSX file and its linked PNG tileset.

### Tilemap Export Formats

* BIN, using 16-bit little-endian Master System tilemap entries
* ASM WLA-DX
* C (`.c` + `.h` header pair packaged as a ZIP archive, declaring `extern const unsigned short {name}_tilemap[N];`)
* RLE compressed tilemap
* STM ShrunkTileMap-style compressed tilemap
* TMX Tiled map XML

For TMX export, the editor can generate either a standalone TMX file or a ZIP archive containing the TMX file, the linked TSX tileset, and the PNG tileset.

### Compression Support

The editor includes browser-side compression support for:

* PSGaiden compression for tile graphics
* ZX7 compression for raw tile data
* RLE compression for tilemap data
* STM compression based on the ShrunkTileMap format

### Sega Master System Tilemap Flags

Tilemap entries are exported as 16-bit values using the Sega Master System format:

* Base value: tile index + start value
* `0x0200`: horizontal flip
* `0x0400`: vertical flip
* `0x0800`: palette 2 (set automatically per-tile from the tile's palette assignment, OR globally forced via the tilemap option)
* `0x1000`: priority / foreground

The same tilemap flag structure is also useful for Game Gear projects using the same VDP tilemap format.

### Tiled Export Support

The editor can export data for use with **Tiled**:

* TSX tileset files linked to the exported PNG tileset.
* TMX map files using CSV tile data.
* Tile IDs are shifted by `+1`, because `0` is reserved for empty tiles in Tiled.
* Horizontal and vertical mirror flags are converted to Tiled 32-bit flip flags.
* SMS-specific palette and priority flags are exported as Tiled properties.
* Optional ZIP export including TMX, TSX, and PNG files together.
* Optional standalone TMX or TSX export.

### Localization

The interface supports external language files:

* `lang.js`
* `lang-fr.js`
* `lang-en.js`

Language selection is available through flag icons, and the default language is selected from the browser language when available.

### Fully Browser-Based

TILESMAP Editor is designed as a self-contained web tool:

* No installation required.
* No backend required.
* No external processing.
* Works directly from static HTML, CSS, and JavaScript files.
