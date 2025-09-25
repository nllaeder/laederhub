import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function About() {
  const aboutImage = PlaceHolderImages.find(img => img.id === 'about-us');

  return (
    <section id="about" className="w-full py-12 md:py-24 lg:py-32 bg-secondary">
      <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-10">
        <div className="space-y-4">
          <div className="inline-block rounded-lg bg-background px-3 py-1 text-sm">About Us</div>
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
            Driven by Data, Focused on You
          </h2>
          <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            At LaederData, we believe that data should be accessible to everyone, not just analysts. Our mission is to build tools that empower businesses to make smarter decisions faster. LaederHub is our first step towards a future where data analysis is as simple as having a conversation.
          </p>
        </div>
        {aboutImage && (
          <div className="flex justify-center">
            <Image
              alt={aboutImage.description}
              data-ai-hint={aboutImage.imageHint}
              className="overflow-hidden rounded-xl object-cover object-center"
              height="400"
              src={aboutImage.imageUrl}
              width="600"
            />
          </div>
        )}
      </div>
    </section>
  );
}
