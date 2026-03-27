// app/layout.tsx
import Navbar from "./navbar"

/* ==================== STYLES ==================== */

const body = {
  margin: 0,
  minHeight: "100vh",
  fontFamily: "system-ui",
  background: "radial-gradient(circle at 20% 20%, #071225 0%, #020617 40%)",
  color: "white"
}

const container = {
  maxWidth: 900,
  margin: "auto",
  padding: 20
}

const glow1 = {
  position: "fixed" as const,
  top: -200,
  left: -200,
  width: 400,
  height: 400,
  background: "radial-gradient(#22c55e33, transparent)",
  filter: "blur(80px)",
  zIndex: -1
}

const glow2 = {
  position: "fixed" as const,
  bottom: -200,
  right: -200,
  width: 400,
  height: 400,
  background: "radial-gradient(#3b82f633, transparent)",
  filter: "blur(80px)",
  zIndex: -1
}

const glow3 = {
  position: "fixed" as const,
  top: "40%",
  left: "50%",
  width: 300,
  height: 300,
  background: "radial-gradient(#22c55e22, transparent)",
  filter: "blur(60px)",
  zIndex: -1
}

/* ==================== COMPONENT ==================== */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={body}>
        <div style={glow1} />
        <div style={glow2} />
        <div style={glow3} />

        <Navbar />

        <div style={container}>
          {children}
        </div>
      </body>
    </html>
  )
}
