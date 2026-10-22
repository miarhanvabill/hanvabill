"use client"

import { useState, useRef, useCallback } from "react"
import { getCustomerByPhone, searchCustomers, type Customer } from "@/app/actions/customers"

interface UseCustomerLookupOptions {
  onCustomerFound?: (customer: Customer) => void
  onCustomerNotFound?: (phone: string) => void
  onClear?: () => void
}

export function useCustomerLookup({
  onCustomerFound,
  onCustomerNotFound,
  onClear,
}: UseCustomerLookupOptions = {}) {
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null)
  const [suggestions, setSuggestions] = useState<Customer[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [lookupStatus, setLookupStatus] = useState<"idle" | "searching" | "found" | "not_found">("idle")
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false)
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const exactLookupRef = useRef<NodeJS.Timeout | null>(null)
  const nameSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Direct fetch customer by exact or near-exact phone
  const fetchCustomerByPhone = useCallback(
    async (rawPhone: string) => {
      const cleanPhone = (rawPhone || "").trim()
      const digits = cleanPhone.replace(/\D/g, "")

      if (!cleanPhone || (digits.length < 5 && cleanPhone.length < 5)) {
        setMatchedCustomer(null)
        setLookupStatus("idle")
        setSuggestions([])
        return null
      }

      setIsSearching(true)
      setLookupStatus("searching")

      try {
        let customer: Customer | null = null
        try {
          customer = await getCustomerByPhone(cleanPhone)
        } catch {
          // Fallback to API route
          const res = await fetch(`/api/customers?phone=${encodeURIComponent(cleanPhone)}`)
          const json = await res.json()
          if (json.success && json.customer) {
            customer = json.customer
          }
        }

        if (customer) {
          setMatchedCustomer(customer)
          setLookupStatus("found")
          setShowPhoneSuggestions(false)
          setShowNameSuggestions(false)
          onCustomerFound?.(customer)
          return customer
        } else {
          setMatchedCustomer(null)
          setLookupStatus("not_found")
          onCustomerNotFound?.(cleanPhone)
          return null
        }
      } catch (err) {
        console.error("Error in fetchCustomerByPhone:", err)
        setMatchedCustomer(null)
        setLookupStatus("idle")
        return null
      } finally {
        setIsSearching(false)
      }
    },
    [onCustomerFound, onCustomerNotFound],
  )

  // Handle phone input change
  const handlePhoneChange = useCallback(
    (value: string) => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      if (exactLookupRef.current) clearTimeout(exactLookupRef.current)

      const trimmed = (value || "").trim()
      const digits = trimmed.replace(/\D/g, "")

      // If phone cleared
      if (!trimmed) {
        setMatchedCustomer(null)
        setSuggestions([])
        setLookupStatus("idle")
        setShowPhoneSuggestions(false)
        onClear?.()
        return
      }

      // If user typed 10 digits (or more), trigger exact lookup immediately
      if (digits.length >= 10) {
        setIsSearching(true)
        exactLookupRef.current = setTimeout(() => {
          fetchCustomerByPhone(trimmed)
        }, 150)
        return
      }

      // If user typed 3 to 9 characters, show search suggestions
      if (digits.length >= 3 || trimmed.length >= 3) {
        searchTimeoutRef.current = setTimeout(async () => {
          setIsSearching(true)
          try {
            let results: Customer[] = []
            try {
              results = await searchCustomers(trimmed)
            } catch {
              const res = await fetch(`/api/customers?search=${encodeURIComponent(trimmed)}`)
              const json = await res.json()
              if (json.success && Array.isArray(json.customers)) {
                results = json.customers
              }
            }

            setSuggestions(results)
            setShowPhoneSuggestions(results.length > 0)

            // If exactly one match and user typed at least 7 digits
            if (results.length === 1 && digits.length >= 7) {
              const single = results[0]
              const cDigits = (single.phone_number || "").replace(/\D/g, "")
              if (cDigits.endsWith(digits) || digits.endsWith(cDigits)) {
                setMatchedCustomer(single)
                setLookupStatus("found")
                setShowPhoneSuggestions(false)
                onCustomerFound?.(single)
              }
            }
          } catch (e) {
            console.error("Search customers error:", e)
          } finally {
            setIsSearching(false)
          }
        }, 250)
      } else {
        setSuggestions([])
        setShowPhoneSuggestions(false)
        setLookupStatus("idle")
      }
    },
    [fetchCustomerByPhone, onClear, onCustomerFound],
  )

  // Handle name input change for quick suggestions
  const handleNameChange = useCallback(
    (value: string) => {
      if (nameSearchTimeoutRef.current) clearTimeout(nameSearchTimeoutRef.current)

      const trimmed = (value || "").trim()
      if (trimmed.length < 2) {
        setShowNameSuggestions(false)
        return
      }

      nameSearchTimeoutRef.current = setTimeout(async () => {
        try {
          let results: Customer[] = []
          try {
            results = await searchCustomers(trimmed)
          } catch {
            const res = await fetch(`/api/customers?search=${encodeURIComponent(trimmed)}`)
            const json = await res.json()
            if (json.success && Array.isArray(json.customers)) {
              results = json.customers
            }
          }
          setSuggestions(results)
          setShowNameSuggestions(results.length > 0)
        } catch (e) {
          console.error("Name search error:", e)
        }
      }, 300)
    },
    [],
  )

  // Handle onBlur on phone field
  const handlePhoneBlur = useCallback(
    (currentValue: string) => {
      const digits = (currentValue || "").replace(/\D/g, "")
      if (digits.length >= 7 && lookupStatus !== "found") {
        fetchCustomerByPhone(currentValue)
      }
      setTimeout(() => {
        setShowPhoneSuggestions(false)
      }, 250)
    },
    [fetchCustomerByPhone, lookupStatus],
  )

  const handleNameBlur = useCallback(() => {
    setTimeout(() => {
      setShowNameSuggestions(false)
    }, 250)
  }, [])

  // Select customer from dropdown
  const selectCustomer = useCallback(
    (customer: Customer) => {
      setMatchedCustomer(customer)
      setLookupStatus("found")
      setShowPhoneSuggestions(false)
      setShowNameSuggestions(false)
      onCustomerFound?.(customer)
    },
    [onCustomerFound],
  )

  // Clear customer
  const clearCustomer = useCallback(() => {
    setMatchedCustomer(null)
    setLookupStatus("idle")
    setSuggestions([])
    setShowPhoneSuggestions(false)
    setShowNameSuggestions(false)
    onClear?.()
  }, [onClear])

  return {
    matchedCustomer,
    suggestions,
    isSearching,
    lookupStatus,
    showPhoneSuggestions,
    setShowPhoneSuggestions,
    showNameSuggestions,
    setShowNameSuggestions,
    handlePhoneChange,
    handleNameChange,
    handlePhoneBlur,
    handleNameBlur,
    fetchCustomerByPhone,
    selectCustomer,
    clearCustomer,
  }
}
