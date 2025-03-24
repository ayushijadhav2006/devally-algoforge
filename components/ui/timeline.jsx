"use client";
import {
  useMotionValueEvent,
  useScroll,
  useTransform,
  motion,
} from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

const timelineData = [
  {
    title: "Our Vision",
    content: (
      <div className="bg-neutral-100 rounded-xl p-6 space-y-4">
        <p className="text-neutral-700">
          To become the leading NGO management platform for NGOs worldwide,
          transforming how NGOs manage their activities, events, and foster
          communities.
        </p>
      </div>
    ),
  },
  {
    title: "Our Mission",
    content: (
      <div className="bg-neutral-100 rounded-xl p-6 space-y-4">
        <ul className="list-disc pl-5 text-neutral-700 space-y-2">
          <li>Simplify NGO management with advanced tools and automation.</li>
          <li>
            Enable seamless collaboration between admins, NGOs, and volunteers.
          </li>
          <li>
            Enhance user experience through AI-powered verification and
            analytics.
          </li>
          <li>
            Provide NGOs with actionable insights to improve their activities
            and operations.
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "Why Choose Us",
    content: (
      <div className="bg-neutral-100 rounded-xl p-6 space-y-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-black">
            1. Technology-Driven Innovation
          </h4>
          <p className="text-neutral-700">
            We integrate the latest technologies, including AI and QR-based
            tools, to automate tedious tasks, ensuring efficiency and accuracy
            in every process.
          </p>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-black">2. User-Centric Design</h4>
          <p className="text-neutral-700">
            Our platform is built with you in mind—offering a user-friendly
            interface, customizable forms, and role-based access controls to
            meet the specific needs of NGOs and volunteers.
          </p>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-black">
            3. Security & Authenticity
          </h4>
          <p className="text-neutral-700">
            With features like domain-based email verification and AI-powered
            receipt validation, we ensure that only genuine NGOs and authorized
            users can access the platform.
          </p>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-black">
            4. Comprehensive Event Management
          </h4>
          <p className="text-neutral-700">
            From activity creation to participation tracking, we provide
            end-to-end solutions, including integrated payment systems, feedback
            tools, and e-certificates.
          </p>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-black">5. Data-Driven Insights</h4>
          <p className="text-neutral-700">
            Our real-time analytics dashboards empower NGOs with the insights
            they need to evaluate activity performance and make data-driven
            decisions.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Who We Serve",
    content: (
      <div className="bg-neutral-100 rounded-xl p-6 space-y-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-black">NGOs</h4>
          <p className="text-neutral-700">
            Simplify activity planning, manage volunteer participation, and gain
            actionable insights to improve NGO activities.
          </p>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-black">Institutions</h4>
          <p className="text-neutral-700">
            Discover and register for activities, volunteer, and engage with
            your institution through a streamlined, secure platform.
          </p>
        </div>
        <div className="space-y-4">
          <h4 className="font-semibold text-black">Volunteers</h4>
          <p className="text-neutral-700">
            Collaborate with NGO organizers and fellow volunteers while building
            valuable experience.
          </p>
        </div>
      </div>
    ),
  },
];

export const Timeline = () => {
  const ref = useRef(null);
  const containerRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div className="w-full bg-white font-sans md:px-10" ref={containerRef}>
      <div className="max-w-7xl mx-auto py-20 px-4 md:px-8 lg:px-10">
        <h2 className="text-lg md:text-4xl mb-4 text-black max-w-4xl">
          About Us
        </h2>
        <p className="text-neutral-700 text-sm md:text-base max-w-sm">
          Learn about our mission, vision, and commitment to transforming NGO
          management.
        </p>
      </div>

      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {timelineData.map((item, index) => (
          <div
            key={index}
            className="flex justify-start pt-10 md:pt-40 md:gap-10"
          >
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
              <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-white flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-neutral-200 border border-neutral-300 p-2" />
              </div>
              <h3 className="hidden md:block text-xl md:pl-20 md:text-5xl font-bold text-neutral-500 ">
                {item.title}
              </h3>
            </div>

            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <h3 className="md:hidden block text-2xl mb-4 text-left font-bold text-neutral-500">
                {item.title}
              </h3>
              {item.content}
            </div>
          </div>
        ))}
        <div
          style={{
            height: height + "px",
          }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-neutral-200 to-transparent to-[99%]  [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] "
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0  w-[2px] bg-gradient-to-t from-purple-500 via-blue-500 to-transparent from-[0%] via-[10%] rounded-full"
          />
        </div>
      </div>
    </div>
  );
};

export default Timeline;
