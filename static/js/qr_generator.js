// QR Generator State
let qrCode = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeControls();
});

// Initialize Controls
function initializeControls() {
    const contentType = document.getElementById('contentType');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const qrFgColor = document.getElementById('qrFgColor');
    const qrBgColor = document.getElementById('qrBgColor');
    const qrFgColorText = document.getElementById('qrFgColorText');
    const qrBgColorText = document.getElementById('qrBgColorText');
    
    // Content type change
    contentType.addEventListener('change', (e) => {
        switchContentType(e.target.value);
    });
    
    // Color pickers
    qrFgColor.addEventListener('input', (e) => {
        qrFgColorText.value = e.target.value;
    });
    
    qrBgColor.addEventListener('input', (e) => {
        qrBgColorText.value = e.target.value;
    });
    
    // Generate button
    generateBtn.addEventListener('click', () => {
        generateQRCode();
    });
    
    // Download button
    downloadBtn.addEventListener('click', () => {
        downloadQRCode();
    });
    
    // Enter key to generate
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            generateQRCode();
        }
    });
}

// Switch content type
function switchContentType(type) {
    // Hide all inputs
    document.getElementById('urlInput').style.display = 'none';
    document.getElementById('textInput').style.display = 'none';
    document.getElementById('emailInput').style.display = 'none';
    document.getElementById('phoneInput').style.display = 'none';
    document.getElementById('smsInput').style.display = 'none';
    document.getElementById('wifiInput').style.display = 'none';
    
    // Show selected input
    switch(type) {
        case 'url':
            document.getElementById('urlInput').style.display = 'block';
            break;
        case 'text':
            document.getElementById('textInput').style.display = 'block';
            break;
        case 'email':
            document.getElementById('emailInput').style.display = 'block';
            break;
        case 'phone':
            document.getElementById('phoneInput').style.display = 'block';
            break;
        case 'sms':
            document.getElementById('smsInput').style.display = 'block';
            break;
        case 'wifi':
            document.getElementById('wifiInput').style.display = 'block';
            break;
    }
}

// Generate QR Code
function generateQRCode() {
    const contentType = document.getElementById('contentType').value;
    const size = parseInt(document.getElementById('qrSize').value);
    const fgColor = document.getElementById('qrFgColor').value;
    const bgColor = document.getElementById('qrBgColor').value;
    const errorCorrection = document.getElementById('qrErrorCorrection').value;
    
    // Get content based on type
    let content = getContentByType(contentType);
    
    if (!content) {
        NotificationModal.error('Please enter content for the QR code');
        return;
    }
    
    // Clear previous QR code
    const container = document.getElementById('qrCodeContainer');
    container.innerHTML = '';
    
    // Hide placeholder, show container
    document.getElementById('previewPlaceholder').style.display = 'none';
    container.style.display = 'flex';
    
    // Generate QR code
    qrCode = new QRCode(container, {
        text: content,
        width: size,
        height: size,
        colorDark: fgColor,
        colorLight: bgColor,
        correctLevel: QRCode.CorrectLevel[errorCorrection]
    });
    
    // Update info
    document.getElementById('qrSizeInfo').textContent = `${size} × ${size} px`;
    document.getElementById('qrEcInfo').textContent = getErrorCorrectionName(errorCorrection);
    document.getElementById('previewInfo').style.display = 'block';
    document.getElementById('downloadBtn').style.display = 'block';
}

// Get content by type
function getContentByType(type) {
    switch(type) {
        case 'url':
            const url = document.getElementById('qrUrl').value.trim();
            if (!url) return null;
            // Add https:// if not present
            return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
        
        case 'text':
            return document.getElementById('qrText').value.trim();
        
        case 'email':
            const email = document.getElementById('qrEmail').value.trim();
            const subject = document.getElementById('qrEmailSubject').value.trim();
            const body = document.getElementById('qrEmailBody').value.trim();
            if (!email) return null;
            let emailStr = `mailto:${email}`;
            const params = [];
            if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
            if (body) params.push(`body=${encodeURIComponent(body)}`);
            if (params.length > 0) emailStr += `?${params.join('&')}`;
            return emailStr;
        
        case 'phone':
            const phone = document.getElementById('qrPhone').value.trim();
            if (!phone) return null;
            return `tel:${phone}`;
        
        case 'sms':
            const smsPhone = document.getElementById('qrSmsPhone').value.trim();
            const smsMessage = document.getElementById('qrSmsMessage').value.trim();
            if (!smsPhone) return null;
            return smsMessage ? `sms:${smsPhone}?body=${encodeURIComponent(smsMessage)}` : `sms:${smsPhone}`;
        
        case 'wifi':
            const ssid = document.getElementById('qrWifiSsid').value.trim();
            const password = document.getElementById('qrWifiPassword').value.trim();
            const security = document.getElementById('qrWifiSecurity').value;
            if (!ssid) return null;
            // WiFi QR code format: WIFI:T:WPA;S:MyNetwork;P:MyPassword;;
            return `WIFI:T:${security};S:${ssid};P:${password};;`;
        
        default:
            return null;
    }
}

// Get error correction name
function getErrorCorrectionName(level) {
    switch(level) {
        case 'L': return 'Low (7%)';
        case 'M': return 'Medium (15%)';
        case 'Q': return 'Quartile (25%)';
        case 'H': return 'High (30%)';
        default: return 'Medium (15%)';
    }
}

// Download QR Code
function downloadQRCode() {
    const container = document.getElementById('qrCodeContainer');
    const canvas = container.querySelector('canvas');
    
    if (!canvas) {
        NotificationModal.error('Please generate a QR code first');
        return;
    }
    
    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qrcode_${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
    });
}
