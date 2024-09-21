import Logo from "@/components/ui/logo";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Link } from "react-router-dom";

export default function Navbar(): JSX.Element {
  return (
    <nav className="sticky top-0 flex items-center justify-between py-3 px-5 w-full bg-gray-600/20 backdrop-blur-lg z-[100]">
      <Link to="/home">
        <Logo className="w-[150px] h-[50px]" />
      </Link>
      <Link to="/" className="text-white hover:text-gray-300 text-xl font-extrabold">
        Yield Trading
      </Link>
      <ConnectButton
        showBalance={false}
        chainStatus={{ smallScreen: "none", largeScreen: "icon" }}
      />
    </nav>
  );
}
