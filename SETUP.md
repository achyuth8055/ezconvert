# 🚀 ImageForge - Quick Setup Guide

## For Running on Another Computer

### Step 1: Clone the Repository
```bash
git clone https://github.com/achyuth8055/ezconvert.git
cd ezconvert
```

### Step 2: Create Virtual Environment

**On macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

**Note:** First time running background remover will download AI model (~176MB). Requires internet connection once.

### Step 4: Run the Application
```bash
python app.py
```

### Step 5: Open in Browser
```
http://localhost:5004
```

---

## Troubleshooting

### Port Already in Use
```bash
# macOS/Linux
lsof -ti:5004 | xargs kill -9

# Windows
netstat -ano | findstr :5004
taskkill /PID <PID_NUMBER> /F
```

### Virtual Environment Issues
```bash
# Delete and recreate
rm -rf venv  # macOS/Linux
rmdir /s venv  # Windows

python3 -m venv venv
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

### Missing Python/Pip
**macOS:**
```bash
brew install python3
```

**Windows:** Download from https://python.org/downloads

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

---

## Production Deployment

### Using Gunicorn (Linux/macOS)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5004 app:app
```

### Using Waitress (Windows/Cross-platform)
```bash
pip install waitress
waitress-serve --port=5004 app:app
```

### Using Docker
```bash
# Create Dockerfile in project root
docker build -t imageforge .
docker run -p 5004:5004 imageforge
```

---

## Features Included

✅ **Image Converter** - 9 formats including PDF
✅ **Image Resizer** - Pixels, percentage, social presets
✅ **Image Compressor** - Quality & target size compression
✅ **Image Cropper** - Interactive cropping
✅ **Background Remover** - AI-powered with design editor
✅ **QR Generator** - Multiple QR code types
✅ **Responsive Design** - Mobile, tablet, desktop
✅ **Loading Animations** - Consistent across all tools
✅ **SEO Optimized** - Meta tags, JSON-LD structured data

---

## System Requirements

- **Python:** 3.8 or higher
- **RAM:** 2GB minimum (4GB recommended for background removal)
- **Disk Space:** 500MB (includes AI models)
- **Browser:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## Security Notes

- Max file size: 10MB (configurable in `app.py`)
- Files stored temporarily and auto-cleaned
- No external data transmission (except initial AI model download)
- Use production WSGI server (Gunicorn/Waitress) for public deployment

---

## Repository Info

- **GitHub:** https://github.com/achyuth8055/ezconvert
- **Author:** Achyuth (@achyuth8055)
- **License:** MIT

For detailed documentation, see `README.md`
