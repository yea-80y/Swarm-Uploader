// === context/SignerContext.js ===
import { createContext, useState, useContext } from 'react'

const SignerContext = createContext()

export function SignerProvider({ children }) {
  const [signerPrivateKey, setSignerPrivateKey] = useState(null)

  return (
    <SignerContext.Provider value={{ signerPrivateKey, setSignerPrivateKey }}>
      {children}
    </SignerContext.Provider>
  )
}

export function useSigner() {
  return useContext(SignerContext)
}
