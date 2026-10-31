import io
from datetime import datetime, timezone

from PIL import Image, ImageChops, ImageDraw

from app.services.certificates import _render, _TEMPLATE_PATH


def test_certificate_fields_stay_inside_new_template():
    template = Image.open(_TEMPLATE_PATH).convert("RGB")
    for name in ("Иванов Иван Иванович", "Длиннаяфамилия" * 14):
        result = Image.open(io.BytesIO(_render(
            name, 123, datetime(2026, 10, 31, tzinfo=timezone.utc),
            "https://example.com/api/v1/certificates/123",
        ))).convert("RGB")
        difference = ImageChops.difference(template, result)
        for box in ((395, 457, 1096, 538), (95, 900, 345, 940),
                    (445, 900, 685, 940), (1146, 854, 1253, 962)):
            assert difference.crop(box).getbbox() is not None
            ImageDraw.Draw(difference).rectangle(box, fill=(0, 0, 0))
        assert difference.getbbox() is None
