#!/usr/bin/env python3
"""Копіює файли гри (без api/) у app/src/main/assets/www і створює списки файлів та md5.
Запуск: python3 tools/sync_www.py /шлях/до/games2
Також записує games2/www-md5.txt — його треба залити на сервер разом з грою:
застосунок порівнює md5 і бере з інтернету лише змінені файли."""
import hashlib, os, shutil, sys
src = os.path.abspath(sys.argv[1]); root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dst = os.path.join(root, 'app', 'src', 'main', 'assets', 'www')
skip = lambda rel: rel.startswith('api/') or rel in ('README.md', 'www-md5.txt') or (rel.startswith('images/images_') and rel.endswith('.png'))
shutil.rmtree(dst, ignore_errors=True); files = []
for d, _, fs in os.walk(src):
    for f in fs:
        full = os.path.join(d, f); rel = os.path.relpath(full, src).replace(os.sep, '/')
        if skip(rel): continue
        os.makedirs(os.path.dirname(os.path.join(dst, rel)), exist_ok=True); shutil.copy2(full, os.path.join(dst, rel))
        files.append((rel, hashlib.md5(open(full, 'rb').read()).hexdigest()))
files.sort()
lines = '\n'.join(f'{r} {h}' for r, h in files) + '\n'
open(os.path.join(root, 'app', 'src', 'main', 'assets', 'www-files.txt'), 'w').write(lines)
open(os.path.join(src, 'www-md5.txt'), 'w').write(lines)
print(len(files), 'files')
