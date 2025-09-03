# 3D Model Viewer

A comprehensive 3D model viewer with screenshot gallery, admin controls, and cloud storage integration. Built with Google Model-Viewer and designed for professional client presentations.

## Features

### Core Functionality
- 🔒 Role-based authentication (Admin/Client access)
- 📱 Responsive design for desktop and mobile
- 🎮 Interactive 3D model controls (rotate, zoom, pan)
- 📁 Drag & drop file upload
- ⚡ Auto-rotate functionality
- 🎯 Camera reset and controls
- 🌐 Vercel deployment with cloud storage

### Screenshot & Gallery System
- 📸 Interactive screenshot capture with area selection
- 🖼️ Cloud-stored screenshot gallery with metadata
- 💬 Comment system with user attribution
- 🏷️ Advanced tagging system with color-coded labels
- 👥 Admin/Client permission controls for tags
- 🎨 15-color curated palette for tag creation

### Admin Controls
- 🔧 Admin-only tag management and permissions
- 🗑️ Screenshot and comment deletion capabilities
- 👤 User role detection and access control
- 📊 Gallery management with pagination

## Supported File Formats

- GLB (recommended for SketchUp exports)
- GLTF

## Getting Started

### Local Development

1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. Default password is: `viewer123`

## Authentication & User Roles

### Admin Access
- Password: `testing123`
- Full access to all features including:
  - Tag creation and permission management
  - Screenshot and comment deletion
  - Gallery administration

### Client Access  
- Password: `LotuS`
- Limited access including:
  - Screenshot capture and viewing
  - Comment creation
  - Use of client-permitted tags only

## Screenshot Gallery System

### Taking Screenshots
1. Click the "Take Screenshot" button
2. Drag to select an area of the 3D model
3. Screenshot is automatically saved to cloud storage
4. Add comments and tags to organize your captures

### Tagging System
- **Color-coded tags** with 15 curated colors
- **Permission-based**: Admin can control which tags clients can use
- **Default client tags**: "Client approval", "Needs Review"
- **Admin-only tags**: "Admin Approved", "Rejected", "Feedback Required"

### Comments
- Add contextual comments to any screenshot
- User attribution with role display (Admin/Client)
- Admin can delete any comments, users can delete their own

### Adding Pre-loaded Models

1. Place your GLB/GLTF files in the `public/models/` directory
2. Modify the HTML to include a default model source:

```html
<model-viewer src="public/models/your-model.glb" ...>
```

## Deployment to Vercel

### Prerequisites
- Vercel account with Blob storage enabled
- Environment variable `BLOB_READ_WRITE_TOKEN` configured in Vercel dashboard

### Option 1: GitHub Integration (Recommended)
1. Push your code to a GitHub repository
2. Connect your GitHub account to Vercel
3. Import your repository
4. Add `BLOB_READ_WRITE_TOKEN` in Environment Variables
5. Deploy automatically

### Option 2: Vercel CLI
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Configure environment variables when prompted
4. Follow the deployment prompts

### Environment Variables Required
- `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob storage token for screenshot uploads

## API Endpoints

The application includes several Vercel serverless functions:

- `POST /api/screenshots` - Upload new screenshots with metadata
- `GET /api/screenshots` - List screenshots with pagination
- `DELETE /api/screenshots` - Delete specific screenshots
- `POST /api/upload-screenshot` - Alternative upload endpoint
- `GET /api/list-screenshots` - Alternative listing endpoint  
- `DELETE /api/delete-screenshot` - Alternative deletion endpoint

## 3D Model Controls

### Mouse/Trackpad Controls
- **Rotate**: Left-click and drag (or single finger drag on mobile)
- **Zoom**: Mouse wheel scroll (or pinch gesture on mobile)
- **Pan**: Right-click and drag (or two-finger drag on mobile)
- **Focus**: Double-click to focus on a point

### Touch Controls (Mobile/Tablet)
- **Rotate**: Single finger drag
- **Zoom**: Pinch to zoom in/out
- **Pan**: Two finger drag to move the model around

### Keyboard Shortcuts

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
├── index.html                    # Main application entry point
├── screenshot-test.html          # "The Thoughtful Father" project page
├── screenshot-test-debug.html    # Debug version with console logging
├── package.json                  # Dependencies and scripts
├── vercel.json                   # Vercel deployment configuration
├── css/
│   └── styles.css               # Comprehensive styling
├── js/
│   ├── app.js                   # Main application coordinator
│   ├── cloud-storage-manager.js # Vercel Blob storage integration
│   ├── gallery-manager.js       # Screenshot gallery and tagging system
│   ├── modal-manager.js         # Modal and overlay management
│   ├── model-viewer-controller.js # 3D model viewer controls
│   ├── screenshot-core.js       # Screenshot capture functionality
│   └── user-manager.js          # Authentication and user roles
├── api/
│   ├── screenshots.js           # Screenshot upload/download API
│   ├── upload-screenshot.js     # Screenshot upload endpoint
│   ├── list-screenshots.js      # Screenshot listing endpoint
│   └── delete-screenshot.js     # Screenshot deletion endpoint
├── public/
│   └── models/
│       ├── the-thoughtful-father/
│       │   ├── current-design.glb
│       │   └── README.md
│       └── the-favorite-neighbors/
│           └── README.md
└── README.md                    # This file
```

## Customization

### Styling
CSS is organized in `css/styles.css` with sections for:
- Gallery and screenshot styling
- Tag system with color palette
- Modal and overlay designs
- Responsive mobile layouts
- Admin interface styling

### Adding New Tag Colors
Edit the color palette in `js/gallery-manager.js`, line ~380:
```javascript
<div class="color-option" data-color="#your-color" style="background-color: #your-color" title="Your Color"></div>
```

### Model Viewer Options
The model viewer supports many attributes in the `<model-viewer>` element:
- `auto-rotate` - Automatic rotation
- `camera-controls` - User interaction
- `environment-image` - Lighting environment
- `shadow-intensity` - Shadow strength
- `exposure` - Brightness

### User Roles and Permissions
Modify user detection in `js/user-manager.js` to customize:
- Authentication methods
- Role assignment logic
- Permission structures

### Security Note

This implementation uses role-based authentication suitable for professional client presentations. Features include:
- Password-protected access with distinct Admin/Client roles
- Server-side screenshot storage via Vercel Blob
- Client-side role detection and permission enforcement
- Admin controls for content management

For enhanced security, consider implementing:
- Server-side authentication with JWT tokens
- Database-backed user management
- API rate limiting and validation

## Troubleshooting

### Screenshots Not Saving
- Check that `BLOB_READ_WRITE_TOKEN` is configured in Vercel
- Verify internet connection for cloud storage
- Screenshots will fall back to localStorage if cloud storage fails

### Model Won't Load
- Ensure the file is a valid GLB or GLTF
- Check file size (very large files may cause issues)
- Verify the model was exported correctly from SketchUp
- Check browser console for specific error messages

### Permission Issues
- Admin users (password: `testing123`) have full access
- Client users (password: `LotuS`) have limited tag permissions
- Clear browser localStorage if role detection fails

### Gallery Not Loading
- Check that cloud storage is properly configured
- Verify API endpoints are accessible
- Screenshots may be stored locally if cloud storage is unavailable

### Performance Issues
- Use GLB format for better compression
- Optimize models in SketchUp before exporting
- Consider reducing polygon count for complex models
- Enable browser hardware acceleration

### Mobile Issues
- Ensure touch gestures are working
- Check that the viewport meta tag is present
- Test on actual devices, not just browser dev tools
- Some features may have reduced functionality on mobile

## License

This project is open source and available under the MIT License.
