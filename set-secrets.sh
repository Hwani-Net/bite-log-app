
#!/bash
PROJECT="bite-log-app"
echo "ccb9d17949e5cb97d8349992b505b64d97f95b889afd6387c0d919038dfddc1e" | npx firebase apphosting:secrets:set FLEET_API_KEY --project $PROJECT --force --data-file -
echo "ccb9d17949e5cb97d8349992b505b64d97f95b889afd6387c0d919038dfddc1e" | npx firebase apphosting:secrets:set NEXT_PUBLIC_KHOA_API_KEY --project $PROJECT --force --data-file -
echo "ccb9d17949e5cb97d8349992b505b64d97f95b889afd6387c0d919038dfddc1e" | npx firebase apphosting:secrets:set NEXT_PUBLIC_FISHING_VESSEL_API_KEY --project $PROJECT --force --data-file -
echo "AIzaSyBNiN5ep4p6MIlPnKOu26uD1sb811okiPU" | npx firebase apphosting:secrets:set NEXT_PUBLIC_GEMINI_API_KEY --project $PROJECT --force --data-file -
echo "GQaYUOBwxud3JC_u5d4h" | npx firebase apphosting:secrets:set NEXT_PUBLIC_NAVER_CLIENT_ID --project $PROJECT --force --data-file -
echo "Gexa1C5lDO" | npx firebase apphosting:secrets:set NEXT_PUBLIC_NAVER_CLIENT_SECRET --project $PROJECT --force --data-file -
echo "AIzaSyBU6IJpzRYutQCdanQOi0ZEy_sgtTeaAlY" | npx firebase apphosting:secrets:set NEXT_PUBLIC_YOUTUBE_API_KEY --project $PROJECT --force --data-file -
