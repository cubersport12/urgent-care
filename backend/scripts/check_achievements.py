"""Self-check: achievement rule threshold unlock logic."""
from types import SimpleNamespace


def should_unlock(rule_type: str, threshold: int, counts: dict[str, int], already: bool) -> bool:
    if already:
        return False
    if rule_type == "manual":
        return False
    return counts.get(rule_type, 0) >= threshold


def main() -> None:
    counts = {"articles_read": 3, "tests_passed": 1, "rescues_completed": 0}
    assert should_unlock("articles_read", 3, counts, False) is True
    assert should_unlock("articles_read", 4, counts, False) is False
    assert should_unlock("manual", 1, counts, False) is False
    assert should_unlock("tests_passed", 1, counts, True) is False
    print("ok")


if __name__ == "__main__":
    main()
