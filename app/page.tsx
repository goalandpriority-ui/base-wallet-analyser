"use client"

import { useState } from "react"

export default function Home() {
  const [wallet, setWallet] = useState("")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const analyse = async () => {
    setLoading(true)
    setData(null)

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        body: JSON.stringify({ wallet }),
      })

      const json = await res.json()
      setData(json)
    } catch (err) {
      alert("Error analysing wallet")
    }

    setLoading(false)
  }

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>🔥 Base Wallet Analyser</h1>

      <input
        placeholder="Enter wallet address"
        value={wallet}
        onChange={(e) => setWallet(e.target.value)}
        style={{ padding: 10, width: 300 }}
      />

      <br /><br />

      <button onClick={analyse} style={{ padding: 10 }}>
        {loading ? "Analysing..." : "Analyse"}
      </button>

      <br /><br />

      {data && !data.error && (
        <div style={{ background: "#111", color: "#0f0", padding: 20 }}>
          <p>📊 Transactions: {data.totalTxns}</p>
          <p>💰 Volume: {data.totalVolumeETH} ETH</p>
          <p>⛽ Gas: {data.totalGasETH} ETH</p>
          <p>📅 Active Days: {data.activeDays}</p>
        </div>
      )}

      {data?.error && <p style={{ color: "red" }}>{data.error}</p>}
    </main>
  )
}
