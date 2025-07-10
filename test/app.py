import pytesseract
from PIL import Image

img = Image.open("/Volumes/Work/Extract/WhatsApp Image 2025-07-01 at 23.41.55.jpeg")
text = pytesseract.image_to_string(img)

print(text)
