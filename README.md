# Lil-G

Lil-G is a lightweight browser chat assistant that can respond in text and talk back out loud.

## Features

- Chat UI for sending messages to Lil-G.
- Built-in response engine so Lil-G can answer immediately without an API key.
- Internet search commands for phrases like "search the internet for..." or "look up...".
- Device-local memory: say "remember that..." or share profile facts like your name, favorite things, interests, or speech style, and Lil-G can recall them later on the same device.
- Talk-back mode using the browser's `speechSynthesis` text-to-speech API.
- Voice settings with six talk-back presets, including a robotic style, plus pitch and speed sliders.
- Optional microphone dictation in browsers that support `SpeechRecognition` or `webkitSpeechRecognition`.
- Wake listening mode: tap "Start wake listening", then say "Lil G" or "hey Lil G" to get Lil-G's attention.
- Progressive Web App structure so Lil-G can be installed on a phone home screen after it is hosted.
- Focused tests for response generation and speech triggering.

## Run locally

```bash
npm start
```

Then open <http://localhost:4173>.

## Install on a phone

Lil-G is structured as a Progressive Web App (PWA). To install it on a phone, host the app over HTTPS, then:

- **Android / Chrome:** open the site and tap the browser's Install prompt or menu option.
- **iPhone / Safari:** open the site, tap Share, then tap Add to Home Screen.

The local development server is useful for testing on your computer. Phone installation requires the app to be available from a real URL, usually HTTPS.

## Memory and internet search

- To save a memory: `remember that my favorite team is the Lakers`
- To recall memories: `what do you remember about me?`
- To clear memories: `clear memory`
- To search the internet: `search the internet for today's NBA news`

Memories are saved in the browser's local storage on the current device. They do not sync across phones or browsers.

Lil-G also saves some profile-style memories automatically when you say things like `my name is Corey`, `my favorite music is jazz`, `I love basketball`, or `I talk about cars a lot`.

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

Because this is a browser PWA, it cannot read SMS messages, control other phone apps, show system-level reply pop-ups, or keep the microphone listening after the app/browser is closed. Those capabilities require a native Android or iOS app with the relevant accessibility, notification, microphone, and messaging permissions.
