"use client"

import type React from "react"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { isDemoMode } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


interface AddCustomerFormProps {
  onSuccess: () => void
}

export function AddCustomerForm({ onSuccess }: AddCustomerFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log("Customer form handleSubmit called with data:", formData)

    if (isDemoMode) {
      console.log("In demo mode, cannot add customer")
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase and set up tables to enable adding customers",
        variant: "destructive",
      })
      return
    }

    console.log("User state:", user)
    if (!user) {
      console.log("No user found, showing auth required message")
      toast({
        title: "Authentication Required",
        description: "You must be logged in to add customers",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      console.log("Inserting customer...")
      const nurseryId =
        (user.app_metadata?.nursery_id as string | undefined) ||
        (user.user_metadata?.nursery_id as string | undefined)

      if (!nurseryId) {
        throw new Error("Your account is missing nursery access. Please contact support.")
      }

      const { data, error } = await supabase.from("customers").insert({
        name: formData.name,
        contact: formData.contact,
        email: formData.email || null,
        nursery_id: nurseryId,
        user_id: user.id,
      }).select().single()

      if (error) {
        console.error("Customer insert error:", error)
        throw error
      }

      console.log("Customer added successfully:", data)

      toast({
        title: "Success",
        description: "Customer added successfully",
      })

      // Reset form data
      setFormData({
        name: "",
        contact: "",
        email: "",
      })

      onSuccess()
    } catch (error: any) {
      console.error("Error adding customer:", error)
      toast({
        title: "Error adding customer",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[50vh] max-h-[400px]">
      {/* Scrollable form content */}
      <div className="flex-1 overflow-y-auto pr-2">
        <form id="add-customer-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name *</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact Number *</Label>
            <Input id="contact" name="contact" value={formData.contact} onChange={handleChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
          </div>
        </form>
      </div>

      {/* Sticky action buttons */}
      <div className="border-t border-border bg-white pt-4 mt-4">
        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            form="add-customer-form"
            className="bg-accent hover:bg-accent/90 text-white"
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Customer"}
          </Button>
        </div>
      </div>
    </div>
  )
}