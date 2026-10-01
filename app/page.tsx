import Game2048 from "./_components/Game2048";
import ThemeToggle from "./_components/ThemeToggle";

export default function Home() {
  return (
    <main
      className="
      min-h-dvh
      flex
      items-center
      justify-center
      bg-white
      text-black
      dark:bg-black
      dark:text-white
    "
    >
      <div className="w-full max-w-md space-y-6 p-4 text-center">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold">Next 2048</h1>

          <ThemeToggle />
        </div>

        <Game2048 />
      </div>
    </main>
  );
}
