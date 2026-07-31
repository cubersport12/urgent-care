"""Self-check: notification read flag from read_at."""
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.api.v1.notifications import _out


def main() -> None:
    unread = SimpleNamespace(
        id=uuid4(),
        title="t",
        body="b",
        created_at=datetime.now(timezone.utc),
        read_at=None,
    )
    read = SimpleNamespace(
        id=uuid4(),
        title="t",
        body="b",
        created_at=datetime.now(timezone.utc),
        read_at=datetime.now(timezone.utc),
    )
    assert _out(unread).is_read is False
    assert _out(read).is_read is True
    print("ok")


if __name__ == "__main__":
    main()
