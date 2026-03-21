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
      // 🔥 CALL BOTH APIs
      const [basicRes, proRes] = await Promise.all([
        fetch("/api/analyse", {
          method: "POST",
          body: JSON.stringify({ wallet }),
        }),
        fetch("/api/analyse-pro", {
          method: "POST",
          body: JSON.stringify({ wallet }),
        }),
      ])

      const basicData = await basicRes.json()
      const proData = await proRes.json()

      console.log("BASIC:", basicData)
      console.log("PRO:", proData)

      // 🔥 MERGE DATA
      setData({
        ...basicData,
        ...proData,
      })

    } catch (err) {
      alert("Error analysing wallet")
    }

    setLoading(false)
  }

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>🔥 Base Wallet Analyser (PRO)</h1>

      <input
        placeholder="Enter wallet address"
        value={wallet}
        onChange={(e) => setWallet(e.target.value)}
        style={{ padding: 10, width: 320 }}
      />

      <br /><br />

      <button onClick={analyse} style={{ padding: 10 }}>
        {loading ? "Analysing..." : "Analyse"}
      </button>

      <br /><br />

      {data && !data.error && (
        <div style={{
          background: "#111",
          color: "#0f0",
          padding: 20,
          borderRadius: 10
        }}>

          {/* 🔥 BASIC DATA */}
          <p>📊 Transactions: {data.totalTxns || 0}</p>
          <p>💰 Transfer Volume: {data.totalVolumeETH || 0} ETH</p>
          <p>⛽ Gas: {data.totalGasETH || 0} ETH</p>
          <p>📅 Active Days: {data.activeDays || 0}</p>

          <hr style={{ margin: "15px 0", borderColor: "#333" }} />

          {/* 🔥 PRO DATA */}
          <p>🔁 Swaps: {data.swapCount || 0}</p>

          <p>
            💎 Trading Volume: $
            {data.tradingVolumeUSD !== undefined
              ? data.tradingVolumeUSD
              : 0}
          </p>

          <p>📅 Trading Days: {data.tradingDays || 0}</p>

          {/* 🔥 NEW */}
          <p>
            ⛽ Trading Gas: {data.tradingGasETH || 0} ETH
          </p>

        </div>
      )}

      {data?.error && (
        <p style={{ color: "red" }}>
          {data.error}
        </p>
      )}
    </main>
  )
}
