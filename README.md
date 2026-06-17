# Image Page Number ZIP Tool

A professional single-page website built with HTML, CSS, and JavaScript.

## Features

- Upload one or more images
- Natural filename sorting  
  Example: `0, 1, 2, 3, 10, 11`
- Manual drag-and-drop reordering
- Small page number preview at the top-right corner
- Output all numbered images as a ZIP file
- Client-side processing only
- Works on Kali Linux using a browser

## Supported image types

- PNG
- JPG / JPEG
- WEBP

Note: WEBP output will be converted to JPG inside the ZIP because browser canvas export support is more consistent with JPG/PNG.

## Run on Kali Linux

Open terminal:

```bash
cd image-page-number-tool
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Offline JSZip setup

The project uses JSZip from CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
```

If you want fully offline use:

1. Create a folder:

```bash
mkdir vendor
```

2. Download `jszip.min.js` and put it inside:

```text
vendor/jszip.min.js
```

3. Replace the CDN script in `index.html` with:

```html
<script src="vendor/jszip.min.js"></script>
```

## Project structure

```text
image-page-number-tool/
├── index.html
├── style.css
├── app.js
└── README.md
```

## Customisation

In the website UI, you can change:

- Start page number
- Number size
- Top-right corner padding
- ZIP file name
