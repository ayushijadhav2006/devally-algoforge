"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FeaturesSectionDemo } from "@/components/feature";
import { Sparkles, SparklesCore } from "@/components/ui/sparkles";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import FloatingNavbar from "@/components/floating-navbar";
import Image from "next/image";
import { MaskContainer } from "@/components/ui/svg-mask-effect";
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid";
import {
  BarChart,
  FileText,
  BookOpen,
  Users,
  Bell,
  Star,
  Globe,
  Clipboard,
} from "lucide-react";
import React from "react";

// Custom animation class
const animationStyles = `
  @keyframes spin-slow {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  .animate-spin-slow {
    animation: spin-slow 8s linear infinite;
  }
`;

// Create icons for the BentoGrid component
const FeatureIcons = {
  Analytics: BarChart,
  Reports: FileText,
  Learning: BookOpen,
  Community: Users,
  Notifications: Bell,
  Recognition: Star,
  Global: Globe,
  Management: Clipboard,
};

// Feature data for BentoGrid
const featureData = [
  {
    name: "Analytics Dashboard",
    description:
      "Gain insights into engagement, participation rates, and impact metrics through our powerful analytics dashboard.",
    icon: "Analytics",
    href: "/features/analytics",
    cta: "Explore Analytics",
    className: "md:col-span-7 lg:col-span-7 min-h-[280px]",
  },
  {
    name: "Report Generation",
    description:
      "Create comprehensive reports for stakeholders, donors, and leadership with customizable templates.",
    icon: "Reports",
    href: "/features/reports",
    cta: "Generate Reports",
    className: "md:col-span-5 lg:col-span-5 min-h-[280px]",
  },
  {
    name: "Learning Resources",
    description:
      "Access training materials, courses, and best practices to enhance your NGO's effectiveness.",
    icon: "Learning",
    href: "/features/learning",
    cta: "Start Learning",
    className: "md:col-span-4 lg:col-span-4 min-h-[240px]",
  },
  {
    name: "Community Hub",
    description:
      "Connect with other NGOs, volunteers, and supporters in a collaborative space.",
    icon: "Community",
    href: "/features/community",
    cta: "Join Community",
    className: "md:col-span-8 lg:col-span-8 min-h-[240px]",
  },
  {
    name: "Multi-channel Notifications",
    description:
      "Keep everyone informed with automated notifications via email, SMS, and in-app alerts.",
    icon: "Notifications",
    href: "/features/notifications",
    cta: "Setup Alerts",
    className: "md:col-span-5 lg:col-span-5 min-h-[260px]",
  },
  {
    name: "Volunteer Recognition",
    description:
      "Celebrate contributions with badges, certificates, and a gamified experience.",
    icon: "Recognition",
    href: "/features/recognition",
    cta: "Recognize Efforts",
    className: "md:col-span-7 lg:col-span-7 min-h-[260px]",
  },
  {
    name: "Global Presence",
    description:
      "Manage operations across multiple regions with localization and regional insights.",
    icon: "Global",
    href: "/features/global",
    cta: "Go Global",
    className: "md:col-span-6 lg:col-span-6 min-h-[260px]",
  },
  {
    name: "Event Management",
    description:
      "Effortlessly plan, schedule, and track events with our integrated management tools.",
    icon: "Management",
    href: "/features/events",
    cta: "Manage Events",
    className: "md:col-span-6 lg:col-span-6 min-h-[260px]",
  },
];

export default function Home() {
  const [isVisible, setIsVisible] = useState({
    features: false,
    whyChooseUs: false,
  });

  // Add error state
  const [hasError, setHasError] = useState(false);

  const featuresRef = useRef(null);
  const whyChooseUsRef = useRef(null);

  // Image carousel state
  const [currentImage, setCurrentImage] = useState(0);
  const carouselItems = [
    { id: 1, title: "Success Story", image: "/img/img1.jpg" },
    { id: 2, title: "Impact Report", image: "/img/img2.jpg" },
    { id: 3, title: "Volunteer Experience", image: "/img/img3.jpg" },
    { id: 4, title: "Community Outreach", image: "/img/im4.jpg" },
  ];

  // Testimonials data
  const testimonials = [
    {
      name: "Sarah Johnson",
      designation: "NGO Director",
      src: "/img/img1.jpg",
      quote:
        "This platform has revolutionized how we connect with volunteers. We've seen a 200% increase in community engagement since joining.",
    },
    {
      name: "Michael Chen",
      designation: "Volunteer",
      src: "/img/img2.jpg",
      quote:
        "I've been able to contribute to causes I'm passionate about and meet amazing people along the way. The experience has been life-changing.",
    },
    {
      name: "Priya Patel",
      designation: "Community Organizer",
      src: "/img/img3.jpg",
      quote:
        "The tools provided made it so easy to organize our neighborhood cleanup initiative. We achieved more in one month than we did all of last year!",
    },
  ];

  // Auto-rotate carousel images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % carouselItems.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [carouselItems.length]);

  // Error handling
  useEffect(() => {
    const handleError = () => {
      setHasError(true);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === featuresRef.current) {
            setIsVisible((prev) => ({
              ...prev,
              features: entry.isIntersecting,
            }));
          } else if (entry.target === whyChooseUsRef.current) {
            setIsVisible((prev) => ({
              ...prev,
              whyChooseUs: entry.isIntersecting,
            }));
          }
        });
      },
      { threshold: 0.1 }
    );

    if (featuresRef.current) observer.observe(featuresRef.current);
    if (whyChooseUsRef.current) observer.observe(whyChooseUsRef.current);

    return () => {
      if (featuresRef.current) observer.unobserve(featuresRef.current);
      if (whyChooseUsRef.current) observer.unobserve(whyChooseUsRef.current);
    };
  }, []);

  // If there's an error, show a simple fallback
  if (hasError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-white dark:bg-black">
        <p className="text-3xl md:text-3xl font-bold text-black dark:text-white">
          Welcome to SMILE-SHARE
        </p>
        <p className="mt-4 text-xl md:text-2xl text-muted-foreground dark:text-gray-300">
          Streamline your NGO management process with our powerful platform
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-primary px-6 py-3 text-lg md:text-xl font-medium text-white hover:shadow-lg hover:shadow-primary/20"
          >
            Get Started
          </Link>
          <Link
            href="/ngo"
            className="rounded-lg border px-6 py-3 text-lg md:text-xl font-medium text-black dark:text-white hover:bg-accent/50"
          >
            Explore NGOs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black overflow-x-hidden transition-colors duration-300">
      {/* Apply custom animations with proper syntax */}
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />

      {/* Hero Section */}
      <div className="relative min-h-screen overflow-hidden">
        <FloatingNavbar />
        {/* Sparkles Background */}
        <div className="absolute inset-0 z-0">
          <Sparkles
            id="hero-sparkles"
            className="w-full h-full"
            background="transparent"
            particleColor="rgba(100, 200, 255, 0.5)"
            particleDensity={50}
            speed={0.3}
            minSize={1}
            maxSize={2}
          >
            <div></div> {/* Empty div to avoid affecting content layout */}
          </Sparkles>
        </div>

        {/* Hero Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 flex items-center justify-center min-h-screen px-6 sm:px-8 max-w-[1400px] mx-auto"
        >
          {/* Content and Image Container */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 w-full">
            {/* Left Content with Acrylic Box */}
            <div className="w-full lg:w-1/2 relative">
              {/* Acrylic Box using your specific styling */}
              <motion.div
                className="absolute inset-0 rounded-xl
                  bg-white/15 dark:bg-black/20
                  backdrop-filter backdrop-blur-[2.5px]
                  border border-white/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.3 }}
                whileHover={{
                  boxShadow: "0 12px 40px 0 rgba(31, 38, 135, 0.45)",
                  transition: { duration: 0.3 },
                }}
              ></motion.div>

              <div className="relative z-10 p-8 md:p-12 lg:p-14">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-5xl md:text-7xl lg:text-7xl font-bold mb-6 tracking-tight text-left"
                >
                  <span className="text-black dark:text-white">Welcome to</span>
                  <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-blue-500">
                    SMILE-SHARE
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-xl md:text-2xl lg:text-2xl text-muted-foreground dark:text-gray-300 mb-10 text-left max-w-xl"
                >
                  Streamline your NGO management process with our powerful
                  platform
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="flex flex-col sm:flex-row gap-4 justify-start"
                >
                  <Link
                    href="/register"
                    className="group relative px-6 py-3 text-lg md:text-xl font-medium bg-primary text-primary-foreground rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
                  >
                    <span className="relative z-10">Get Started</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-primary-foreground/0 via-primary-foreground/10 to-primary-foreground/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-0 transition-all duration-700"></span>
                  </Link>

                  <Link
                    href="/ngo"
                    className="group px-6 py-3 text-lg md:text-xl font-medium border border-border rounded-lg hover:bg-accent/50 transition-all duration-300 hover:shadow-lg"
                  >
                    <span>Explore NGOs</span>
                    <span className="inline-block ml-2 transform group-hover:translate-x-1 transition-transform duration-200">
                      →
                    </span>
                  </Link>
                </motion.div>
              </div>
            </div>

            {/* Right Side - Circular Image Carousel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="w-full lg:w-1/2 flex justify-center items-center pt-10 lg:pt-0"
            >
              <motion.div
                className="relative w-80 h-80 md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px]"
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Rotating border effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-spin-slow"></div>

                {/* Circular frame with acrylic effect */}
                <div
                  className="absolute inset-[4px] rounded-full 
                  bg-white/15 dark:bg-black/20
                  backdrop-filter backdrop-blur-[2.5px]
                  border border-white/20
                  overflow-hidden"
                >
                  {/* Image carousel */}
                  <div className="relative w-full h-[600px] rounded-xl overflow-hidden">
                    {carouselItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        className="absolute inset-0"
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{
                          opacity: currentImage === index ? 1 : 0,
                          scale: currentImage === index ? 1 : 1.05,
                        }}
                        transition={{
                          opacity: { duration: 0.7 },
                          scale: { duration: 1 },
                        }}
                      >
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority={index === 0}
                        />

                        {/* Overlay gradient */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30 opacity-80`}
                        />

                        {/* Content */}
                        <motion.div
                          className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-0 hover:opacity-100 transition-all duration-300"
                          initial={{ opacity: 0, scale: 0.95 }}
                          whileHover={{
                            opacity: 1,
                            scale: 1,
                            transition: { duration: 0.3 },
                          }}
                        >
                          <div className="bg-black/60 backdrop-blur-md p-6 rounded-xl max-w-md w-full transform hover:scale-105 transition-transform duration-300 border border-white/10">
                            <h3 className="text-3xl font-bold mb-3 text-white drop-shadow-md">
                              {item.title}
                            </h3>
                            <p className="text-white text-lg font-medium drop-shadow-md">
                              Explore how our platform is making a real
                              difference in communities around the world.
                            </p>
                          </div>
                        </motion.div>
                      </motion.div>
                    ))}

                    {/* Navigation dots */}
                    <div className="absolute bottom-4 right-8 flex space-x-2">
                      {carouselItems.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImage(index)}
                          className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            currentImage === index
                              ? "bg-white scale-125"
                              : "bg-white/50 hover:bg-white/80"
                          }`}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 1 }}
            className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          >
            <div className="animate-bounce flex flex-col items-center text-muted-foreground">
              <span className="text-sm mb-2">Scroll to explore</span>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 5V19M12 19L5 12M12 19L19 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* SVG Mask Effect Section */}
      <section className="relative bg-white dark:bg-black border-t border-border/20 py-16 w-full">
        <div className="container mx-auto px-4">
          <MaskContainer
            revealText={
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-black dark:text-white">
                  Empowering Communities Together
                </h2>
                <p className="text-xl text-muted-foreground dark:text-gray-300 max-w-2xl mx-auto">
                  Hover or move your cursor over this section to reveal our
                  mission and impact.
                </p>
              </div>
            }
            className="h-[500px] my-10 rounded-2xl overflow-hidden w-full"
            revealSize={500}
          >
            <div className="relative bg-black dark:bg-white p-10 rounded-xl max-w-5xl mx-auto w-full">
              {/* Background image */}
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <Image
                  src="/img/img3.jpg"
                  alt="Impact image"
                  fill
                  style={{ objectFit: "cover", opacity: 0.4 }}
                />
              </div>

              <div className="relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white dark:text-black">
                  Making a Difference
                </h2>
                <p className="text-xl text-white/90 dark:text-black/90 max-w-2xl mb-8">
                  Our platform connects NGOs, volunteers, and communities to
                  create meaningful change and sustainable impact across various
                  social and environmental initiatives.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/about"
                    className="px-6 py-3 rounded-lg text-lg bg-white text-black dark:bg-black dark:text-white font-medium transition-transform hover:scale-105"
                  >
                    Learn More
                  </Link>
                  <Link
                    href="/register"
                    className="px-6 py-3 rounded-lg text-lg bg-blue-500 text-white font-medium transition-transform hover:scale-105"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </div>
          </MaskContainer>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              viewport={{ once: true }}
              className="inline-block mb-3 px-3 py-1 bg-primary/10 rounded-full text-primary font-medium"
            >
              Testimonials
            </motion.div>
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-4 text-black"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              viewport={{ once: true }}
            >
              What Our Users Say
            </motion.h2>
            <motion.p
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              viewport={{ once: true }}
            >
              Hear from the people who are making a difference with our platform
            </motion.p>
          </motion.div>

          <AnimatedTestimonials testimonials={testimonials} autoplay={true} />
        </div>
      </section>

      {/* Features Section */}
      <div
        ref={featuresRef}
        className="relative bg-white dark:bg-black py-16 z-10 transition-colors duration-300"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={
            isVisible.features ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
          }
          transition={{ duration: 0.8 }}
          className="flex justify-center mb-16 relative"
        >
          {/* Decorative lines */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-40 h-40">
            <div className="absolute top-0 left-1/2 w-[1px] h-20 bg-purple-500/20 dark:bg-purple-400/20"></div>
            <div className="absolute bottom-0 left-1/2 w-[1px] h-20 bg-purple-500/20 dark:bg-purple-400/20"></div>
            <div className="absolute left-0 top-1/2 h-[1px] w-20 bg-purple-500/20 dark:bg-purple-400/20"></div>
            <div className="absolute right-0 top-1/2 h-[1px] w-20 bg-purple-500/20 dark:bg-purple-400/20"></div>
          </div>

          {/* Button with spinning border */}
          <div className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none bg-primary/20">
            <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-black px-8 py-1 text-lg font-medium text-black dark:text-white">
              Features
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={
            isVisible.features ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
          }
          transition={{ duration: 0.8, delay: 0.2 }}
          className="container mx-auto px-4"
        >
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-black dark:text-white">
              Powerful Features to Maximize Impact
            </h2>
            <p className="text-lg text-muted-foreground dark:text-gray-300">
              Our platform provides all the tools you need to manage your NGO
              effectively, connect with volunteers, and make a real difference
              in your community.
            </p>
          </div>

          <div className="max-w-7xl mx-auto">
            <BentoGrid>
              {featureData.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className={feature.className}
                >
                  <BentoCard
                    name={feature.name}
                    description={feature.description}
                    Icon={FeatureIcons[feature.icon]}
                    href={feature.href}
                    cta={feature.cta}
                    className="h-full group hover:shadow-lg transition-all duration-300"
                    background={
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/20 opacity-50 dark:from-primary/10 dark:to-primary/20 group-hover:opacity-70 transition-opacity duration-300" />
                    }
                  />
                </motion.div>
              ))}
            </BentoGrid>
          </div>
        </motion.div>

        {/* Why Choose Us Section */}
        <div
          ref={whyChooseUsRef}
          className="mt-24 mb-16 transition-colors duration-300"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={
              isVisible.whyChooseUs
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 30 }
            }
            transition={{ duration: 0.8 }}
            className="flex justify-center mb-16 relative"
          >
            {/* Decorative lines */}
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-40 h-40">
              <div className="absolute top-0 left-1/2 w-[1px] h-20 bg-purple-500/20 dark:bg-purple-400/20"></div>
              <div className="absolute bottom-0 left-1/2 w-[1px] h-20 bg-purple-500/20 dark:bg-purple-400/20"></div>
              <div className="absolute left-0 top-1/2 h-[1px] w-20 bg-purple-500/20 dark:bg-purple-400/20"></div>
              <div className="absolute right-0 top-1/2 h-[1px] w-20 bg-purple-500/20 dark:bg-purple-400/20"></div>
            </div>

            {/* Button with spinning border */}
            <div className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none bg-primary/20">
              <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-black px-8 py-1 text-lg font-medium text-black dark:text-white">
                Why Choose Us?
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={
              isVisible.whyChooseUs
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 30 }
            }
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-3xl mx-auto px-4 sm:px-6"
          >
            <Accordion type="single" collapsible className="w-full">
              {[
                {
                  id: "item-1",
                  title: "Efficiency Meets Innovation",
                  content:
                    "From AI-driven validation to QR-based attendance and e-certificates, our platform eliminates inefficiencies, making NGO management smarter and faster.",
                },
                {
                  id: "item-2",
                  title: "Comprehensive Tools for Every User",
                  content:
                    "Whether you're an admin, member, or student, our tailored tools ensure a seamless experience for organizing, managing, and participating in NGO activities.",
                },
                {
                  id: "item-3",
                  title: "Data-Driven Insights",
                  content:
                    "Leverage analytics and reports to improve your NGO activities. Identify trends, optimize engagement, and make informed decisions.",
                },
                {
                  id: "item-4",
                  title: "Enhanced Collaboration",
                  content:
                    "Volunteers and organizers can communicate effortlessly through dedicated chat rooms and multi-channel notifications.",
                },
              ].map((item, index) => (
                <AccordionItem value={`item-${index}`} className="border-none">
                  <AccordionTrigger className="text-left py-6 group">
                    <div className="flex items-center gap-4">
                      <motion.div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors dark:bg-primary/20 dark:group-hover:bg-primary/30"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                        }}
                      >
                        <span className="font-semibold">{index + 1}</span>
                      </motion.div>
                      <motion.span
                        className="text-lg font-semibold group-hover:text-primary transition-colors dark:text-white"
                        whileHover={{ x: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {item.title}
                      </motion.span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-14 text-muted-foreground dark:text-gray-300 text-base leading-relaxed">
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        duration: 0.3,
                        height: { duration: 0.4 },
                        opacity: { duration: 0.3 },
                      }}
                    >
                      {item.content}
                    </motion.div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>

      {/* Call to Action Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <SparklesCore
            id="tsparticlesfullpage"
            background="transparent"
            minSize={0.4}
            maxSize={1.5}
            particleDensity={70}
            className="w-full h-full"
            particleColor="#4f46e5"
            speed={1}
            opacity={0.5}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-pink-500/30 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-pink-500/10" />

        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-6 text-black dark:text-white"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                type: "spring",
                stiffness: 100,
              }}
              viewport={{ once: true }}
            >
              Transform Your NGO Management Today
            </motion.h2>

            <motion.div
              className="mt-8 flex justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Link
                href="/register"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/30"
              >
                <motion.span
                  className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600"
                  initial={{ opacity: 0 }}
                  whileHover={{
                    opacity: 1,
                    transition: { duration: 0.3 },
                  }}
                />
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 group-hover:blur-md transition-all duration-500" />
                <motion.span
                  className="relative z-10 inline-flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  Get Started
                  <svg
                    className="w-5 h-5 transition-transform group-hover:translate-x-1"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </motion.span>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
