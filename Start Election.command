#!/bin/bash
# Double-click this file on a Mac to start the election system.
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is needed. A window may appear asking to install 'Command Line Developer Tools' - click Install, then run this again."
  python3 --version
  read -p "Press Enter to close..."
  exit 1
fi
( sleep 2; open -a "Google Chrome" "http://localhost:8000" 2>/dev/null || open "http://localhost:8000" ) &
python3 server.py "$@"
read -p "Server stopped. Press Enter to close..."
