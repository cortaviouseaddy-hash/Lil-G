# Lil-G

Lil-G is a lightweight browser chat assistant that can respond in text and talk back out loud.

## Features

- Chat UI for sending messages to Lil-G.
- Startup intro with a flashing "Made by GFerryGoon" credit and white orb assistant greeting.
- Avatar customization for identity label, color, shape, hair, face, body style, and clothes.
- Built-in response engine so Lil-G can answer immediately without an API key.
- Optional self thinking: turn it on in Settings and Lil-G shows its reasoning steps before the final answer.
- Floating orb minimized mode: shrink Lil-G into a draggable background orb that uses your chosen avatar glow color.
- Internet search commands for phrases like "search the internet for..." or "look up...".
- Device-local memory: say "remember that..." or share profile facts like your name, favorite things, interests, or speech style, and Lil-G can recall them later on the same device.
- Profile sync codes for moving a local profile, memories, and voice settings between installed copies without a backend account service.
- Talk-back mode using the browser's `speechSynthesis` text-to-speech API.
- Voice settings with six talk-back presets, including a robotic style, plus pitch and speed sliders.
- Optional microphone dictation in browsers that support `SpeechRecognition` or `webkitSpeechRecognition`.
- Wake listening mode: tap "Start wake listening", then say "Lil G" or "hey Lil G" to get Lil-G's attention.
- Quick launch buttons and commands for supported web apps like Google, YouTube, Discord, Gmail, and Maps.
- Screen-share awareness through the browser Screen Capture API where supported.
- Voice screen control with the Lil-G desktop companion: look at your screen, click or tap targets by name, repeat clicks as many times as you ask, and type text where you tell it — all by voice.
- Roleplay-friendly responses for prompts like "roleplay as..." or "pretend...".
- Progressive Web App structure so Lil-G can be installed on a phone, tablet, laptop, or desktop after it is hosted.
- Focused tests for response generation and speech triggering.

## Run locally

```bash
npm start
```

Then open <http://localhost:4173>.

## Install on a phone, tablet, laptop, or desktop

Lil-G is structured as a Progressive Web App (PWA). To install it, host the app over HTTPS, then:

- **Android / Chrome:** open the site and tap the browser's Install prompt or menu option.
- **iPhone / Safari:** open the site, tap Share, then tap Add to Home Screen.
- **Laptop or desktop / Chrome or Edge:** open the site and use the install icon in the address bar or the browser menu's install option.
- **Tablet:** use the same install flow as that tablet's browser.

The local development server is useful for testing on your computer. Installation on real devices usually requires the app to be available from a real HTTPS URL.

## Self thinking

In **Settings → AI behavior**, turn on **Self thinking** when you want Lil-G to reason through a message before answering.

When it is on, Lil-G adds a collapsible **Self thinking** block above its reply. That block shows steps like:

1. What you are asking for
2. What saved memories or recent chat context matter
3. Which approach fits best
4. How it plans to shape the final answer

Talk-back still reads only the final answer, not the thinking block. Self thinking works with normal chat replies and internet search answers. It stays off for direct commands like memory saves, avatar changes, and screen control.

In **Settings → Profile sync**, set **Assistant name** to anything you want, or say `call yourself Nova`. Lil-G answers to that name in chat, wake listening, and floating orb mode.

When minimized, say the assistant name or `Hey {name}` and Lil-G will listen and talk back if talk-back is on.

## Floating orb minimized mode

In **Settings → Floating orb mode**, turn on the feature, choose your orb color in **Avatar customization → Skin / glow color**, then tap **Minimize to orb** in chat.

When minimized:

- Lil-G hides the full app and becomes a **draggable floating orb**
- The orb uses your chosen avatar glow color (white, mint, blue, purple, gold, pink, or red)
- Tap the orb for quick **Open Lil-G**, **Mic**, and **Wake** controls
- Optional **Keep wake listening when minimized** keeps Lil-G listening in the background
- On Chrome or Edge, **Float above other windows** opens the orb in a small always-on-top window

Browsers may still pause the microphone when Lil-G is fully hidden or the device locks, so keep Lil-G open or use the Picture-in-Picture orb on desktop when you need background voice access.

## Memory and internet search

- To save a memory: `remember that my favorite team is the Lakers`
- To recall memories: `what do you remember about me?`
- To clear memories: `clear memory`
- To search the internet: `search the internet for today's NBA news`

Memories are saved in the browser's local storage on the current device. They do not sync across phones or browsers.

Lil-G also saves some profile-style memories automatically when you say things like `my name is Corey`, `my favorite music is jazz`, `I love basketball`, or `I talk about cars a lot`.

## Startup and avatar customization

On startup, Lil-G shows a flashing **Made by GFerryGoon** credit, becomes a white orb, introduces itself as your personal help assistant, and points you toward customization.

The avatar builder lets you choose:

- Identity label: boy, girl, custom, or no label
- Color
- Shape
- Hair style
- Face style
- Body style
- Clothes

You can also customize through chat or voice commands such as `change my avatar color to purple`, `set my avatar hair to curls`, `change my avatar clothes to hoodie`, or `make my avatar a boy`.

The avatar is intentionally smooth, stylized, and non-explicit. It uses abstract shapes only and does not render nudity, genitals, or sexual details.

## Profile sync

Open **Voice and device settings**, save a profile name, then choose **Export sync code**. Paste that code into another installed copy with **Import profile** to copy over:

- Profile name
- Local memories
- Voice preset, pitch, and speed settings
- Avatar settings

This behaves like a lightweight account connection, but it is manual and local. A real automatic account system would need a backend service, sign-in, encrypted storage, and sync conflict handling.

## Voice screen control

Lil-G can look at your screen and follow voice commands to click, tap, and type when the **desktop companion** is running on your computer.

### Setup

```bash
pip install -r companion/requirements.txt
python companion/lilg_companion.py
```

You also need [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) installed on your system so Lil-G can read on-screen text and find click targets.

In Lil-G settings, turn on **Voice screen control**, confirm the companion address (`ws://127.0.0.1:8765` by default), and tap **Connect companion**.

### Voice commands

Use the mic or wake listening, then say commands like:

- `look at my screen`
- `click on Submit`
- `tap Settings 3 times`
- `double click on the file icon`
- `type hello world`
- `type my email in the search box`
- `press enter`
- `scroll down`

Lil-G finds on-screen text with OCR, moves the mouse, clicks or taps as many times as you ask, and types where you tell it.

## Quick launch, screen context, roleplay, and Discord

- Type `open Discord`, `open YouTube`, `open Gmail`, `open Maps`, or `open browser and search for Lil G` to open supported web destinations in a new tab.
- Use **Share screen** or ask Lil-G to look at your screen. With the desktop companion connected, Lil-G can read visible text through OCR. Without it, screen sharing only tells Lil-G that sharing is active.
- Ask Lil-G to roleplay or pretend to be a character, then provide the scene and boundaries.
- For Discord, paste the relevant messages into Lil-G and ask for a reply. Directly reading or sending Discord messages requires an approved Discord bot/OAuth integration or a native companion app with the right permissions.

## Voice settings

Open **Voice and device settings** in the chat card to choose one of six voice presets:

- Balanced
- Warm
- Bright
- Deep
- Quick
- Robotic

The pitch slider controls how high or low the voice sounds. The speed slider controls how quickly Lil-G talks. Browser and operating-system voices vary, so the presets use the best available local voice and then apply pitch and speed settings.

## Test

```bash
npm test
```

## Notes

Talk-back depends on browser speech support. If speech synthesis is unavailable, Lil-G still responds in the chat window.

Wake listening also depends on browser speech recognition and microphone permission. Browsers require a user gesture before listening, so tap "Start wake listening" once before using wake phrases.

Internet search depends on the phone or browser having network access. Lil-G shows sourced summary results when available and includes a broader web-search link as a fallback.

Because this is a browser PWA, click, tap, and typing outside the browser require the Lil-G desktop companion. The companion needs screen access and uses OCR to find labels and buttons. It cannot read SMS or Discord messages directly, show system-level reply pop-ups, or keep the microphone listening after the app/browser is closed without a fuller native app and the relevant operating-system permissions.
