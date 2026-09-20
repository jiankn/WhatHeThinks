export const CHAT_PLATFORMS = [
  { id: "whatsapp", name: "WhatsApp", icon: "/icons/platforms/whatsapp.svg", nativeUpload: true, note: "Best supported" },
  { id: "imessage", name: "iMessage", icon: "/icons/platforms/imessage.svg", nativeUpload: false, note: "Paste a snippet" },
  { id: "instagram", name: "Instagram", icon: "/icons/platforms/instagram.svg", nativeUpload: false, note: "Paste a snippet" },
  { id: "messenger", name: "Messenger", icon: "/icons/platforms/messenger.svg", nativeUpload: false, note: "Paste a snippet" },
  { id: "telegram", name: "Telegram", icon: "/icons/platforms/telegram.svg", nativeUpload: false, note: "Paste a snippet" },
] as const;

export type ChatPlatformId = (typeof CHAT_PLATFORMS)[number]["id"];

export function isChatPlatformId(value: string | undefined): value is ChatPlatformId {
  return CHAT_PLATFORMS.some((platform) => platform.id === value);
}
