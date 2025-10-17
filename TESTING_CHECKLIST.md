# Complete Image System Testing Checklist

## Overview

This checklist tests both fixes:
1. **Image Persistence Fix** - Ensures images don't expire after refresh
2. **Image Editing Fix** - Ensures AI can edit/regenerate uploaded images

Test these scenarios in order to verify everything works correctly.

---

## ✅ Test 1: AI-Generated Image Persistence

**Scenario**: Generate images and verify they persist after refresh

### Steps:
1. Open chat
2. Send message: "create an image of a sunset over mountains"
3. Wait for image to generate
4. **Check console** for:
   - `📤 Persisting images via frontend API`
   - `✅ Successfully persisted images to permanent storage`
5. Right-click image → Inspect → verify URL contains `blob.vercel-storage.com`
6. **Refresh the page**
7. Check if image still loads

### Expected Result:
- ✅ Image loads after refresh
- ✅ URL is from Vercel Blob Storage (permanent)
- ✅ Console shows successful persistence

### What to Do if It Fails:
- Check `BLOB_READ_WRITE_TOKEN` environment variable
- Check console for error messages
- Verify `/api/persist-image` endpoint is accessible

---

## ✅ Test 2: Uploaded Image Persistence

**Scenario**: Upload an image and verify it persists after refresh

### Steps:
1. Upload any image file
2. Send a message with the image
3. Wait for AI response
4. **Check console** for:
   - `✅ Sending Vercel Blob URLs to AI`
   - `🔗 Found original Vercel Blob URLs to restore`
5. Right-click uploaded image → Inspect → verify URL contains `blob.vercel-storage.com`
6. **Refresh the page**
7. Check if uploaded image still shows

### Expected Result:
- ✅ Uploaded image loads after refresh
- ✅ URL is from Vercel Blob Storage (not Google AI)
- ✅ Console shows URL restoration

### What to Do if It Fails:
- Check if original URL is being preserved as metadata
- Verify `cleanMessageContentForStorage()` is being called
- Check database to see what URL is stored

---

## ✅ Test 3: Image Editing (The Main Fix)

**Scenario**: Upload an image and edit it with AI

### Steps:
1. Upload an image (e.g., a landscape photo)
2. Send message: "make this image black and white"
3. Wait for AI to process
4. **Check console** for:
   - `🖼️  Processing 1 input images for editing...`
   - `📥 Attempting to fetch image from: https://blob.vercel-storage.com/...`
   - `✅ Successfully converted image to base64`
   - `✅ All 1 images successfully prepared for editing`
5. Wait for edited image
6. **Refresh the page**
7. Verify both original and edited images load

### Expected Result:
- ✅ AI successfully edits the image
- ✅ Both images visible after refresh
- ✅ No "Unable to access the original image" error
- ✅ Console shows successful image fetch

### What to Do if It Fails:
- Check if `internalRequest: true` is being sent to proxy
- Verify proxy-image endpoint accepts internal requests
- Check for authentication errors in console

---

## ✅ Test 4: Image Regeneration

**Scenario**: Upload an image and ask AI to regenerate it in a different style

### Steps:
1. Upload an image (e.g., a photo of a person)
2. Send message: "regenerate this as Vinland Saga anime style"
3. Wait for AI to process
4. **Check console** for image processing logs
5. Wait for regenerated image
6. **Refresh the page**
7. Verify both images still load

### Expected Result:
- ✅ AI generates new image based on the original
- ✅ New image is stylistically different
- ✅ Both images persist after refresh
- ✅ No errors in console

---

## ✅ Test 5: Multiple Images

**Scenario**: Generate multiple images and verify all persist

### Steps:
1. Send message: "create 2 images of mountains"
2. Wait for both images to generate
3. **Check console** for:
   - `📤 Persisting 2 images via frontend API`
   - `✅ Successfully persisted 2/2 images`
4. **Refresh the page**
5. Verify both images still load

### Expected Result:
- ✅ Both images load after refresh
- ✅ All images have Vercel Blob URLs
- ✅ Console confirms all images persisted

---

## ✅ Test 6: Complex Editing Chain

**Scenario**: Upload → Edit → Edit again → Refresh

### Steps:
1. Upload an image
2. Send message: "add a sunset in the background"
3. Wait for edited image
4. Send message: "now make it more vibrant"
5. Wait for second edited image
6. **Refresh the page**
7. Verify all versions are visible (original + 2 edits)

### Expected Result:
- ✅ Each editing step works
- ✅ All 3 images visible after refresh
- ✅ No errors during editing chain
- ✅ Console shows successful processing for each edit

---

## ✅ Test 7: Proxy Fallback

**Scenario**: Test that proxy works when direct fetch fails

### Steps:
1. Upload an image
2. Send message to edit it
3. **Watch console** for:
   - First attempt: `📥 Attempting to fetch image from: ...`
   - If direct fails: `Direct fetch failed, trying internal proxy`
   - Proxy usage: `🔄 Using proxy to fetch image: ...`
4. Verify image editing still works

### Expected Result:
- ✅ Proxy is used as fallback
- ✅ Image editing succeeds via proxy
- ✅ No authentication errors
- ✅ Final result persists after refresh

---

## ✅ Test 8: Error Handling

**Scenario**: Test with an expired/invalid image URL (if possible)

### Steps:
1. Try to edit an image with an invalid URL (if you can simulate this)
2. Check console for error messages
3. Verify AI provides helpful feedback

### Expected Result:
- ✅ Error is logged clearly
- ✅ AI explains the issue to user
- ✅ System doesn't crash
- ✅ User can continue with other requests

---

## ✅ Test 9: Cross-Chat Persistence

**Scenario**: Generate images in one chat, verify they persist across sessions

### Steps:
1. Generate images in a chat
2. Copy the chat URL
3. Close the browser completely
4. Open browser again
5. Navigate back to the chat URL
6. Verify images still load

### Expected Result:
- ✅ Images load even after browser restart
- ✅ No "image expired" errors
- ✅ All images visible

---

## ✅ Test 10: Mobile Functionality

**Scenario**: Test image generation and persistence on mobile

### Steps:
1. Open the app on mobile device (or use responsive mode)
2. Generate an image
3. Download the image (test download button)
4. Upload an image
5. Edit the uploaded image
6. **Refresh the page**
7. Verify everything still works

### Expected Result:
- ✅ Images generate correctly on mobile
- ✅ Download works (from memory: mobile download fix)
- ✅ Image editing works
- ✅ Images persist after mobile refresh

---

## Summary Checklist

Quick reference:

- [ ] Test 1: AI-generated image persistence ✅
- [ ] Test 2: Uploaded image persistence ✅
- [ ] Test 3: Image editing (main fix) ✅
- [ ] Test 4: Image regeneration ✅
- [ ] Test 5: Multiple images ✅
- [ ] Test 6: Complex editing chain ✅
- [ ] Test 7: Proxy fallback ✅
- [ ] Test 8: Error handling ✅
- [ ] Test 9: Cross-chat persistence ✅
- [ ] Test 10: Mobile functionality ✅

---

## Key Console Logs to Monitor

### Success Indicators:
```
📤 Persisting images via frontend API
✅ Successfully persisted images to permanent storage
🔗 Found original Vercel Blob URLs to restore
✅ Successfully restored X image URLs
🖼️  Processing X input images for editing
✅ All X images successfully prepared for editing
```

### Warning Indicators (May Still Work):
```
⚠️  Direct fetch failed, trying proxy
🔄 Using proxy to fetch image
⚠️  Only X out of Y images could be fetched
```

### Error Indicators (Need Fix):
```
❌ Failed to persist images
❌ Unauthorized
❌ Failed to fetch image
❌ Unable to access the original image
```

---

## Environment Variables to Verify

Before testing, ensure these are set:

```bash
# Required
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Optional but recommended
FRONTEND_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
FIREWORKS_API_KEY=your_fireworks_key

# Auto-set on Vercel
VERCEL=1
VERCEL_URL=auto-set-by-vercel
```

---

## Troubleshooting Quick Reference

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Images expire after refresh | Persistence not working | Check BLOB_READ_WRITE_TOKEN |
| Can't edit uploaded images | Proxy authentication issue | Verify `internalRequest` flag is sent |
| Images not loading at all | Database has expired URLs | This affects old messages only |
| Slow image generation | Network or API issues | Wait longer or check API status |
| "Unauthorized" errors | Missing auth bypass | Check proxy-image route changes |

---

**Last Updated**: October 17, 2025  
**Status**: Complete Testing Suite  
**Related Docs**: IMAGE_PERSISTENCE_FIX.md, IMAGE_EDITING_FIX.md

