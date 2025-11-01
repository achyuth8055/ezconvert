# ImageResizer - Professional Image Processing Tool

A full-stack web application for resizing, cropping, compressing, and converting images with a modern dark theme UI.

## ✨ Features

- **📐 Resize** - By pixels, percentage, or social media presets
- **✂️ Crop** - Free-form and aspect-ratio cropping with Fabric.js
- **🗜️ Compress** - Quality-based compression with live preview
- **🔄 Convert** - Format conversion (PNG, JPG, WebP, GIF, etc.)
- **☁️ Cloud Upload** - Support for Dropbox, Google Drive, OneDrive
- **🌐 URL Import** - Load images directly from URLs
- **📱 Responsive** - Works on desktop and mobile devices

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the Application

```bash
python app.py
```

### 3. Open in Browser

```
http://localhost:5004
```

## 📋 Current Status

### ✅ Completed
- **Homepage** - Fully functional with upload dropzone, cloud storage placeholders, URL import
- **Dark Theme UI** - Professional design matching provided screenshots
- **File Upload** - Drag & drop, device selection, validation
- **Backend API** - Image processing endpoints for all operations
- **Flask Routes** - All tool pages routed correctly

### 🚧 In Progress
- **Resize Tool UI** - Needs update to match screenshot (3 tabs: By Size, Percentage, Social Media)
- **Crop Tool** - Requires Fabric.js integration for free-form selection
- **Compress Tool UI** - Needs quality slider and preview panel
- **Convert Tool UI** - Needs advanced options and format selector

## 🔑 Cloud Storage Setup (Optional)

1. Create `.env` file from template:
```bash
cp .env.example .env
```

2. Add your API keys to `.env`:
```env
DROPBOX_APP_KEY=your_key_here
GOOGLE_CLIENT_ID=your_client_id_here
```

3. See `IMPLEMENTATION_GUIDE.md` for detailed instructions

## 📁 Project Structure

```
Image Conversion/
├── app.py                    # Flask application
├── requirements.txt          # Dependencies
├── README.md                 # This file
├── IMPLEMENTATION_GUIDE.md   # Detailed implementation guide
├── .env.example              # Environment variables template
├── static/
│   ├── css/
│   │   ├── main.css         # Homepage styles (✅)
│   │   └── [tools].css      # Tool-specific styles
│   └── js/
│       ├── main.js          # Homepage logic (✅)
│       └── [tools].js       # Tool-specific scripts
├── templates/
│   ├── index.html           # New homepage (✅)
│   └── [tools].html         # Tool pages
└── uploads/                 # Temporary storage
```

## 🛠️ Technologies

- **Backend**: Flask 3.0.3, Pillow 10.3.0
- **Frontend**: Vanilla JavaScript, CSS3
- **Canvas**: Fabric.js (for crop tool)
- **Image Processing**: PIL/Pillow
- **Optional**: Real-ESRGAN (AI upscaling)

## 📖 Documentation

- **IMPLEMENTATION_GUIDE.md** - Complete implementation details
- **Screenshots** - UI reference provided
- **API Docs** - See Flask routes in `app.py`

## 🎨 Design

- **Color Scheme**: Dark theme with blue accents
- **Typography**: System fonts (SF Pro, Segoe UI)
- **Responsive**: Mobile-first approach
- **Animations**: Smooth transitions (200ms)

## 🔧 Development

### Run in Debug Mode
```bash
python app.py
```

### Access Different Pages
- Homepage: `http://localhost:5004/`
- Resizer: `http://localhost:5004/resizer`
- Cropper: `http://localhost:5004/cropper`
- Compressor: `http://localhost:5004/compressor`
- Converter: `http://localhost:5004/converter`

## 📝 Next Steps

1. **Update Tool UIs** - Match all tool pages to screenshots
2. **Add Fabric.js** - Integrate for crop tool
3. **Cloud APIs** - Configure Dropbox/Google Drive APIs
4. **Testing** - Cross-browser and mobile testing
5. **Optimization** - Performance and loading times

## 🤝 Contributing

1. Follow the design guidelines in `IMPLEMENTATION_GUIDE.md`
2. Maintain UI consistency across all tools
3. Use existing CSS variables and components
4. Test thoroughly before committing

## 📄 License

This project is for educational/portfolio purposes.

## 👤 Author

Built following professional design specifications.

---

**Homepage Status**: ✅ Complete  
**Tool Pages Status**: 🚧 In Progress  
**Last Updated**: October 31, 2025
