"""Rescue scene graph validation logic."""
from __future__ import annotations

from typing import Any


class RescueGraphValidationError(ValueError):
    """Validation error in rescue scenario graph."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__("; ".join(errors))


def validate_rescue_graph(data: dict[str, Any] | None) -> list[str]:
    """Validate scene graph in rescue data. Returns list of error messages."""
    if not data or not isinstance(data, dict):
        return []

    scenes = data.get("scenes")
    if not isinstance(scenes, list) or len(scenes) == 0:
        return []

    errors: list[str] = []
    scene_ids = {s.get("id") for s in scenes if isinstance(s, dict) and s.get("id")}

    # 1. Check nextSceneId existence
    has_terminal = False
    for scene in scenes:
        if not isinstance(scene, dict):
            continue
        choices = scene.get("choices")
        if not choices or not isinstance(choices, list) or len(choices) == 0:
            has_terminal = True
            continue

        for choice in choices:
            if not isinstance(choice, dict):
                continue
            next_id = choice.get("nextSceneId")
            if next_id is None:
                has_terminal = True
            elif next_id not in scene_ids:
                errors.append(
                    f"Сцена '{scene.get('id')}': выбор ссылается на несуществующую сцену '{next_id}'"
                )

    if not has_terminal:
        errors.append("Граф не содержит ни одного терминального исхода (сцены без выбора или выхода).")

    # 2. Check unreachable scenes (if > 1 scene)
    if len(scenes) > 1:
        # Root scene is sorted by order
        sorted_scenes = sorted(
            [s for s in scenes if isinstance(s, dict)],
            key=lambda s: s.get("order") if s.get("order") is not None else 9999,
        )
        root_id = sorted_scenes[0].get("id")
        reachable: set[str] = {root_id}
        queue = [root_id]
        while queue:
            curr_id = queue.pop(0)
            curr_scene = next((s for s in scenes if s.get("id") == curr_id), None)
            if not curr_scene or not isinstance(curr_scene, dict):
                continue
            for choice in curr_scene.get("choices", []) or []:
                if isinstance(choice, dict):
                    nxt = choice.get("nextSceneId")
                    if nxt and nxt in scene_ids and nxt not in reachable:
                        reachable.add(nxt)
                        queue.append(nxt)

        unreachable = scene_ids - reachable
        if unreachable:
            errors.append(
                f"Обнаружены недостижимые сцены («висячие» вершины): {', '.join(unreachable)}"
            )

    return errors
