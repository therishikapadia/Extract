import './App.css'
import Navbar, { NavBody, NavItems, NavbarLogo, NavbarButton } from './components/Navbar'
import FileUpload,{GridPattern} from './components/FileUpload'

function App() {

  // Example nav items
  const navItems = [
    { name: "Home", link: "#" },
    { name: "About", link: "#" },
    { name: "Contact", link: "#" }
  ];

  return (
    <div className='bg-gray-900 min-h-screen flex flex-col p-0 m-0'>
      <Navbar>
        <NavBody >
          <NavbarLogo />
          <NavItems items={navItems} />
          <NavbarButton href="#" variant="dark" className='bg-gray-800'>Sign Up</NavbarButton>
        </NavBody>
      </Navbar>
      <div className='flex justify-center items-center flex-grow  p-0 m-0'> 
      <FileUpload className='border border-red-500' >
      <GridPattern />
        </FileUpload>
        </div>
      {/* Temporary tall div for scroll testing */}
      <div style={{ height: '150vh' }} />
    </div>
  )
}

export default App
