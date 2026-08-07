"""Support chat WebSocket hub.

Reuses the same shape as notifications_hub (per user_id + admin fanout).
ponytail: single-process only.
"""
from __future__ import annotations

from app.realtime.notifications_hub import NotificationHub

# Separate instance so support sockets don't mix with notification sockets.
support_hub = NotificationHub()
admin_support_hub = NotificationHub()
