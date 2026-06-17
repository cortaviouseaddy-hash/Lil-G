# Lil-G

Lil-G is a lightweight browser chat assistant that can respond in text and talk back out loud.

## Features

- Chat UI for sending messages to Lil-G.
- Startup intro with a flashing "Made by GFerryGoon" credit and white orb assistant greeting.
- Avatar customization for identity label, color, shape, hair, face, body style, and clothes.
- Built-in response engine so Lil-G can answer immediately without an API key.
- Internet search commands for phrases like "search the internet for..." or "look up...".
- Device-local memory: say "remember that..." or share profile facts like your name, favorite things, interests, or speech style, and Lil-G can recall them later on the same device.
- Profile sync codes for moving a local profile, memories, and voice settings between installed copies without a backend account service.
- Talk-back mode using the browser's `speechSynthesis` text-to-speech API.
- Voice settings with six talk-back presets, including a robotic style, plus pitch and speed sliders.
- Optional microphone dictation in browsers that support `SpeechRecognition` or `webkitSpeechRecognition`.
- Wake listening mode: tap "Start wake listening", then say "Lil G" or "hey Lil G" to get Lil-G's attention.
- Quick launch buttons and commands for supported web apps like Google, YouTube, Discord, Gmail, and Maps.
- Screen-share awareness through the browser Screen Capture API where supported.
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

## Quick launch, screen context, roleplay, and Discord

- Type `open Discord`, `open YouTube`, `open Gmail`, `open Maps`, or `open browser and search for Lil G` to open supported web destinations in a new tab.
- Use **Share screen** or ask Lil-G to look at your screen to trigger the browser's screen-sharing prompt where supported. This version knows screen sharing is active, but full visual reading requires a future OCR or vision service.
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

Because this is a browser PWA, it cannot read SMS or Discord messages directly, control arbitrary native apps, inspect the screen without the user's screen-share permission, show system-level reply pop-ups, or keep the microphone listening after the app/browser is closed. Those capabilities require a native desktop/mobile app or approved service integration with the relevant accessibility, notification, microphone, screen recording, Discord, and messaging permissions.
