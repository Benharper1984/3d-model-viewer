# 3D Model Viewer

A password-protected 3D model viewer website built with Google Model-Viewer, designed for viewing SketchUp GLB/GLTF exports.

## Features

- 🔒 Password protection (client-side)
- 📱 Responsive design for desktop and mobile
- 🎮 Interactive 3D model controls (rotate, zoom, pan)
- 📁 Drag & drop file upload
- ⚡ Auto-rotate functionality
- 🎯 Camera reset and controls
- 🌐 Ready for Vercel deployment

## Supported File Formats

- GLB (recommended for SketchUp exports)
- GLTF

## Getting Started

### Local Development

1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. Default password is: `viewer123`

### Changing the Password

Edit the `CORRECT_PASSWORD` variable in the JavaScript section of `index.html`:

```javascript
const CORRECT_PASSWORD = "your-new-password";
```

### Adding Pre-loaded Models

1. Place your GLB/GLTF files in the `public/models/` directory
2. Modify the HTML to include a default model source:

```html
<model-viewer src="public/models/your-model.glb" ...>
```

## Deployment to Vercel

### Option 1: Vercel CLI

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts

### Option 2: GitHub Integration

1. Push your code to a GitHub repository
2. Connect your GitHub account to Vercel
3. Import your repository
4. Deploy automatically

### Option 3: Drag & Drop

1. Visit [vercel.com](https://vercel.com)
2. Drag and drop your project folder
3. Deploy instantly

## Keyboard Shortcuts

When the viewer is active:
- `R` - Reset camera position
- `A` - Toggle auto-rotate
- `W` - Toggle wireframe/environment

## Browser Compatibility

- Chrome 66+ (recommended)
- Firefox 65+
- Safari 12+
- Edge 79+

## File Structure

```
project/
├── index.html          # Main application file
├── public/
│   └── models/         # Directory for 3D model files
├── vercel.json         # Vercel deployment configuration
└── README.md           # This file
```

## Customization

### Styling

The CSS is embedded in the HTML file. You can modify:
- Colors and gradients
- Layout and spacing
- Button styles
- Loading animations

### Model Viewer Options

The model viewer supports many attributes:
- `auto-rotate` - Automatic rotation
- `camera-controls` - User interaction
- `environment-image` - Lighting environment
- `shadow-intensity` - Shadow strength
- `exposure` - Brightness

### Security Note

This implementation uses client-side password protection, which is suitable for basic access control but not for sensitive content. For production use with sensitive models, consider implementing server-side authentication.

## Troubleshooting

### Model Won't Load
- Ensure the file is a valid GLB or GLTF
- Check file size (very large files may cause issues)
- Verify the model was exported correctly from SketchUp

### Performance Issues
- Use GLB format for better compression
- Optimize models in SketchUp before exporting
- Consider reducing polygon count for complex models

### Mobile Issues
- Ensure touch gestures are working
- Check that the viewport meta tag is present
- Test on actual devices, not just browser dev tools

## License

This project is open source and available under the MIT License.
