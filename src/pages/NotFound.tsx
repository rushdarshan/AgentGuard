import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LightningBoltIcon } from "@radix-ui/react-icons";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EAEAEA] flex items-center justify-center">
      <div className="text-center">
        <LightningBoltIcon className="h-16 w-16 mx-auto mb-6 text-[#E61919]" />
        <h1 className="font-display text-7xl font-black tracking-[-0.04em] mb-4">404</h1>
        <p className="font-mono text-sm text-[#6B6B6B] mb-8">&lt; PAGE NOT FOUND /&gt;</p>
        <Link href="/">
          <Button>[ GO HOME ]</Button>
        </Link>
      </div>
    </div>
  );
}