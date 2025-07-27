import React from 'react';
import Navbar, { NavBody, NavItems, NavbarLogo, NavbarButton } from '../components/Navbar';
import FileUpload from '../components/FileUpload';
import { HeroHighlightBackground, Highlight } from '../ui/hero-highlight';
import { HeroHighlightDemo } from '../components/HeroSection';
import { BentoGridThirdDemo } from '../components/BentoGrid'; // Add this import

const navItems = [
  { name: "Home", link: "#" },
  { name: "About", link: "#" },
  { name: "Contact", link: "#" }
];

const HomePage = ({ onShowAuth, loggedIn }) => {
  return (
    <div className="relative min-h-screen flex flex-col p-0 m-0 overflow-hidden">
      <Navbar className="fixed top-0 left-0 w-full z-50 text-white shadow">
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          {!loggedIn && (
            <NavbarButton
              href="#"
              variant="dark"
              className="bg-black hover:bg-neutral-900"
              onClick={e => {
                e.preventDefault();
                onShowAuth();
              }}
            >
              Sign Up
            </NavbarButton>
          )}
        </NavBody>
      </Navbar>
      
      <main className="flex flex-col items-center flex-grow w-full z-10 relative bg-black">

        {/* Hero Section */}
        <div className="w-full flex justify-center">
          <HeroHighlightBackground>
            <HeroHighlightDemo>
              Know What You Eat. Own Every Bite.<br />
              Decode Food Labels Like a Pro —{' '}
              <Highlight className="text-black dark:text-white">
                instantly.
              </Highlight>
            </HeroHighlightDemo>
          </HeroHighlightBackground>
        </div>

          {/* Features Section with BentoGrid */}
        <section className="w-full py-20 px-4 bg-black">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Powerful AI Features
              </h2>
              <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
                Experience the future of food label analysis with our comprehensive AI-powered tools
              </p>
            </div>
            <BentoGridThirdDemo />
          </div>
        </section>
   
        {/* File Upload Section */}
        <div className="w-full flex justify-center mt-0.5">
          <FileUpload />
        </div>
        
      </main>
      
      <div className='h-full p-0 m-0' />
    </div>
  );
};

export default HomePage;