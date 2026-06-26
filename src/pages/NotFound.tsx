import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LightningBoltIcon } from "@radix-ui/react-icons";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FBFBFA] text-[#111111] flex items-center justify-center">
      <div className="text-center">
        <LightningBoltIcon className="h-16 w-16 mx-auto mb-6" />
        <h1 className="font-serif text-6xl font-light tracking-[-0.03em] mb-4">404</h1>
        <p className="text-xl text-[#787774] mb-8">Page not found</p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
