import { ModeToggle } from "@/components/mode-toggle";
import { LandingPageButtons } from "./_components/lading-page-buttons";

export default function LandingPage() {
  return (
    <div className="relative flex items-center justify-center h-screen">
      {/* mode toggle */}
      <div className="absolute top-4 right-4" >
        <ModeToggle />
      </div>

      {/* landing page buttons */}
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold">Finapp</h1>
        <LandingPageButtons />
      </div>

    </div>
  );
}
