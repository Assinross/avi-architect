#!/usr/bin/env python3
"""Download five individually credited Wikimedia Commons thumbnails for Avi Architect.

Only a vetted allowlist is permitted. Images are committed by GitHub Actions
to the feature branch and then served locally by GitHub Pages, not hotlinked.
"""
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
import sys
import time

FILES = {
    'gaudi': 'Exterior de la Casa Batlló - 2026 - 01.jpg',
    'shukhov': 'Shukhov Tower photo by Maxim Fedorov (1).JPG',
    'fallingwater': 'Fallingwater, Pennsylvania.jpg',
    'pantheon': 'Pantheon (Rome) - Exterior 01.jpg',
    'brunelleschi': 'Cathedral of Santa Maria del Fiore, Firenze, Italy (Unsplash).jpg',
}
DEST = Path('public/architecture')
DEST.mkdir(parents=True, exist_ok=True)
MAX_BYTES = 2_500_000
HEADERS = {
    'User-Agent': 'AviArchitectEdu/1.0 (https://github.com/Assinross/avi-architect; Wikimedia Commons credited educational images)',
    'Accept': 'image/jpeg,image/*;q=0.9,*/*;q=0.5',
}

def fetch_image(filename):
    # The Special:Redirect endpoint resolves the exact Commons filename to
    # its CDN thumbnail. We never fetch an unreviewed URL from user input.
    url = 'https://commons.wikimedia.org/wiki/Special:Redirect/file/' + quote(filename, safe='') + '?width=800'
    request = Request(url, headers=HEADERS)
    with urlopen(request, timeout=90) as response:
        content_type = response.headers.get('Content-Type', '')
        data = response.read(MAX_BYTES + 1)
        if not content_type.startswith('image/') or not data.startswith(bytes.fromhex('ffd8ff')):
            raise ValueError(f'Expected JPEG, got {content_type}; URL {response.url}')
        if len(data) > MAX_BYTES or len(data) < 4_000:
            raise ValueError(f'Bad image size {len(data)} bytes')
        return data

errors = []
for image_id, filename in FILES.items():
    dest = DEST / f'{image_id}.jpg'
    if dest.exists() and dest.stat().st_size > 4_000:
        print(f'Already present: {dest}')
        continue
    for attempt in range(1, 4):
        try:
            data = fetch_image(filename)
            dest.write_bytes(data)
            print(f'{dest}: downloaded {len(data)} bytes')
            break
        except Exception as error:
            print(f'{image_id}: attempt {attempt} failed: {error}', file=sys.stderr)
            if attempt == 3:
                errors.append(image_id)
            else:
                time.sleep(attempt * 4)
    time.sleep(2)

if errors:
    sys.exit(f'Could not download: {", ".join(errors)}; SVG fallbacks remain available.')
