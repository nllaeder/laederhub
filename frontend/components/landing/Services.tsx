import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { MessageCircle, Zap, TrendingUp } from 'lucide-react';

export function Services() {
  const chatImage = PlaceHolderImages.find(img => img.id === 'service-chat');
  const integrationImage = PlaceHolderImages.find(img => img.id === 'service-integration');
  const kpiImage = PlaceHolderImages.find(img => img.id === 'service-kpi');

  const services = [
    {
      icon: <MessageCircle className="h-8 w-8 text-primary" />,
      title: "Conversational AI",
      description: "Ask questions in natural language and get immediate answers. No complex dashboards or queries required.",
      image: chatImage,
    },
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: "Seamless Integrations",
      description: "Connect to your marketing, sales, and analytics platforms in just a few clicks. We handle the data pipeline.",
      image: integrationImage,
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      title: "Proactive KPI Tracking",
      description: "Let our AI suggest and monitor Key Performance Indicators, so you can focus on what matters most.",
      image: kpiImage,
    },
  ];

  return (
    <section id="services" className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Our Services</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
              How LaederHub Works
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              We streamline your data analysis workflow with three core capabilities.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:max-w-none lg:gap-12 mt-12">
          {services.map((service) => (
            <Card key={service.title} className="h-full">
              <CardHeader className="items-center">
                {service.icon}
                <CardTitle className="text-xl font-bold font-headline">{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center text-center space-y-4">
                {service.image && (
                   <div className="overflow-hidden rounded-lg">
                    <Image
                      src={service.image.imageUrl}
                      alt={service.image.description}
                      data-ai-hint={service.image.imageHint}
                      width={600}
                      height={400}
                      className="aspect-video object-cover"
                    />
                  </div>
                )}
                <p className="text-muted-foreground">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
