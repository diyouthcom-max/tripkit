#!/usr/bin/env bash
# Upload the release AAB to Google Play internal testing track.
# Prerequisites (one-time, in Google Play Console):
#   1. Create a service account in Google Cloud with the "Google Play Android
#      Developer API" enabled, and invite it to the app as a release manager
#      in Play Console → Users and permissions.
#   2. Download its JSON key and set GOOGLE_PLAY_JSON to its path.
#   3. Install fastlane:  gem install fastlane   (or brew install fastlane)
set -euo pipefail

AAB="${AAB:-$(cd "$(dirname "$0")/../_downloads" 2>/dev/null && pwd)/TripKit-1.0.1-v3-release-internal-test.aab}"
: "${GOOGLE_PLAY_JSON:?Set GOOGLE_PLAY_JSON to your Play Console service account JSON path}"

if [ ! -f "$GOOGLE_PLAY_JSON" ]; then echo "Service account JSON not found" >&2; exit 1; fi
if [ ! -f "$AAB" ]; then echo "AAB not found: $AAB" >&2; exit 1; fi

fastlane supply \
  --aab "$AAB" \
  --json_key "$GOOGLE_PLAY_JSON" \
  --package_name com.bagail.tripkit \
  --track internal \
  --skip_upload_metadata \
  --skip_upload_images \
  --skip_upload_screenshots
