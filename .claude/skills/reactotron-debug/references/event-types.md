# Reactotron Event Payload Schemas

Every line of `.reactotron/events.jsonl` is a JSON object:

```json
{"type": "<event-type>", "payload": {...}, "important": <bool>, "ts": <ms>, "receivedAt": "<iso-8601>"}
```

The shape of `payload` depends on `type`. The most common types in this project:

## log

Emitted by `console.tron.log(...)`, `console.tron.warn(...)`, `console.tron.error(...)`.

```json
{
  "level": "debug" | "warn" | "error",
  "message": "<stringified content or array of args>",
  "stack": "<optional stack trace>"
}
```

## api.request

Emitted by the networking interceptor right before a request leaves the device.

```json
{
  "request": {
    "url": "https://api.example.com/path",
    "method": "GET" | "POST" | ...,
    "data": "<request body>",
    "headers": {...},
    "params": {...}
  }
}
```

## api.response

Emitted when a response arrives. Contains the full request for correlation plus the response.

```json
{
  "request": { /* same shape as api.request */ },
  "response": {
    "status": 200,
    "headers": {...},
    "body": "<parsed JSON or string>"
  },
  "duration": 142
}
```

## state.action.complete

Emitted by `reactotron-redux` after a Redux action finishes reducing.

```json
{
  "action": { "type": "AUTH/LOGIN_SUCCESS", "payload": {...} },
  "ms": 4
}
```

## state.values.change

Emitted when a subscribed Redux state path changes. Only present if the user has subscriptions configured in the desktop app.

```json
{
  "path": "auth.user.id",
  "value": "abc-123"
}
```

## display

Emitted by `console.tron.display(...)` for custom UI cards.

```json
{
  "name": "<card title>",
  "value": "<inspectable value>",
  "preview": "<one-line preview>",
  "important": false
}
```

## benchmark.report

Emitted by `tron.benchmark(...).step(...).stop()`.

```json
{
  "title": "<benchmark name>",
  "steps": [{"title": "step1", "time": 12}, ...]
}
```

## Notes

- The `important` top-level flag is a Reactotron hint that this event should be highlighted in the desktop UI; it has no effect on payload shape.
- `ts` is the wall-clock time when the wrap forwarded the event from the app. `receivedAt` is when the sidecar wrote the line — they differ by network latency only.
- Older entries rotate to `.reactotron/events.prev.jsonl` at 5MB. Scan both when the file shows only recent data.
