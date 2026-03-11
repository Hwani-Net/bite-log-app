#!/usr/bin/env node
/**
 * Upload AAB to Google Play Console via Android Publisher API v3
 *
 * Usage:
 *   node scripts/upload-to-play.mjs <aab-file> [track] [release-notes]
 *
 * Examples:
 *   node scripts/upload-to-play.mjs BITELog-signed-latest.aab internal "버그 수정"
 *   node scripts/upload-to-play.mjs BITELog-signed-latest.aab production "새 기능 추가"
 *
 * Tracks: internal | alpha | beta | production
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// --- Configuration ---
const PACKAGE_NAME = 'com.fishlog.diary';
const SERVICE_ACCOUNT_KEY = path.join(PROJECT_ROOT, 'play-service-account.json');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node scripts/upload-to-play.mjs <aab-file> [track] [release-notes]');
    console.error('  track: internal | alpha | beta | production (default: internal)');
    process.exit(1);
  }

  const aabPath = path.resolve(args[0]);
  const track = args[1] || 'internal';
  const releaseNotes = args[2] || '';

  // Validate inputs
  if (!fs.existsSync(aabPath)) {
    console.error(`❌ AAB file not found: ${aabPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(SERVICE_ACCOUNT_KEY)) {
    console.error(`❌ Service account key not found: ${SERVICE_ACCOUNT_KEY}`);
    console.error('   Run: gcloud iam service-accounts keys create play-service-account.json ...');
    process.exit(1);
  }

  const validTracks = ['internal', 'alpha', 'beta', 'production'];
  if (!validTracks.includes(track)) {
    console.error(`❌ Invalid track: ${track}. Must be one of: ${validTracks.join(', ')}`);
    process.exit(1);
  }

  console.log('🚀 Google Play Console AAB Upload');
  console.log(`   📦 AAB: ${path.basename(aabPath)} (${(fs.statSync(aabPath).size / 1024 / 1024).toFixed(1)}MB)`);
  console.log(`   🎯 Track: ${track}`);
  console.log(`   📝 Notes: ${releaseNotes || '(none)'}`);
  console.log('');

  try {
    // 1. Authenticate
    console.log('1️⃣  Authenticating with service account...');
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_KEY,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    const androidPublisher = google.androidpublisher({ version: 'v3', auth });
    console.log('   ✅ Authenticated');

    // 2. Create an edit
    console.log('2️⃣  Creating edit session...');
    const editResponse = await androidPublisher.edits.insert({
      packageName: PACKAGE_NAME,
    });
    const editId = editResponse.data.id;
    console.log(`   ✅ Edit ID: ${editId}`);

    // 3. Upload AAB
    console.log('3️⃣  Uploading AAB (this may take a moment)...');
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

    // 4. Assign to track
    // Draft apps require status='draft'. Published apps can use 'completed'.
    // We try draft first (works for both), then completed as upgrade if needed.
    console.log(`4️⃣  Assigning to "${track}" track...`);
    
    const trackBody = {
      releases: [{
        versionCodes: [String(versionCode)],
        status: 'draft',
      }],
    };

    // Add release notes if provided
    if (releaseNotes) {
      trackBody.releases[0].releaseNotes = [{
        language: 'ko-KR',
        text: releaseNotes,
      }];
    }

    await androidPublisher.edits.tracks.update({
      packageName: PACKAGE_NAME,
      editId: editId,
      track: track,
      requestBody: trackBody,
    });
    console.log(`   ✅ Assigned to ${track} (status: draft)`);

    // 5. Commit edit
    console.log('5️⃣  Committing changes...');
    await androidPublisher.edits.commit({
      packageName: PACKAGE_NAME,
      editId: editId,
    });
    console.log('   ✅ Committed!');

    console.log('');
    console.log('🎉 Upload complete!');
    console.log(`   App: ${PACKAGE_NAME}`);
    console.log(`   Version code: ${versionCode}`);
    console.log(`   Track: ${track} (draft — review in Play Console to publish)`);
    console.log(`   View at: https://play.google.com/console/u/3/developers/5565554790849512525/app/4976432369405534/tracks/${track}`);

  } catch (error) {
    console.error('');
    console.error('❌ Upload failed:', error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
