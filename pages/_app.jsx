import Head from 'next/head'

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Mijn Systeem</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0f0f0f; overflow: hidden; }
          select option { background: #1a1a1a; }
          ::-webkit-scrollbar { width: 2px; }
          ::-webkit-scrollbar-thumb { background: #252525; border-radius: 2px; }
          input[type=date]::-webkit-calendar-picker-indicator { filter: invert(.4); }
        `}</style>
      </Head>
      <Component {...pageProps} />
    </>
  )
}
