"use client"

import type React from "react"
import { useState } from "react"
import { supabase, isDemoMode } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { uploadImageToSupabase, uploadImageAndLinkToInventory } from "@/lib/image-upload"
import { notificationService } from "@/lib/notification-service"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface AddInventoryFormProps {
  onSuccess: () => void
  onClose?: () => void
}

export function AddInventoryForm({ onSuccess, onClose }: AddInventoryFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    plant_name: "",
    scientific_name: "",
    category: "",
    quantity: 0,
    age: "",
    date_planted: "",
    status: "Healthy",
    price: 0,
    batch_cost: 0,
    sku: "",
    section: "",
    row: "",
    source: "",
  })

  const costPerSeedling = formData.quantity > 0 ? formData.batch_cost / formData.quantity : 0

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" || name === "price" || name === "batch_cost" ? Number(value) : value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async () => {
    console.log("handleSubmit called with data:", formData)

    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase and set up tables to enable adding plants",
        variant: "destructive",
      })
      return
    }

    if (!formData.plant_name || !formData.category || formData.quantity <= 0 || formData.price <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields with valid values",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      console.log("Starting plant insertion...")

      const finalFormData = { ...formData }
      if (!finalFormData.sku) {
        const prefix = finalFormData.category.substring(0, 3).toUpperCase()
        const randomNum = Math.floor(1000 + Math.random() * 9000)
        finalFormData.sku = `${prefix}${randomNum}`
      }

      const openingQuantity = Number(finalFormData.quantity)
      const calculatedCostPerSeedling = openingQuantity > 0 ? finalFormData.batch_cost / openingQuantity : 0

      const insertData = {
        plant_name: finalFormData.plant_name.trim(),
        scientific_name: finalFormData.scientific_name?.trim() || null,
        category: finalFormData.category,
        quantity: Number(finalFormData.quantity),
        opening_quantity: openingQuantity,
        age: finalFormData.age?.trim() || null,
        date_planted: finalFormData.date_planted || null,
        status: finalFormData.status,
        price: Number(finalFormData.price),
        batch_cost: Number(finalFormData.batch_cost),
        cost_per_seedling: calculatedCostPerSeedling,
        sku: finalFormData.sku,
        section: finalFormData.section?.trim() || null,
        row: finalFormData.row?.trim() || null,
        source: finalFormData.source?.trim() || null,
        item_type: "Plant",
        ready_for_sale: false,
        description: null,
        image_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log("Inserting plant data:", insertData)

      const { data, error } = await supabase
        .from("inventory")
        .insert([insertData])
        .select()

      if (error) {
        console.error("Insert error:", error)
        throw error
      }

      console.log("Plant added successfully:", data)

      toast({
        title: "Success",
        description: `New plant batch added to inventory. Cost per seedling: Ksh ${calculatedCostPerSeedling.toFixed(2)}`,
      })

      // Send notification for inventory addition
      await notificationService.notifyInventoryUpdate(data[0], 'added')

      // Reset form
      setFormData({
        plant_name: "",
        scientific_name: "",
        category: "",
        quantity: 0,
        age: "",
        date_planted: "",
        status: "Healthy",
        price: 0,
        batch_cost: 0,
        sku: "",
        section: "",
        row: "",
        source: "",
      })

      console.log("Calling onSuccess...")
      onSuccess()

      if (onClose) {
        console.log("Calling onClose...")
        onClose()
      }
    } catch (error: any) {
      console.error("Error adding plant:", error)
      toast({
        title: "Error adding plant",
        description: error.message || "Failed to add plant to inventory",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isMobile = useIsMobile()

  return (
    <div className="flex flex-col max-h-[80vh]">
      <div className="flex-1 overflow-y-auto px-1">
        <div className="space-y-4">
          <div className={`grid grid-cols-1 ${isMobile ? "gap-6" : "md:grid-cols-2 gap-4"}`}>
            <div className="space-y-2">
              <Label htmlFor="plant_name">Plant Name *</Label>
              <Input id="plant_name" name="plant_name" value={formData.plant_name} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scientific_name">Scientific Name</Label>
              <Input
                id="scientific_name"
                name="scientific_name"
                value={formData.scientific_name}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleSelectChange("category", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Indigenous Trees">Indigenous Trees</SelectItem>
                  <SelectItem value="Ornamentals">Ornamentals</SelectItem>
                  <SelectItem value="Fruit Trees">Fruit Trees</SelectItem>
                  <SelectItem value="Flowers">Flowers</SelectItem>
                  <SelectItem value="Herbs">Herbs</SelectItem>
                  <SelectItem value="Vegetables">Vegetables</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (Number of Seedlings) *</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_cost">Total Batch Cost (Ksh) *</Label>
              <Input
                id="batch_cost"
                name="batch_cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.batch_cost}
                onChange={handleChange}
                required
                placeholder="Total cost for this entire batch"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Selling Price per Seedling (Ksh) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                required
                placeholder="Price you'll sell each seedling for"
              />
            </div>

            {formData.quantity > 0 && formData.batch_cost > 0 && (
              <div className="space-y-2 md:col-span-2">
                <div className="p-3 bg-muted rounded-md border">
                  <div className="text-sm font-medium text-muted-foreground">Calculated Cost per Seedling:</div>
                  <div className="text-lg font-bold text-primary">Ksh {costPerSeedling.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    Batch Cost: Ksh {formData.batch_cost.toLocaleString()} ÷ {formData.quantity} seedlings
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input id="age" name="age" placeholder="e.g. 6 months" value={formData.age} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_planted">Date Planted</Label>
              <Input
                id="date_planted"
                name="date_planted"
                type="date"
                value={formData.date_planted}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Healthy">Healthy</SelectItem>
                  <SelectItem value="Attention">Needs Attention</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU (Auto-generated if empty)</Label>
              <Input id="sku" name="sku" value={formData.sku} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <Input
                id="section"
                name="section"
                placeholder="e.g. A"
                value={formData.section}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="row">Row</Label>
              <Input id="row" name="row" placeholder="e.g. 3" value={formData.row} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                name="source"
                placeholder="e.g. Local nursery"
                value={formData.source}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-white pt-4 mt-4 flex-shrink-0">
        <div className={`flex ${isMobile ? "flex-col gap-3" : "justify-end space-x-2"}`}>
          {onClose && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                console.log("Cancel button clicked")
                onClose()
              }}
              disabled={loading}
              className={isMobile ? "mobile-touch-target w-full" : ""}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={() => {
              console.log("Add Item button clicked")
              handleSubmit()
            }}
            disabled={loading}
            className={`bg-primary hover:bg-primary/90 text-white ${isMobile ? "mobile-touch-target w-full" : ""}`}
          >
            {loading ? "Adding..." : "Add Item"}
          </Button>
        </div>
      </div>
    </div>
  )
}