// Welcome screen with log in / create account.
import { iv, val } from './dc.js';

export default function Welcome({ v }) {
  return (
    <>
      {" "}
      <div style={{ position: "fixed", inset: "0", zIndex: "60", background: "#f2ede2", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", boxSizing: "border-box", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "28px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "4px", background: "#2f6f5e" }} />
              <div style={{ width: "28px", height: "2px", background: "#2f6f5e", opacity: ".5" }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "4px", border: "2px solid #2f6f5e", boxSizing: "border-box" }} />
            </div>
            <div style={{ fontFamily: "Karla,sans-serif", fontWeight: "600", fontSize: "40px", lineHeight: "1.05", color: "#2a2724", letterSpacing: "-.01em" }}>
              Visual Notebook
            </div>
            <div style={{ fontSize: "15px", lineHeight: "1.5", color: "#5e6072", textWrap: "pretty" }}>
              {iv(v.welcomeIntro)}
            </div>
          </div>
          <div style={{ background: "#fcfcfd", border: "1px solid #dcdee6", borderRadius: "16px", padding: "22px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 10px 30px rgba(42,39,36,.08)" }}>
            <input value={val(v.loginEmail)} onChange={v.onLoginEmail} placeholder="Email" type="email" autoComplete="email" style={{ border: "1px solid #dcdee6", background: "#fffefb", borderRadius: "10px", padding: "0 14px", height: "46px", fontSize: "16px", color: "#2a2724", width: "100%", boxSizing: "border-box" }} />
            <input value={val(v.loginPw)} onChange={v.onLoginPw} onKeyDown={v.onLoginKey} placeholder="Password" type="password" autoComplete={v.pwAutocomplete} style={{ border: "1px solid #dcdee6", background: "#fffefb", borderRadius: "10px", padding: "0 14px", height: "46px", fontSize: "16px", color: "#2a2724", width: "100%", boxSizing: "border-box" }} />
            <button onClick={v.loginPrimary} style={{ border: "none", background: "#2f6f5e", color: "#fcfcfd", fontSize: "15px", fontWeight: "600", height: "46px", borderRadius: "10px", cursor: "pointer", marginTop: "4px" }}>
              {iv(v.loginBtn)}
            </button>
            {v.hasLoginMsg ? (
              <div style={{ fontSize: "13px", color: "#5e6072", lineHeight: "1.5" }}>
                {iv(v.loginMsg)}
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", paddingTop: "4px" }}>
              <span style={{ color: "#6a6c7e", fontSize: "13px", padding: "6px 0" }}>
                Accounts are by invitation only
              </span>
              <button onClick={v.forgotPw} style={{ border: "none", background: "transparent", color: "#6a6c7e", fontSize: "13px", padding: "6px 0", cursor: "pointer" }}>
                Forgot password?
              </button>
            </div>
          </div>
          <button onClick={v.skipWelcome} style={{ alignSelf: "center", border: "none", background: "transparent", color: "#5e6072", fontSize: "14px", padding: "10px 14px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>
            Continue without an account
          </button>
        </div>
      </div>
      {" "}
    </>
  );
}
