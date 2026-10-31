import { Suspense } from "react";
import { GenerateView } from "@/components/GenerateView";

export const metadata = { title: "Generate a guide" };

export default function GeneratePage() {
  return (
    <Suspense>
      <GenerateView />
    </Suspense>
  );
}
