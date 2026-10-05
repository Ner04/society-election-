#!/bin/bash
# Same as "Start Election", but the Admin panel and Results screen can also be
# opened from other phones/laptops connected to the SAME local Wi-Fi router.
# (No internet needed. Voting itself still only happens on this computer.)
cd "$(dirname "$0")"
( sleep 2; open -a "Google Chrome" "http://localhost:8000" 2>/dev/null || open "http://localhost:8000" ) &
python3 server.py --lan
read -p "Server stopped. Press Enter to close..."
