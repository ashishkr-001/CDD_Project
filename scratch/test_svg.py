import xml.etree.ElementTree as ET

svg_str = '''<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="36" height="36" rx="10" fill="#2563EB" />
  <path d="M23.5 11.2C23.5 8.6 20.9 6.8 18 6.8C14.6 6.8 12.2 8.9 12.2 11.5C12.2 14.3 14.4 15.6 18 16.4C21.6 17.2 23.8 18.6 23.8 21.6C23.8 24.3 21.2 26.6 18 26.6C14.8 26.6 12.4 24.6 12.4 22" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="18" cy="11.5" r="1.8" fill="#FFFFFF" />
  <circle cx="18" cy="21.8" r="1.8" fill="#FFFFFF" />
</svg>'''

root = ET.fromstring(svg_str)
print("Parsed successfully:", root.tag)

