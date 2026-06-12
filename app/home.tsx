"use client"

import { useEffect, useState, CSSProperties } from "react"
import { sdk } from "@farcaster/miniapp-sdk"

if (typeof window !== "undefined") {
  document.documentElement.style.background = "#050f1a"
  document.body.style.background = "#050f1a"
  document.body.style.color = "#e2e8f0"
}

export default function Home() {

  const [walletInput, setWalletInput] = useState("")
  const [wallet, setWallet] = useState("")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  /* MINIAPP READY */
  useEffect(() => {
    sdk.actions.ready()
  }, [])

  /* AUTO-DETECT FARCASTER WALLET (pre-fill input only) */
  useEffect(() => {
    const init = async () => {
      try {
        const provider = await sdk.wallet.getEthereumProvider()
        if (provider) {
          const accounts = await provider.request({ method: "eth_accounts" })
          if (accounts?.[0]) {
            setWalletInput(accounts[0].toLowerCase())
            return
          }
        }
      } catch {}

      try {
        let context: any = await sdk.context
        const fcWallet =
          context?.user?.wallet?.address ||
          context?.user?.verifiedAddresses?.ethAddresses?.[0]

        if (fcWallet) {
          setWalletInput(fcWallet.toLowerCase())
          return
        }
      } catch {}
    }
    init()
  }, [])

  /* VALIDATE ADDRESS */
  const isValidAddress = (addr: string) =>
    /^0x[a-fA-F0-9]{40}$/.test(addr.trim())

  /* ANALYSE */
  const analyse = async () => {
    const addr = walletInput.trim().toLowerCase()

    if (!isValidAddress(addr)) {
      setError("Please enter a valid Base wallet address (0x...)")
      return
    }

    setError("")
    setWallet(addr)
    setLoading(true)
    setData(null)

    try {
      const [basicRes, proRes] = await Promise.all([
        fetch("/api/analyse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: addr }),
        }),
        fetch("/api/analyse-pro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: addr }),
        }),
      ])

      const basicData = await basicRes.json()
      const proData = await proRes.json()
      const finalData = { ...basicData, ...proData }

      setData(finalData)

      /* AUTO CAST */
      try {
        await sdk.actions.composeCast({
          text: `🔍 Base Wallet Report

${addr.slice(0, 6)}...${addr.slice(-4)}

📊 Txns: ${finalData.totalTxns}
💰 Volume: ${finalData.totalVolumeETH} ETH
🔁 Swaps: ${finalData.swapCount}
💎 Trading Vol: $${finalData.tradingVolumeUSD?.toLocaleString()}
🏆 Rank: #${finalData.rank}
⭐ Score: ${finalData.score}

Check yours 👇`,
          embeds: ["https://base-wallet-analyser.vercel.app/"],
        })
      } catch {}
    } catch (e) {
      setError("Analysis failed. Please try again.")
      console.error(e)
    }

    setLoading(false)
  }

  /* COPY WALLET */
  const copyWallet = () => {
    navigator.clipboard.writeText(wallet)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  /* SCORE TIER */
  const getScoreTier = (score: number) => {
    if (score >= 10000) return { label: "Diamond", color: "#67e8f9", emoji: "💎" }
    if (score >= 5000)  return { label: "Platinum", color: "#a78bfa", emoji: "🪙" }
    if (score >= 1000)  return { label: "Gold",     color: "#fbbf24", emoji: "🥇" }
    if (score >= 300)   return { label: "Silver",   color: "#94a3b8", emoji: "🥈" }
    return                     { label: "Bronze",   color: "#f97316", emoji: "🥉" }
  }

  const tier = data ? getScoreTier(data.score) : null

  /* SHORT ADDRESS */
  const short = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ""

  return (
    <main style={wrap}>

      {/* HEADER */}
      <div style={header}>
        <div style={logoRow}>
          <span style={logoIcon}>⚡</span>
          <div>
            <h1 style={titleStyle}>Base Wallet Analyser</h1>
            <div style={subtitleStyle}>Free on-chain stats — no fees, no wallet connect</div>
          </div>
        </div>
        <div style={baseBadge}>BASE NETWORK</div>
      </div>

      {/* INPUT */}
      <div style={inputCard}>
        <div style={inputLabel}>Enter any Base wallet address</div>
        <div style={inputRow}>
          <input
            value={walletInput}
            onChange={e => { setWalletInput(e.target.value); setError("") }}
            placeholder="0x..."
            style={inputStyle}
            onKeyDown={e => e.key === "Enter" && analyse()}
            spellCheck={false}
          />
          <button
            onClick={analyse}
            disabled={loading}
            style={{ ...analyseBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <span style={spinner}>⟳</span> : "Analyse"}
          </button>
        </div>
        {error && <div style={errorStyle}>{error}</div>}
        <div style={hintStyle}>
          Paste any 0x address · Completely free · No sign-in needed
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div style={loadingCard}>
          <div style={loadingDot} />
          <div style={loadingDot2} />
          <div style={loadingDot3} />
          <div style={{ marginTop: 14, color: "#64748b", fontSize: 13 }}>
            Fetching on-chain data...
          </div>
        </div>
      )}

      {/* RESULTS */}
      {data && !loading && (
        <div>

          {/* WALLET + SCORE HEADER */}
          <div style={walletCard}>
            <div style={walletLeft}>
              {data.pfp && (
                <img src={data.pfp} alt="pfp" style={pfpImg} />
              )}
              <div>
                {data.display && (
                  <div style={displayName}>{data.display}</div>
                )}
                <div style={walletAddr}>
                  {short(wallet)}
                  <button onClick={copyWallet} style={copyBtn}>
                    {copied ? "✓" : "⎘"}
                  </button>
                </div>
                {data.username && (
                  <div style={fcName}>@{data.username}</div>
                )}
              </div>
            </div>
            {tier && (
              <div style={{ ...tierBadge, borderColor: tier.color, color: tier.color }}>
                <div style={{ fontSize: 22 }}>{tier.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                  {tier.label.toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {/* SCORE + RANK */}
          <div style={scoreRow}>
            <div style={scoreCard}>
              <div style={scoreLabel}>Score</div>
              <div style={{ ...scoreVal, color: tier?.color }}>
                {data.score?.toLocaleString()}
              </div>
            </div>
            <div style={scoreCard}>
              <div style={scoreLabel}>Leaderboard Rank</div>
              <div style={{ ...scoreVal, color: "#60a5fa" }}>
                #{data.rank?.toLocaleString() || "—"}
              </div>
            </div>
          </div>

          {/* STATS GRID */}
          <div style={sectionLabel}>📊 Transaction Stats</div>
          <div style={grid}>

            <div style={statCard}>
              <div style={statIcon}>📊</div>
              <div style={statVal}>{data.totalTxns?.toLocaleString()}</div>
              <div style={statName}>Total Transactions</div>
            </div>

            <div style={statCard}>
              <div style={statIcon}>💰</div>
              <div style={statVal}>{data.totalVolumeETH}</div>
              <div style={statName}>Transfer Volume (ETH)</div>
            </div>

            <div style={statCard}>
              <div style={statIcon}>⛽</div>
              <div style={statVal}>{data.totalGasETH}</div>
              <div style={statName}>Gas Spent (ETH)</div>
            </div>

            <div style={statCard}>
              <div style={statIcon}>📅</div>
              <div style={statVal}>{data.activeDays}</div>
              <div style={statName}>Active Days</div>
            </div>

          </div>

          {/* TRADING STATS */}
          <div style={sectionLabel}>🔁 Trading Stats</div>
          <div style={grid}>

            <div style={{ ...statCard, borderColor: "#1e3a5f" }}>
              <div style={statIcon}>🔁</div>
              <div style={{ ...statVal, color: "#60a5fa" }}>
                {data.swapCount?.toLocaleString() || data.swaps || 0}
              </div>
              <div style={statName}>Swaps</div>
            </div>

            <div style={{ ...statCard, borderColor: "#1e3a5f" }}>
              <div style={statIcon}>💎</div>
              <div style={{ ...statVal, color: "#60a5fa" }}>
                ${data.tradingVolumeUSD?.toLocaleString()}
              </div>
              <div style={statName}>Trading Volume (USD)</div>
            </div>

            <div style={{ ...statCard, borderColor: "#1e3a5f" }}>
              <div style={statIcon}>📅</div>
              <div style={{ ...statVal, color: "#60a5fa" }}>
                {data.tradingDays}
              </div>
              <div style={statName}>Trading Days</div>
            </div>

            <div style={{ ...statCard, borderColor: "#1e3a5f" }}>
              <div style={statIcon}>⛽</div>
              <div style={{ ...statVal, color: "#60a5fa" }}>
                {data.tradingGasETH}
              </div>
              <div style={statName}>Trading Gas (ETH)</div>
            </div>

          </div>

          {/* ACTIVITY BARS */}
          <div style={sectionLabel}>📈 Activity Overview</div>
          <div style={activityCard}>

            <ActivityBar
              label="Transaction Activity"
              value={Math.min(data.totalTxns / 500, 1)}
              color="#22c55e"
              display={`${data.totalTxns} txns`}
            />

            <ActivityBar
              label="Trading Frequency"
              value={Math.min((data.swapCount || data.swaps || 0) / 200, 1)}
              color="#60a5fa"
              display={`${data.swapCount || 0} swaps`}
            />

            <ActivityBar
              label="Active Days"
              value={Math.min(data.activeDays / 365, 1)}
              color="#a78bfa"
              display={`${data.activeDays} days`}
            />

            <ActivityBar
              label="Volume Power"
              value={Math.min(data.totalVolumeETH / 10, 1)}
              color="#fbbf24"
              display={`${data.totalVolumeETH} ETH`}
            />

          </div>

          {/* SHARE */}
          <button
            onClick={async () => {
              try {
                await sdk.actions.composeCast({
                  text: `🔍 Base Wallet Stats for ${short(wallet)}\n\n📊 Txns: ${data.totalTxns}\n💰 Volume: ${data.totalVolumeETH} ETH\n🔁 Swaps: ${data.swapCount}\n💎 Trading: $${data.tradingVolumeUSD?.toLocaleString()}\n🏆 Rank: #${data.rank} | Score: ${data.score}\n\nCheck yours free 👇`,
                  embeds: ["https://base-wallet-analyser.vercel.app/"],
                })
              } catch {}
            }}
            style={castBtn}
          >
            🟣 Share on Farcaster
          </button>

        </div>
      )}

      <div style={footer}>
        Built on Base · Free for everyone · No wallet connection needed
      </div>

    </main>
  )
}

/* ACTIVITY BAR COMPONENT */
function ActivityBar({
  label, value, color, display
}: {
  label: string, value: number, color: string, display: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "#64748b" }}>
        <span>{label}</span>
        <span style={{ color }}>{display}</span>
      </div>
      <div style={{ background: "#0f172a", borderRadius: 6, height: 8, overflow: "hidden" }}>
        <div style={{
          width: `${Math.max(value * 100, 2)}%`,
          height: "100%",
          background: color,
          borderRadius: 6,
          transition: "width 0.8s ease"
        }} />
      </div>
    </div>
  )
}

/* ─── STYLES ─── */

const wrap: CSSProperties = {
  padding: "16px 16px 32px",
  maxWidth: 680,
  margin: "auto",
  fontFamily: "'Inter', -apple-system, sans-serif",
  color: "#e2e8f0",
  background: "#050f1a",
  minHeight: "100vh",
}

const header: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "linear-gradient(135deg,#0a1628 0%,#0d1f3c 100%)",
  padding: "18px 20px",
  borderRadius: 16,
  marginBottom: 16,
  border: "1px solid #1e3a5f",
}

const logoRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
}

const logoIcon: CSSProperties = { fontSize: 32 }

const titleStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  margin: 0,
  color: "#60a5fa",
  letterSpacing: -0.5,
}

const subtitleStyle: CSSProperties = {
  fontSize: 11,
  color: "#475569",
  marginTop: 2,
}

const baseBadge: CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 1.5,
  color: "#2563eb",
  border: "1px solid #2563eb",
  borderRadius: 6,
  padding: "3px 7px",
}

const inputCard: CSSProperties = {
  background: "#0a1628",
  border: "1px solid #1e3a5f",
  borderRadius: 14,
  padding: "16px 16px 14px",
  marginBottom: 14,
}

const inputLabel: CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  marginBottom: 10,
  fontWeight: 500,
}

const inputRow: CSSProperties = {
  display: "flex",
  gap: 8,
}

const inputStyle: CSSProperties = {
  flex: 1,
  background: "#050f1a",
  border: "1px solid #1e3a5f",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#e2e8f0",
  fontSize: 13,
  fontFamily: "monospace",
  outline: "none",
}

const analyseBtn: CSSProperties = {
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  color: "#fff",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
}

const spinner: CSSProperties = {
  display: "inline-block",
  animation: "spin 1s linear infinite",
}

const errorStyle: CSSProperties = {
  color: "#f87171",
  fontSize: 12,
  marginTop: 8,
}

const hintStyle: CSSProperties = {
  color: "#334155",
  fontSize: 11,
  marginTop: 10,
  textAlign: "center" as const,
}

const loadingCard: CSSProperties = {
  textAlign: "center",
  padding: "40px 20px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
}

const dotBase: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#2563eb",
  margin: "0 4px",
  display: "inline-block",
}

const loadingDot: CSSProperties  = { ...dotBase }
const loadingDot2: CSSProperties = { ...dotBase, opacity: 0.6 }
const loadingDot3: CSSProperties = { ...dotBase, opacity: 0.3 }

const walletCard: CSSProperties = {
  background: "#0a1628",
  border: "1px solid #1e3a5f",
  borderRadius: 14,
  padding: "14px 16px",
  marginBottom: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
}

const walletLeft: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flex: 1,
  minWidth: 0,
}

const pfpImg: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  border: "2px solid #2563eb",
  flexShrink: 0,
}

const displayName: CSSProperties = {
  fontWeight: 600,
  fontSize: 15,
  color: "#e2e8f0",
}

const walletAddr: CSSProperties = {
  fontFamily: "monospace",
  fontSize: 13,
  color: "#60a5fa",
  display: "flex",
  alignItems: "center",
  gap: 6,
}

const copyBtn: CSSProperties = {
  background: "none",
  border: "none",
  color: "#475569",
  cursor: "pointer",
  fontSize: 14,
  padding: 0,
}

const fcName: CSSProperties = {
  fontSize: 11,
  color: "#8b5cf6",
  marginTop: 2,
}

const tierBadge: CSSProperties = {
  border: "1px solid",
  borderRadius: 10,
  padding: "8px 12px",
  textAlign: "center",
  flexShrink: 0,
}

const scoreRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 12,
}

const scoreCard: CSSProperties = {
  background: "#0a1628",
  border: "1px solid #1e3a5f",
  borderRadius: 12,
  padding: "12px 14px",
  textAlign: "center",
}

const scoreLabel: CSSProperties = {
  fontSize: 11,
  color: "#475569",
  marginBottom: 4,
}

const scoreVal: CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: "#22c55e",
}

const sectionLabel: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 8,
  marginTop: 4,
  textTransform: "uppercase",
  letterSpacing: 1,
}

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 14,
}

const statCard: CSSProperties = {
  background: "#0a1628",
  border: "1px solid #122030",
  borderRadius: 12,
  padding: "12px 14px",
  textAlign: "center",
}

const statIcon: CSSProperties = { fontSize: 20, marginBottom: 4 }

const statVal: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#22c55e",
  wordBreak: "break-all",
}

const statName: CSSProperties = {
  fontSize: 11,
  color: "#475569",
  marginTop: 3,
}

const activityCard: CSSProperties = {
  background: "#0a1628",
  border: "1px solid #1e3a5f",
  borderRadius: 14,
  padding: "16px 16px 8px",
  marginBottom: 14,
}

const castBtn: CSSProperties = {
  width: "100%",
  padding: "13px",
  background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
  border: "none",
  borderRadius: 12,
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  marginBottom: 20,
}

const footer: CSSProperties = {
  textAlign: "center",
  fontSize: 11,
  color: "#1e3a5f",
  marginTop: 8,
            }
      
