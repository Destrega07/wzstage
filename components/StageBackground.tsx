"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

export default function StageBackground({
  backgroundSrc,
  children,
}: {
  backgroundSrc: string;
  children: React.ReactNode;
}) {
  const backgroundOpacity = backgroundSrc === "/bg-curtain.png" ? 0.62 : 0.3;
  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[radial-gradient(1200px_circle_at_50%_-20%,color-mix(in_oklab,var(--color-dh-gold),transparent_65%),transparent_70%),radial-gradient(900px_circle_at_20%_10%,color-mix(in_oklab,var(--color-dh-azure),transparent_70%),transparent_68%),radial-gradient(900px_circle_at_80%_30%,color-mix(in_oklab,var(--color-dh-red),transparent_78%),transparent_60%)]">
      <AnimatePresence mode="wait">
        {backgroundSrc === "/bg-curtain.png" ? (
          <motion.div
            key={backgroundSrc}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{ opacity: backgroundOpacity }}
            className="pointer-events-none absolute inset-0"
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${backgroundSrc})`,
                backgroundRepeat: "repeat",
                backgroundPosition: "center top",
                backgroundSize: "clamp(320px, 100vw, 472px) auto",
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key={backgroundSrc}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{ opacity: backgroundOpacity }}
            className="pointer-events-none absolute inset-0"
          >
            <Image
              src={backgroundSrc}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative">{children}</div>
    </div>
  );
}
