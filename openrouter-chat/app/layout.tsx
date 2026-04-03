import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WB Dashboard Chat",
  description: "Temporary OpenRouter dashboard chat",
};

const criticalShellCss = `
html,
body {
  margin: 0;
  min-height: 100%;
  background: #0d0d0d;
  color: #ececec;
  font-family:
    ui-sans-serif,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  min-height: 100vh;
}

.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 28%),
    #0d0d0d;
}

.messages {
  width: min(880px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 36px 0 140px;
  flex: 1;
  overflow-y: auto;
}

.message {
  display: flex;
  width: 100%;
  margin-bottom: 22px;
}

.message-user {
  justify-content: flex-end;
}

.message-assistant,
.message-system {
  justify-content: flex-start;
}

.message-content {
  max-width: min(720px, 100%);
  white-space: pre-wrap;
  line-height: 1.58;
  font-size: 15px;
  color: #f1f1f1;
}

.message-user .message-content {
  background: #1b1b1b;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  padding: 14px 16px;
}

.message-system .message-content {
  color: #ffb4b4;
  padding: 2px 0;
}

.message-markdown {
  max-width: min(720px, 100%);
  color: #f1f1f1;
  line-height: 1.58;
  font-size: 15px;
}

.message-meta {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.thinking-row {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 28px;
}

.thinking-dots {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
}

.message-timing {
  font-size: 12px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.42);
}

.composer {
  position: sticky;
  bottom: 0;
  width: min(880px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 0 0 28px;
  background: linear-gradient(to top, #0d0d0d 72%, rgba(13, 13, 13, 0));
}

#chat-input {
  width: 100%;
  min-height: 96px;
  max-height: 240px;
  resize: vertical;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(25, 25, 25, 0.94);
  color: inherit;
  padding: 18px 20px;
  outline: none;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.34);
  font: inherit;
}

#chat-input:disabled {
  opacity: 0.6;
}

@media (max-width: 720px) {
  .messages {
    width: calc(100vw - 24px);
    padding-top: 20px;
    padding-bottom: 132px;
  }

  .composer {
    width: calc(100vw - 24px);
    padding-bottom: 18px;
  }

  #chat-input {
    min-height: 84px;
    border-radius: 20px;
    padding: 16px 18px;
  }
}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <style dangerouslySetInnerHTML={{ __html: criticalShellCss }} />
        {children}
      </body>
    </html>
  );
}
