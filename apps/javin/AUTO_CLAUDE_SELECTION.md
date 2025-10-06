# 🤖 Auto Claude Selection for Coding Tools

## ✨ What This Does

When users click the **"Coding"** tool selector, the app **automatically switches** to **Claude (claude-3-5-haiku)** for the best coding experience!

## 🎯 Why This Matters

As we discovered, **Gemini models** produce inconsistent markdown formatting:
- ❌ Missing code fences (````)
- ❌ "filename: style.css" instead of proper code blocks
- ❌ Text fragments appearing outside code blocks
- ❌ Poor parsing by react-markdown

**Claude models** provide:
- ✅ Proper markdown code fences
- ✅ Clean, well-structured code
- ✅ Perfect rendering in the artifact system
- ✅ No stray text fragments

## 🔧 How It Works

### 1. **Smart Model Switching**
```typescript
// When entering Coding mode → Auto-switch to Claude
if (!wasCoding && isNowCoding && selectedModelId !== "chat-model-claude") {
  setPreviousModel(selectedModelId);
  saveChatModelAsCookie("chat-model-claude");
  window.location.reload();
}
```

### 2. **Model Memory**
```typescript
// Save previous model to restore later
const [previousModel, setPreviousModel] = useLocalStorage<string | null>("previousModel", null);
```

### 3. **Restore on Exit**
```typescript
// When leaving Coding mode → Restore previous model
if (wasCoding && !isNowCoding && previousModel && selectedModelId === "chat-model-claude") {
  saveChatModelAsCookie(previousModel);
  setPreviousModel(null);
  window.location.reload();
}
```

## 🎨 User Experience

The switch happens **silently in the background** - no visual indicators needed! Users just get the best model automatically without any UI clutter.

## 📍 Files Modified

### `apps/javin/components/Input/multimodal-input.tsx`
- Added `previousModel` state using `useLocalStorage`
- Enhanced `handleGroupSelect` to auto-switch models
- Silent background switching (no visual indicators)

## 🚀 User Experience Flow

1. **User clicks "Coding" tool** 🧑‍💻
2. **App detects mode change** 🔄
3. **Auto-switches to Claude** ⚡
4. **Saves previous model** 💾
5. **Page reloads** 🔄
6. **Ready for coding!** 🎉

### When Leaving Coding Mode:
1. **User clicks different tool** (Search, Crypto, etc.)
2. **App restores previous model** 🔙
3. **Clears saved model** 🧹
4. **Page reloads** 🔄
5. **Back to preferred model!** ✅

## 🎯 Benefits

| Before | After |
|--------|-------|
| ❌ User manually switches to Claude | ✅ Auto-switches automatically |
| ❌ Forgets to switch, gets bad formatting | ✅ Always uses best model for coding |
| ❌ Annoying to remember | ✅ Seamless experience |
| ❌ Inconsistent code quality | ✅ Consistent, high-quality code |

## 🔮 Future Enhancements

- [ ] Add smooth transition animation instead of reload
- [ ] Show loading state during model switch
- [ ] Add user preference to disable auto-switch
- [ ] Extend to other tool modes (e.g., auto-select GPT-4o for images)

## 📝 Technical Notes

- Uses **localStorage** to persist previous model selection
- Requires **page reload** to apply new model
- Works across all device sizes (desktop + mobile)
- **Silent switching** - no visual indicators for clean UI

---

**Made with ❤️ to give users the best coding experience!**


