# Debug Session: facebook-token-save-500
- **Status**: [OPEN]
- **Issue**: Saving a Facebook API access token returns `Internal Server Error` instead of a controlled success or actionable Meta validation error.
- **Debug Server**: `http://127.0.0.1:7777/event`
- **Log File**: `.dbg/trae-debug-log-facebook-token-save-500.ndjson`

## Reproduction Steps
1. Open Settings as an admin.
2. Enter a Facebook access token and optional default ad account ID.
3. Save settings.
4. Observe the backend response and instrumentation evidence.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Meta ad-account verification request fails or times out | High | Low | Pending |
| B | ApiCredential schema validation or MongoDB upsert fails | High | Low | Pending |
| C | Graph failure is converted to ApiError with incorrect constructor arguments | Medium | Low | Pending |
| D | Existing credential document conflicts with the expanded schema | Medium | Medium | Pending |
| E | Token lacks required permissions or accessible ad accounts | High | Low | Pending |

## Log Evidence
Pending pre-fix reproduction.

## Verification Conclusion
Pending runtime evidence.
