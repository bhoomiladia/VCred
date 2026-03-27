"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface UserData {
  name: string
  email: string
  role: 'student' | 'institution' | 'hq' | null
  subRole?: 'admin' | 'worker'
  institutionName?: string
  isVerified?: boolean
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED'
  workerStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED'
  institutionId?: string
  walletAddress?: string
}

interface UserContextType {
  user: UserData | null
  isLoaded: boolean
  setUser: (user: UserData | null) => void
  updateUser: (data: Partial<UserData>) => void
  logout: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserData | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('vcred_user')
    if (storedUser) {
      try {
        setUserState(JSON.parse(storedUser))
      } catch (e) {
        console.error("Failed to parse stored user data", e)
      }
    }
    setIsLoaded(true)
  }, [])

  const setUser = (newUser: UserData | null) => {
    setUserState(newUser)
    if (newUser) {
      localStorage.setItem('vcred_user', JSON.stringify(newUser))
    } else {
      localStorage.removeItem('vcred_user')
    }
  }

  const updateUser = (data: Partial<UserData>) => {
    setUserState(prev => {
      const newUser = prev ? { ...prev, ...data } : { 
        name: data.name || 'User', 
        email: data.email || '', 
        role: data.role || 'student',
        ...data 
      } as UserData
      
      localStorage.setItem('vcred_user', JSON.stringify(newUser))
      return newUser
    })
  }

  const logout = () => {
    setUserState(null)
    localStorage.removeItem('vcred_user')
  }

  return (
    <UserContext.Provider value={{ user, isLoaded, setUser, updateUser, logout }}>
      {/* We don't render children until we've checked local storage to prevent hydration mismatches */}
      {isLoaded ? children : null}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
