#!/usr/bin/env node
/**
 * One-Stop Play Store Deploy Script
 * 
 * Full pipeline: CloudAPK AAB → Sign → Upload to Play Console
 *
 * Usage:
 *   node scripts/deploy-to-play.mjs [track] [release-notes]
 *
 * Examples:
 *   node scripts/deploy-to-play.mjs internal "버그 수정 및 UI 개선"
 *   node scripts/deploy-to-play.mjs production "v1.3.0 신기능: 음성 녹음"
 *
 * Tracks: internal | alpha | beta | production (default: internal)
 *
 * Prerequisites:
 *   - signing.keystore + signing-key-info.txt in project root
 *   - play-service-account.json in project root
 *   - pwa_build_request.json in project root (appVersionCode will auto-increment)
 *   - Firebase hosting already deployed (npm run build && firebase deploy)
 *   - Android Studio JDK installed (jarsigner)
 *   - googleapis npm package installed
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// --- Configuration ---
const PACKAGE_NAME = 'com.fishlog.diary';
const SERVICE_ACCOUNT_KEY = path.join(PROJECT_ROOT, 'play-service-account.json');
const SIGNING_KEYSTORE = path.join(PROJECT_ROOT, 'signing.keystore');
const SIGNING_KEY_INFO = path.join(PROJECT_ROOT, 'signing-key-info.txt');
const BUILD_REQUEST_JSON = path.join(PROJECT_ROOT, 'pwa_build_request.json');
const JARSIGNER = 'C:/Program Files/Android/Android Studio/jbr/bin/jarsigner';
const CLOUDAPK_URL = 'https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage';

// --- Helper: Parse signing key info ---
function parseSigningKeyInfo() {
  const content = fs.readFileSync(SIGNING_KEY_INFO, 'utf8');
  const storePass = content.match(/Key store password:\s*(.+)/)?.[1]?.trim();
  const keyAlias = content.match(/Key alias:\s*(.+)/)?.[1]?.trim();
  const keyPass = content.match(/Key password:\s*(.+)/)?.[1]?.trim();
  if (!storePass || !keyAlias || !keyPass) {
    throw new Error('Cannot parse signing-key-info.txt — missing password/alias');
  }
  return { storePass, keyAlias, keyPass };
}

// --- Helper: Auto-increment versionCode ---
function incrementVersionCode() {
  const config = JSON.parse(fs.readFileSync(BUILD_REQUEST_JSON, 'utf8'));
  config.appVersionCode = (config.appVersionCode || 1) + 1;
  fs.writeFileSync(BUILD_REQUEST_JSON, JSON.stringify(config, null, 2) + '\n');
  console.log(`   Version: ${config.appVersion} (code: ${config.appVersionCode})`);
  return config;
}

// --- Helper: Download AAB from CloudAPK (uses curl - proven reliable) ---
function downloadAAB(buildConfig) {
  const zipPath = path.join(PROJECT_ROOT, 'temp-unsigned.zip');
  
  // Write build config to temp file for curl
  const tempConfigPath = path.join(PROJECT_ROOT, 'temp-build-config.json');
  fs.writeFileSync(tempConfigPath, JSON.stringify(buildConfig));
  
  try {
    execSync(
      `curl -X POST "${CLOUDAPK_URL}" -H "Content-Type: application/json" --data-binary @"${tempConfigPath}" -o "${zipPath}" --fail --silent --show-error`,
      { stdio: 'pipe', timeout: 180000 } // 3 min timeout
    );
    
    const size = fs.statSync(zipPath).size;
    console.log(`   ✅ Downloaded ${(size / 1024 / 1024).toFixed(1)}MB`);
    return zipPath;
  } finally {
    // Clean up temp config
    if (fs.existsSync(tempConfigPath)) fs.unlinkSync(tempConfigPath);
  }
}

// --- Helper: Extract AAB from ZIP ---
function extractAAB(zipPath) {
  const aabDir = path.join(PROJECT_ROOT, 'aab_output');
  if (fs.existsSync(aabDir)) fs.rmSync(aabDir, { recursive: true });
  fs.mkdirSync(aabDir, { recursive: true });
  
  execSync(`unzip -o "${zipPath}" "*.aab" -d "${aabDir}"`, { stdio: 'pipe' });
  
  // Find the .aab file
  const files = fs.readdirSync(aabDir);
  const aabFile = files.find(f => f.endsWith('.aab'));
  if (!aabFile) throw new Error('No .aab file found in ZIP');
  
  const aabPath = path.join(aabDir, aabFile);
  console.log(`   ✅ Extracted: ${aabFile}`);
  
  // Clean up ZIP
  fs.unlinkSync(zipPath);
  
  return aabPath;
}

// --- Helper: Sign AAB ---
function signAAB(aabPath, keyInfo) {
  const cmd = `"${JARSIGNER}" -sigalg SHA256withRSA -digestalg SHA-256 -keystore "${SIGNING_KEYSTORE}" -storepass "${keyInfo.storePass}" -keypass "${keyInfo.keyPass}" "${aabPath}" "${keyInfo.keyAlias}"`;
  execSync(cmd, { stdio: 'pipe' });
  
  // Copy to final signed filename
  const signedPath = path.join(PROJECT_ROOT, 'BITELog-signed-latest.aab');
  fs.copyFileSync(aabPath, signedPath);
  
  // Clean up aab_output
  const aabDir = path.dirname(aabPath);
  fs.rmSync(aabDir, { recursive: true });
  
  console.log(`   ✅ Signed: BITELog-signed-latest.aab (${(fs.statSync(signedPath).size / 1024 / 1024).toFixed(1)}MB)`);
  return signedPath;
}

// --- Helper: Upload to Play Console ---
async function uploadToPlay(aabPath, track, releaseNotes) {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const androidPublisher = google.androidpublisher({ version: 'v3', auth });

  // Create edit
  const editResponse = await androidPublisher.edits.insert({ packageName: PACKAGE_NAME });
  const editId = editResponse.data.id;
  console.log(`   Edit ID: ${editId}`);

  // Upload AAB
  const uploadResponse = await androidPublisher.edits.bundles.upload({
    packageName: PACKAGE_NAME,
    editId: editId,
    media: {
      mimeType: 'application/octet-stream',
      body: fs.createReadStream(aabPath),
    },
  });
  const versionCode = uploadResponse.data.versionCode;
  console.log(`   ✅ Uploaded! Version code: ${versionCode}`);

  // Assign to track (draft for draft apps, completed for published)
  const trackBody = {
    releases: [{
      versionCodes: [String(versionCode)],
      status: 'draft',
    }],
  };
  if (releaseNotes) {
    trackBody.releases[0].releaseNotes = [{ language: 'ko-KR', text: releaseNotes }];
  }

  // Try completed first, fallback to draft
  try {
    trackBody.releases[0].status = 'completed';
    await androidPublisher.edits.tracks.update({
      packageName: PACKAGE_NAME, editId, track, requestBody: trackBody,
    });
    await androidPublisher.edits.commit({ packageName: PACKAGE_NAME, editId });
    return { versionCode, status: 'completed' };
  } catch (e) {
    if (e.message?.includes('draft')) {
      // App is in draft state — new edit needed since prev commit may have failed
      const editResponse2 = await androidPublisher.edits.insert({ packageName: PACKAGE_NAME });
      const editId2 = editResponse2.data.id;
      
      // Re-upload (previous edit was invalidated)
      const uploadResponse2 = await androidPublisher.edits.bundles.upload({
        packageName: PACKAGE_NAME,
        editId: editId2,
        media: {
          mimeType: 'application/octet-stream',
          body: fs.createReadStream(aabPath),
        },
      });
      const vc2 = uploadResponse2.data.versionCode;
      
      trackBody.releases[0].status = 'draft';
      trackBody.releases[0].versionCodes = [String(vc2)];
      await androidPublisher.edits.tracks.update({
        packageName: PACKAGE_NAME, editId: editId2, track, requestBody: trackBody,
      });
      await androidPublisher.edits.commit({ packageName: PACKAGE_NAME, editId: editId2 });
      return { versionCode: vc2, status: 'draft' };
    }
    throw e;
  }
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);
  const track = args[0] || 'internal';
  const releaseNotes = args[1] || '';

  const validTracks = ['internal', 'alpha', 'beta', 'production'];
  if (!validTracks.includes(track)) {
    console.error(`❌ Invalid track: ${track}. Must be: ${validTracks.join(', ')}`);
    process.exit(1);
  }

  // Validate prerequisites
  const prereqs = [SIGNING_KEYSTORE, SIGNING_KEY_INFO, BUILD_REQUEST_JSON, SERVICE_ACCOUNT_KEY];
  for (const p of prereqs) {
    if (!fs.existsSync(p)) {
      console.error(`❌ Missing: ${path.basename(p)}`);
      process.exit(1);
    }
  }

  console.log('═══════════════════════════════════════════');
  console.log('  🚀 BITE Log — Play Store Auto Deploy');
  console.log('═══════════════════════════════════════════');
  console.log(`  Track: ${track}`);
  console.log(`  Notes: ${releaseNotes || '(없음 — 출시 노트를 권장합니다)'}`);
  console.log('');

  // Release notes format reminder
  if (!releaseNotes) {
    console.log('  ⚠️  출시 노트 없음. 사용자 관점 문구를 권장합니다.');
    console.log('  예시: "AI 어종 예측 개선, UI 버그 수정"');
    console.log('');
  }

  const startTime = Date.now();

  try {
    // Step 1: Auto-increment version
    console.log('📋 Step 1: Preparing build config...');
    const buildConfig = incrementVersionCode();

    // Step 2: Generate AAB via CloudAPK
    console.log('📦 Step 2: Generating AAB via CloudAPK (≈60s)...');
    const zipPath = await downloadAAB(buildConfig);

    // Step 3: Extract AAB
    console.log('📂 Step 3: Extracting AAB...');
    const aabPath = extractAAB(zipPath);

    // Step 4: Sign AAB
    console.log('🔐 Step 4: Signing AAB...');
    const keyInfo = parseSigningKeyInfo();
    const signedPath = signAAB(aabPath, keyInfo);

    // Step 5: Upload to Play Console
    console.log('☁️  Step 5: Uploading to Play Console...');
    const result = await uploadToPlay(signedPath, track, releaseNotes);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  🎉 DEPLOY COMPLETE!');
    console.log('═══════════════════════════════════════════');
    console.log(`  App:     ${PACKAGE_NAME}`);
    console.log(`  Version: ${result.versionCode}`);
    console.log(`  Track:   ${track} (${result.status})`);
    console.log(`  Time:    ${elapsed}s`);
    console.log(`  View:    https://play.google.com/console`);
    console.log('═══════════════════════════════════════════');

  } catch (error) {
    console.error('');
    console.error('❌ Deploy failed:', error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
