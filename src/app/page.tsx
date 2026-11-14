const TEAM_NAME = "Holy Ravioli";
const MOTTO = "Git push and pray.";
import AskForm from "../components/AskForm";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center font-sans dark:bg-black">
      <p className="text-sm font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        Junction 2026
      </p>
      <h1 className="text-5xl font-semibold tracking-tight text-black sm:text-6xl dark:text-zinc-50">
        {TEAM_NAME}
      </h1>
      <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        {MOTTO}
      </p>
      <AskForm />
    </main>
  );
}
