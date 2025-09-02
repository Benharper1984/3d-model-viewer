# Models Directory

This directory contains pre-loaded 3D models that visitors can view without uploading.

## How to Add Your Models

1. Export your SketchUp models as GLB files (recommended) or GLTF
2. Name them descriptively (e.g., `house-design-v1.glb`, `kitchen-layout.glb`)
3. Place them in this directory
4. Update the dropdown options in `index.html` to reference your files

## Current Placeholder Files

The following files are currently referenced in the dropdown but don't exist yet:
- `sample-house.glb`
- `sample-furniture.glb` 
- `sample-building.glb`

Replace these with your actual GLB files and update the dropdown labels accordingly.

## File Size Recommendations

- Keep files under 10MB for best performance
- Use GLB format for better compression
- Optimize models in SketchUp before exporting

## Updating the Dropdown

In `index.html`, find this section and update it with your actual files:

```html
<select id="preloadedModels" onchange="loadPreloadedModel(this.value)">
    <option value="">-- Select a model --</option>
    <option value="public/models/your-model-1.glb">Your Model Name 1</option>
    <option value="public/models/your-model-2.glb">Your Model Name 2</option>
    <option value="public/models/your-model-3.glb">Your Model Name 3</option>
</select>
```
