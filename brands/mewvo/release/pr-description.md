## Changes

Release MewVoice (뮤 보이스) with locally generated, playable cat-like audio based on the user's voice timing and amplitude. Recordings are temporary; this is playful audio synthesis, not semantic translation. Apply the approved cat icon and brand assets, and add account deletion in Settings using the existing authenticated endpoint.

Correct the marketing version to 1.2.0, above the existing Apple 1.1.86 version. Replace timestamp build numbers with a durable sequential counter, preserve microphone permission through Expo plugins, and remove unused foreground-service and advertising-ID permissions. CI checks the resolved native configuration and allows TestFlight upload to continue if the independent Play stage fails.

## Verification

- TypeScript, lint, 21 Jest tests and Android Hermes export passed.
- Jenkins #23 built Android and iOS 1.2.0 (90) from 6c76ad37603efd6d2686cad9fb8a3358df16e18d.
- Native iPhone/iPad Simulator screenshots are recorded under brands/mewvo/release. Physical-device microphone/audio QA and Apple's requested physical-device account-deletion recording remain outstanding.
- Store upload/review results are tracked in brands/mewvo/release/README.md. A successful build or upload does not establish review submission. Google managed publishing and Apple manual release remain enabled.
