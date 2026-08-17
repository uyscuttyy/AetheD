import type { Metadata } from "next";
import Link from "next/link";
import "./styles.css";
import "./sell.css";
import "./purchase.css";

export const metadata: Metadata = {
  title: "AetheD — Verified data for autonomous AI",
  description: "Evidence-backed datasets for AI agents and builders."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><header className="nav shell"><Link href="/" className="brand">AetheD<span>.</span></Link><nav><Link href="/marketplace">Marketplace</Link><Link href="/#agents">For Agents</Link><Link href="/sell">Sell Data</Link></nav><div className="navActions"><button className="quietButton">Dashboard</button><button className="darkButton">Connect Wallet</button></div></header><main>{children}</main><footer className="shell footer"><div className="brand">AetheD<span>.</span></div><p>Verified data for autonomous AI.</p><p>Built for 0G infrastructure.</p></footer></body></html>;
}
