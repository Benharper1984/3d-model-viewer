# 3D Model Viewer - GitHub Copilot Instructions

## Project Goal
Create a simple password-protected 3D model viewer website using Google Model-Viewer, deployable to Vercel.

## Requirements
1. Single HTML page with password protection (client-side is fine)
2. After password entry, show Google Model-Viewer component
3. Support for GLB/GLTF files from SketchUp exports
4. Clean, responsive design
5. File structure ready for Vercel deployment

## Key Components Needed
- HTML page with password prompt
- Google Model-Viewer integration via CDN
- Basic CSS for responsive layout
- JavaScript for password validation and viewer display
- `public/` folder for 3D model files
- Simple drag-and-drop or file input for model loading

## Technical Specifications
- Use `@google/model-viewer` web component
- Password stored as JavaScript variable (client-side)
- Model viewer should have camera controls, auto-rotate, and touch support
- Responsive design for desktop and mobile
- Support GLB and GLTF formats

## File Structure
```
project/
├── index.html
├── public/
│   └── models/
└── vercel.json (if needed)
```

## Features to Include
- Password protection before viewer access
- Loading states for 3D models
- Error handling for unsupported files
- Clean, minimal UI focused on model viewing

## Implementation Notes
- Use Google Model-Viewer CDN: `https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js`
- Include camera-controls, touch-action, and auto-rotate attributes
- Hide viewer initially, show after correct password
- Add file input or drag-drop for model uploads
- Style for professional client presentation

## Deployment Target
- Vercel (static hosting)
- No backend required for basic implementation