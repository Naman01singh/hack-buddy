/**
 * Footer Component
 * 
 * Displays license information and copyright notice at the bottom of the application.
 * This component is rendered at the end of the page layout to provide legal information
 * and maintain proper footer structure.
 * 
 * @component
 * @returns {JSX.Element} Footer component with license information
 */
import { Separator } from "@/components/ui/separator";

/**
 * Footer component that displays license and copyright information
 * 
 * Features:
 * - Responsive design that adapts to different screen sizes
 * - Dark mode compatible styling
 * - Clean separation from main content
 * - License information display
 */
export const Footer = () => {
  // Get current year dynamically for copyright
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <Separator className="mb-6" />
        
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          {/* Copyright and License Information */}
          <div className="flex flex-col items-center space-y-2">
            <p className="text-sm text-muted-foreground">
              © {currentYear} Hack-Buddy. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              This project is private and proprietary.
            </p>
          </div>

          {/* Additional Footer Links (Optional - can be expanded) */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>Made with ❤️ for the hackathon community</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

