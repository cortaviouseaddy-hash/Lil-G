#!/usr/bin/env python3
"""Lil-G desktop companion for voice-driven screen click, tap, and typing."""

from __future__ import annotations

import asyncio
import json
import re
import shutil
import sys
from dataclasses import dataclass
from typing import Any

try:
    import mss
    import pyautogui
    from PIL import Image
    import pytesseract
    import websockets
except ImportError as exc:  # pragma: no cover - runtime dependency guard
    print(
        "Missing companion dependencies. Run: pip install -r companion/requirements.txt",
        file=sys.stderr,
    )
    raise SystemExit(1) from exc

HOST = "127.0.0.1"
PORT = 8765

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.05


@dataclass
class TextMatch:
    text: str
    left: int
    top: int
    width: int
    height: int

    @property
    def center(self) -> tuple[int, int]:
        return (self.left + self.width // 2, self.top + self.height // 2)


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def capture_screen() -> Image.Image:
    with mss.mss() as sct:
        monitor = sct.monitors[0]
        shot = sct.grab(monitor)
        return Image.frombytes("RGB", shot.size, shot.rgb)


def extract_matches(image: Image.Image) -> list[TextMatch]:
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    matches: list[TextMatch] = []

    for index, text in enumerate(data.get("text", [])):
        cleaned = text.strip()
        if not cleaned:
            continue

        matches.append(
            TextMatch(
                text=cleaned,
                left=int(data["left"][index]),
                top=int(data["top"][index]),
                width=int(data["width"][index]),
                height=int(data["height"][index]),
            )
        )

    return matches


def find_best_match(target: str, matches: list[TextMatch]) -> TextMatch | None:
    normalized_target = normalize_text(target)
    if not normalized_target:
        return None

    scored: list[tuple[int, TextMatch]] = []

    for match in matches:
        normalized_match = normalize_text(match.text)
        if normalized_match == normalized_target:
            scored.append((100, match))
            continue

        if normalized_target in normalized_match:
            scored.append((80 + len(normalized_target), match))
            continue

        if normalized_match in normalized_target:
            scored.append((60 + len(normalized_match), match))
            continue

        target_tokens = set(normalized_target.split())
        match_tokens = set(normalized_match.split())
        overlap = len(target_tokens & match_tokens)
        if overlap:
            scored.append((overlap * 10, match))

    if not scored:
        return None

    scored.sort(key=lambda item: item[0], reverse=True)
    return scored[0][1]


def describe_screen() -> str:
    image = capture_screen()
    matches = extract_matches(image)
    lines: list[str] = []
    current_line: list[str] = []
    current_top: int | None = None

    for match in sorted(matches, key=lambda item: (item.top, item.left)):
        if current_top is None or abs(match.top - current_top) <= 12:
            current_line.append(match.text)
            current_top = match.top if current_top is None else current_top
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [match.text]
            current_top = match.top

    if current_line:
        lines.append(" ".join(current_line))

    deduped: list[str] = []
    seen: set[str] = set()
    for line in lines:
        normalized = normalize_text(line)
        if normalized and normalized not in seen:
            seen.add(normalized)
            deduped.append(line)

    return "\n".join(deduped[:40])


def locate_target(target: str) -> tuple[TextMatch | None, str]:
    image = capture_screen()
    match = find_best_match(target, extract_matches(image))
    return match, target


def click_target(target: str, times: int = 1) -> dict[str, Any]:
    match, label = locate_target(target)
    if not match:
        return {
            "ok": False,
            "message": f'I could not find "{label}" on your screen.',
        }

    x, y = match.center
    click_count = max(1, times)

    for _ in range(click_count):
        pyautogui.click(x=x, y=y)

    return {
        "ok": True,
        "target": label,
        "times": click_count,
        "x": x,
        "y": y,
        "message": f'Clicked "{label}" {click_count} time(s).',
    }


def double_click_target(target: str) -> dict[str, Any]:
    match, label = locate_target(target)
    if not match:
        return {
            "ok": False,
            "message": f'I could not find "{label}" on your screen.',
        }

    x, y = match.center
    pyautogui.doubleClick(x=x, y=y)

    return {
        "ok": True,
        "target": label,
        "message": f'Double-clicked "{label}".',
    }


def type_text(text: str, target: str | None = None) -> dict[str, Any]:
    if target:
        click_result = click_target(target, times=1)
        if not click_result.get("ok"):
            return click_result

    pyautogui.write(text, interval=0.02)
    return {
        "ok": True,
        "text": text,
        "target": target or "",
        "message": f'Typed "{text}".',
    }


def press_key(key: str) -> dict[str, Any]:
    pyautogui.press(key)
    return {"ok": True, "key": key, "message": f"Pressed {key}."}


def scroll_screen(direction: str, amount: int) -> dict[str, Any]:
    clicks = amount if direction == "up" else -amount
    pyautogui.scroll(clicks)
    return {
        "ok": True,
        "direction": direction,
        "amount": amount,
        "message": f"Scrolled {direction}.",
    }


def handle_request(payload: dict[str, Any]) -> dict[str, Any]:
    action = payload.get("action")

    if action == "describe_screen":
        summary = describe_screen()
        return {
            "ok": True,
            "summary": summary,
            "message": "Screen described.",
        }

    if action == "click":
        return click_target(payload.get("target", ""), int(payload.get("times", 1)))

    if action == "double_click":
        return double_click_target(payload.get("target", ""))

    if action == "type":
        return type_text(payload.get("text", ""), payload.get("target") or None)

    if action == "key":
        return press_key(payload.get("key", "enter"))

    if action == "scroll":
        direction = payload.get("direction", "down")
        amount = int(payload.get("amount", 3))
        return scroll_screen(direction, amount)

    return {"ok": False, "message": f"Unknown action: {action}"}


async def handle_connection(websocket: websockets.WebSocketServerProtocol) -> None:
    async for message in websocket:
        try:
            payload = json.loads(message)
        except json.JSONDecodeError:
            await websocket.send(json.dumps({"ok": False, "message": "Invalid JSON."}))
            continue

        request_id = payload.get("id")
        result = await asyncio.to_thread(handle_request, payload)
        if request_id:
            result["id"] = request_id
        await websocket.send(json.dumps(result))


def ensure_tesseract() -> None:
    if shutil.which("tesseract"):
        return

    print(
        "Warning: Tesseract OCR was not found on PATH. Install it so Lil-G can read and click screen text.",
        file=sys.stderr,
    )


async def main() -> None:
    ensure_tesseract()
    print(f"Lil-G companion listening on ws://{HOST}:{PORT}")
    async with websockets.serve(handle_connection, HOST, PORT):
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Lil-G companion stopped.")
