import xml.etree.ElementTree as ET

svg_parking = '''<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E40AF" />
      <stop offset="55%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#3B82F6" />
    </linearGradient>
    <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#BAE6FD" />
    </linearGradient>
  </defs>
  <rect width="40" height="40" rx="11" fill="url(#bgGrad)" />
  <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="10.25" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" />
  <path d="M26.5 12C26.5 8.5 23 6.5 19.5 6.5C15.5 6.5 13 9.2 13 12.8C13 16.2 15.8 17.6 20 18.6C24.2 19.6 27 21.4 27 25.2C27 29.2 24 32 19.8 32C16 32 13 29.5 13 26" stroke="url(#strokeGrad)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="19.8" cy="12.2" r="2.2" fill="#FFFFFF" />
  <circle cx="20.2" cy="25.8" r="2.2" fill="#FFFFFF" />
</svg>'''

root = ET.fromstring(svg_parking)
print("Logo SVG is valid XML! Tag:", root.tag)

