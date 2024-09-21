import Logo from "@/components/ui/logo";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link } from "react-router-dom";

export default function Navbar(): JSX.Element {
  return (
    <nav className="sticky top-0 flex items-center justify-between py-4 px-6 w-full bg-gradient-to-r from-gray-800 to-gray-700 shadow-lg z-[100]">
      <Link to="/home" className="transition-transform hover:scale-105">
        <Logo className="w-[160px] h-[55px]" />
      </Link>
      <Link 
        to="/" 
        className="text-white text-2xl font-extrabold tracking-wide transition-all duration-300 transform hover:scale-105 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 hover:drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]"
      >
        Yield Trading
      </Link>
      <ConnectButton
        showBalance={false}
        chainStatus={{ smallScreen: "none", largeScreen: "icon" }}
        accountStatus="avatar"
        className="shadow-md hover:shadow-lg transition-shadow duration-300"
      />
    </nav>
  );
}
