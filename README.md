# Lil-G

Lil-G is a lightweight browser chat assistant that can respond in text and talk back out loud.

## Features

- Chat UI for sending messages to Lil-G.
- Built-in response engine so Lil-G can answer immediately without an API key.
- Talk-back mode using the browser's `speechSynthesis` text-to-speech API.
- Optional microphone dictation in browsers that support `SpeechRecognition` or `webkitSpeechRecognition`.
- Focused tests for response generation and speech triggering.

## Run locally

```bash
npm start
```

Then open <http://localhost:4173>.

## Test

```bash
npm test
```

## Notes

Talk-back depends on browser speech support. If speech synthesis is unavailable, Lil-G still responds in the chat window.
