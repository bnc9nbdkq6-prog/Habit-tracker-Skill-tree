import Head from "next/head";
import "../styles.css";
export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Richting · Mijn skilltree</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#101914" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
