## TILESMAP Editor

**TILESMAP Editor** is a standalone HTML/CSS/JavaScript web application designed to convert indexed PNG images into Sega Master System compatible tile, palette, and tilemap data.

The tool runs entirely in the browser and does not require any server-side processing.

<img width="1375" height="958" alt="screenshot" src="https://github.com/user-attachments/assets/fe0b7547-061f-47a3-92b1-26ddf224f273" />

### Main Features

* Import indexed PNG images with up to 16 colors.
* Validate PNG dimensions, which must be multiples of 8 pixels.
* Automatically split the source image into 8×8 tiles.
* Generate Sega Master System tile data, with each tile encoded as 32 bytes.
* Remove duplicate tiles.
* Detect and remove horizontally, vertically, and HV mirrored tiles.
* Reorganize tiles manually through a visual tile shelf.
* Highlight all source occurrences of a tile when hovering over it.
* Edit individual tiles directly in the browser with an 8×8 pixel editor.
* Rebuild the source image, tile shelf, exports, and tilemap after editing.

### Palette Features

* Display and edit the active 16-color palette.
* Reorder palette colors for export.
* Modify colors using the Sega Master System RGB222 color space.
* Import external palettes without changing tile pixel indices.
* Add multiple palette variants to quickly test different color sets on the same image.
* Switch between palette variants instantly.
* Delete inactive palette variants.
* Export palettes using the current palette order.

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
* ACT Photoshop palette
* GPL GIMP palette

### Tile Export Formats

* PNG tileset
* BIN raw tile data
* PSG compressed data using PSGaiden compression
* ZX7 compressed tile data
* TSX Tiled tileset XML

### Tilemap Export Formats

* BIN, using 16-bit little-endian Master System tilemap entries
* ASM WLA-DX
* RLE compressed tilemap
* STM ShrunkTileMap-style compressed tilemap
* TMX Tiled map XML

### Compression Support

The editor includes browser-side compression support for:

* PSGaiden compression for tile graphics
* ZX7 compression for raw tile data
* RLE compression for tilemap data
* STM compression based on the ShrunkTileMap format

### Sega Master System Tilemap Flags

Tilemap entries are exported as 16-bit values using the Master System format:

* Base value: tile index + start value
* `0x0200`: horizontal flip
* `0x0400`: vertical flip
* `0x0800`: palette 2
* `0x1000`: priority / foreground

For Tiled TMX exports, tile IDs are shifted by `+1` because `0` is reserved for empty tiles, and mirror flags are converted to Tiled 32-bit flip flags.

### Tiled Export Support

The editor can export data for use with **Tiled**:

* TSX tileset files linked to the exported PNG tileset.
* TMX map files using CSV tile data.
* Optional ZIP export including TMX, TSX, and PNG files together.
* Optional standalone TMX or TSX export.

### Fully Browser-Based

Tile Editor is designed as a self-contained web tool:

* No installation required.
* No backend required.
* No external processing.
* Works directly from static HTML, CSS, and JavaScript files.
