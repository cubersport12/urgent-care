"""In-process notification WebSocket hub keyed by user_id.

ponytail: single-process only; use Redis pub/sub if you run multiple workers.
"""
from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket


class NotificationHub:
    def __init__(self) -> None:
        self._by_user: dict[UUID, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: UUID, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._by_user[user_id].add(ws)

    async def disconnect(self, user_id: UUID, ws: WebSocket) -> None:
        async with self._lock:
            sockets = self._by_user.get(user_id)
            if not sockets:
                return
            sockets.discard(ws)
            if not sockets:
                self._by_user.pop(user_id, None)

    async def send_user(self, user_id: UUID, payload: dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._by_user.get(user_id, ()))
        await self._send_many(sockets, payload)

    async def broadcast(self, payload: dict[str, Any]) -> None:
        async with self._lock:
            sockets = [ws for group in self._by_user.values() for ws in group]
        await self._send_many(sockets, payload)

    async def _send_many(self, sockets: list[WebSocket], payload: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    for uid, group in list(self._by_user.items()):
                        if ws in group:
                            group.discard(ws)
                            if not group:
                                self._by_user.pop(uid, None)


notification_hub = NotificationHub()
