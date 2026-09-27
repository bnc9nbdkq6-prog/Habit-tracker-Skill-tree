import { Html, Head, Main, NextScript } from "next/document";
export default function Document() {
  return (
    <Html lang="nl">
      <Head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="apple-mobile-web-app-title" content="Richting" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
