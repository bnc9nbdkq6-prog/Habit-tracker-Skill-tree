import dynamic from "next/dynamic";
const App = dynamic(() => import("../components/GoalTree"), { ssr: false });
export default function Home() {
  return <App />;
}
