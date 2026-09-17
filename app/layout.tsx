import type { Metadata } from "next";
import { SourceInspector } from "./source-inspector";
import { PRODUCT_DESCRIPTION, PRODUCT_ICON_URL, PRODUCT_NAME } from "./lib/product-brand";
import "./globals.css";

const colorSchemeBootstrap = `
  (function () {
    try {
      var scheme = localStorage.getItem("staypilot:color-scheme") === "dark" ? "dark" : "light";
      var root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      root.style.colorScheme = scheme;
    } catch (_) {}
  })();
`;

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: PRODUCT_DESCRIPTION,
  icons: {
    icon: PRODUCT_ICON_URL,
    shortcut: PRODUCT_ICON_URL,
    apple: PRODUCT_ICON_URL
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: colorSchemeBootstrap }} />
      </head>
      <body>
        {children}
        {process.env.NODE_ENV === "development" &&
          process.env.NEXT_PUBLIC_SOURCE_INSPECTOR === "1" && (
            <SourceInspector />
          )}
      </body>
    </html>
  );
}
