import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface SidebarCtx {
  isExpanded: boolean;
  isHovered: boolean;
  isMobileOpen: boolean;
  activeItem: string | null;
  openSubmenu: string | null;
  setActiveItem: (key: string | null) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setIsHovered: (v: boolean) => void;
  toggleSubmenu: (key: string) => void;
}

const SidebarContext = createContext<SidebarCtx | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsMobileOpen(false);
    };
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobile) setIsMobileOpen((v) => !v);
    else setIsExpanded((v) => !v);
  }, [isMobile]);

  const toggleMobileSidebar = useCallback(() => setIsMobileOpen((v) => !v), []);

  const toggleSubmenu = useCallback(
    (key: string) => setOpenSubmenu((prev) => (prev === key ? null : key)),
    [],
  );

  const value: SidebarCtx = {
    isExpanded: isMobile ? false : isExpanded,
    isHovered,
    isMobileOpen,
    activeItem,
    openSubmenu,
    setActiveItem,
    toggleSidebar,
    toggleMobileSidebar,
    setIsHovered,
    toggleSubmenu,
  };

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside SidebarProvider");
  return ctx;
}
