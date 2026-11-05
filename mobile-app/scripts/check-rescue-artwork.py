"""Check rescue completion assets: python scripts/check-rescue-artwork.py."""
from pathlib import Path

assets = Path(__file__).resolve().parents[1] / 'assets' / 'images' / 'rescue'
gif_assets = [asset.name for asset in assets.iterdir() if asset.is_file() and asset.suffix.lower() == '.gif']
assert not gif_assets, f'rescue GIF assets must stay removed: {gif_assets}'
for name in ('success-final.png', 'success-dark-final.png', 'failure-final.png', 'failure-dark-final.png'):
    assert (assets / name).is_file(), f'missing rescue completion image: {name}'
print('Rescue completion uses only the four static PNG assets')
