import { BottomBar, SideRail } from "@/design/AppNav";

/**
 * Every section except full-screen games. The content column scrolls on its
 * own so the bar/rail stay put and pages can use sticky headers.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-shell lg:flex-row">
      <SideRail />
      <div id="scroll-root" className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
      <BottomBar />
    </div>
  );
}
