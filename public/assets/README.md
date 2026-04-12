# Assets Folder

This folder contains all the images and assets needed for the storefront.

## Required Images

### Logo
- **logo.svg** or **logo.png** - St. Dreux Coffee logo (the white script text with icon)
- **logo-dark.svg** or **logo-dark.png** - Dark version for light backgrounds

### Background Images
- **coffee-cups.jpg** - Coffee cups image for auth pages left panel (the image with two coffee cups on wooden tray)
- **hero-background.jpg** - Main page hero section background (optional)

### Icons
- **google-icon.svg** - Google icon for social login
- **apple-icon.svg** - Apple icon for social login

## Image Guidelines

### Logo
- Format: SVG (preferred) or PNG
- Recommended size: 200x80px
- Transparent background for PNG

### Coffee Cups Background
- Format: JPG or PNG
- Recommended size: 1920x1080px or higher
- Aspect ratio: 16:9

### Icons
- Format: SVG (preferred)
- Size: 24x24px
- Single color or multi-color

## Usage

Images in this folder can be accessed in Next.js components using:

```tsx
import Image from 'next/image'

// For static images
<Image 
  src="/assets/images/logo.svg" 
  alt="St. Dreux Coffee"
  width={200}
  height={80}
/>

// Or with CSS background
<div style={{ backgroundImage: 'url(/assets/images/coffee-cups.jpg)' }}>
```

## Current Status

- ✅ Assets folder created
- ⏳ Logo files - **ADD THESE**
- ⏳ Coffee cups background - **ADD THESE**
- ⏳ Social login icons - **ADD THESE**

