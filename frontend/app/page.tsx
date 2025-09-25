import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { Services } from '@/components/landing/Services';
import { About } from '@/components/landing/About';
import { Contact } from '@/components/landing/Contact';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Services />
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
