import React from 'react';
import Navbar, { NavBody, NavItems, NavbarLogo, NavbarButton } from '../components/Navbar';

import FileUpload from '../components/FileUpload';

  const navItems = [
    { name: "Home", link: "#" },
    { name: "About", link: "#" },
    { name: "Contact", link: "#" }
  ];


const HomePage = () => {
  return (
    <div className='bg-gray-900 min-h-screen flex flex-col p-0 m-0'>
      <Navbar>
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <NavbarButton href="#" variant="dark" className='bg-gray-800'>
            Sign Up
          </NavbarButton>
        </NavBody>
      </Navbar>
      <div className='flex justify-center items-center flex-grow p-50 m-0'>
        <FileUpload />
        {/* <ChatApp /> */}
      </div>
      <div style={{ height: '150vh' }} />
    </div>
  );
};

export default HomePage;
