import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative w-full py-24 lg:py-32 xl:py-48 bg-secondary">
      <div className="container px-4 md:px-6 z-10">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline text-primary">
                Unlock Your Data's Potential
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                LaederHub connects to your data sources and provides instant, AI-powered insights through a simple chat interface.
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <Button asChild size="lg">
                <Link href="/hub">Launch Hub</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#services">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
