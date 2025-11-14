"use client";
import { cn } from "@/lib/utils";
import { IconMenu2, IconX } from "@tabler/icons-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";

import React, { useRef, useState } from "react";


interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
    id?: string;
  }[];
  className?: string;
  onItemClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  activeId?: string;
  visible?: boolean;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const [visible, setVisible] = useState<boolean>(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 100) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  });

  return (
    <motion.div
      ref={ref}
      // IMPORTANT: Change this to class of `fixed` if you want the navbar to be fixed
      className={cn("sticky inset-x-0 top-0 z-40 w-full mt-4", className)}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible },
            )
          : child,
      )}
    </motion.div>
  );
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  const isDark = document.documentElement.classList.contains("dark");
  
  return (
    <motion.div
      animate={{
        backdropFilter: "none", // Flat design: no blur
        boxShadow: "none", // Flat design: no shadows
        width: visible ? "40%" : "100%",
        y: visible ? 20 : 0,
        backgroundColor: visible 
          ? isDark ? "rgb(23, 23, 23)" : "rgb(255, 255, 255)" // Dark when resized in dark mode, white in light mode
          : isDark ? "rgb(30, 41, 59)" : "rgb(255, 255, 255)", // Dark slate in dark mode, white in light mode initially
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 50,
      }}
      style={{
        minWidth: "800px",
      }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between self-start rounded-full px-4 py-2 lg:flex border border-border",
        visible 
          ? isDark ? "bg-neutral-900" : "bg-white"
          : isDark ? "bg-slate-800" : "bg-white",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick, activeId, visible }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const isDark = document.documentElement.classList.contains("dark");

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 text-sm font-medium transition duration-200 lg:flex lg:space-x-2",
        className,
      )}
    >
      {items.map((item, idx) => {
        const isActive = activeId && item.id === activeId;
        // Change text color based on visible state and theme
        const textColorClass = visible
          ? isActive
            ? isDark ? "text-white font-semibold" : "text-neutral-900 font-semibold"
            : isDark ? "text-neutral-300 hover:text-white" : "text-neutral-700 hover:text-neutral-900"
          : isActive
            ? isDark ? "text-white font-semibold" : "text-neutral-900 font-semibold"
            : isDark ? "text-neutral-200 hover:text-white" : "text-neutral-700 hover:text-neutral-900";
        
        const hoverBgClass = visible
          ? isActive
            ? isDark ? "bg-neutral-800" : "bg-neutral-200"
            : isDark ? "bg-neutral-800/50" : "bg-neutral-100"
          : isActive
            ? isDark ? "bg-white/20" : "bg-neutral-200"
            : isDark ? "bg-white/10" : "bg-neutral-100";

        return (
          <a
            onMouseEnter={() => setHovered(idx)}
            onClick={onItemClick}
            className={cn(
              "relative px-4 py-2 transition-colors",
              textColorClass
            )}
            key={`link-${idx}`}
            href={item.link}
          >
            {(hovered === idx || isActive) && (
              <motion.div
                layoutId="hovered"
                className={cn(
                  "absolute inset-0 h-full w-full rounded-full",
                  hoverBgClass
                )}
              />
            )}
            <span className="relative z-20">{item.name}</span>
          </a>
        );
      })}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  const isDark = document.documentElement.classList.contains("dark");
  
  return (
    <motion.div
      animate={{
        backdropFilter: "none", // Flat design: no blur
        boxShadow: "none", // Flat design: no shadows
        width: visible ? "90%" : "100%",
        paddingRight: visible ? "12px" : "0px",
        paddingLeft: visible ? "12px" : "0px",
        borderRadius: visible ? "8px" : "2rem", // Consistent border radius
        y: visible ? 20 : 0,
        backgroundColor: visible 
          ? isDark ? "rgb(23, 23, 23)" : "rgb(255, 255, 255)" // Dark when resized in dark mode, white in light mode
          : isDark ? "rgb(30, 41, 59)" : "rgb(255, 255, 255)", // Dark slate in dark mode, white in light mode initially
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 50,
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between px-0 py-2 lg:hidden rounded-full border border-border",
        visible 
          ? isDark ? "bg-neutral-900" : "bg-white"
          : isDark ? "bg-slate-800" : "bg-white",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
  onClose,
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "absolute inset-x-0 top-16 z-50 flex w-full flex-col items-start justify-start gap-4 rounded-lg bg-white dark:bg-neutral-900 border border-border px-4 py-8",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  const isDark = document.documentElement.classList.contains("dark");
  const textColor = isDark ? "text-neutral-200 hover:text-white" : "text-neutral-700 hover:text-neutral-900";
  
  return isOpen ? (
    <IconX className={cn(textColor, "cursor-pointer transition-colors")} onClick={onClick} />
  ) : (
    <IconMenu2 className={cn(textColor, "cursor-pointer transition-colors")} onClick={onClick} />
  );
};

export const NavbarLogo = () => {
  return (
    <a
      href="#"
      className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-black"
    >
      <img
        src="https://assets.aceternity.com/logo-dark.png"
        alt="logo"
        width={30}
        height={30}
      />
      <span className="font-medium text-black dark:text-white">Startup</span>
    </a>
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "a",
  children,
  className,
  variant = "primary",
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "dark" | "gradient";
} & (
  | React.ComponentPropsWithoutRef<"a">
  | React.ComponentPropsWithoutRef<"button">
)) => {
  const baseStyles =
    "px-6 py-3 rounded-lg text-sm font-semibold cursor-pointer transition-colors inline-block text-center";

  const variantStyles = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/85 active:bg-primary/75",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    dark: "bg-neutral-900 text-white hover:bg-neutral-800",
    gradient: "bg-primary text-white hover:bg-primary/85", // Flat design: no gradients
  };

  return (
    <Tag
      href={href || undefined}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Tag>
  );
};
