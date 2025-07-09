
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Gem, Coins, LogOut, Menu, Shield, Trophy, Ticket, Layers } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export default function Header() {
  const { userData, logout } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  }

  const navLinks = [
    { href: "/betting", label: "All Wagers", icon: <Gem className="h-4 w-4" /> },
    { href: "/parlay-builder", label: "Parlay Builder", icon: <Layers className="h-4 w-4" /> },
    { href: "/my-wagers", label: "My Wagers", icon: <Ticket className="h-4 w-4" /> },
    { href: "/leaderboard", label: "Leaderboard", icon: <Trophy className="h-4 w-4" /> },
  ];

  if (userData?.isAdmin) {
    navLinks.push({ href: "/admin", label: "Admin", icon: <Shield className="h-4 w-4" /> });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-8 hidden md:flex">
           <Link href="/betting" className="flex items-center gap-2">
            <Gem className="h-6 w-6 text-primary" />
            <span className="font-headline text-xl font-bold">Wedding Wager</span>
          </Link>
        </div>
        
        {/* Mobile Nav */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle>
                <Link href="/betting" className="flex items-center gap-2"
                  // Close sheet on navigation
                  onClick={() => (document.querySelector('[data-radix-dialog-close]') as HTMLElement)?.click()}
                >
                  <Gem className="h-6 w-6 text-primary" />
                  <span className="font-headline text-xl font-bold">Wedding Wager</span>
                </Link>
              </SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-lg font-medium transition-colors hover:bg-accent",
                      pathname === link.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                    )}
                     // Close sheet on navigation
                    onClick={() => (document.querySelector('[data-radix-dialog-close]') as HTMLElement)?.click()}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname.startsWith(link.href) ? "text-foreground" : "text-foreground/60"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-4">
          {userData ? (
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground shadow-inner">
                  <Coins className="h-4 w-4 text-primary" />
                  <span style={{ color: "hsl(var(--primary-foreground))" }}>
                    {userData.balance.toLocaleString()}
                  </span>
                </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                   <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        {userData.photoURL && <AvatarImage src={userData.photoURL} alt={userData.nickname} />}
                        <AvatarFallback>{userData.nickname?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userData.nickname}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {userData.isAdmin ? "Administrator" : "Guest Player"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button asChild>
              <Link href="/">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
