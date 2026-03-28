"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { supabase, isDemoMode } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


interface AddHoneyFormProps {
  onSuccess: () => void
  onClose?: () => void
}

export function AddHoneyForm({ onSuccess, onClose }: AddHoneyFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    product_name: "",
    honey_type: "Raw Honey",
    quantity: 0,
    unit: "kg",
    price: 0,
    batch_cost: 0,
    sku: "",
    packaging_type: "Glass Jar",
    packaging_size: "500g",
    source_hives: "",
    harvest_date: "",
    expiry_date: "",
    description: "",
    ready_for_sale: false,
  })

  const [apiaryData, setApiaryData] = useState({
    number_of_hives: 0,
    cost_per_hive: 0,
    purchase_date: "",
    apiary_construction_cost: 0,
    other_equipment_cost: 0,
  })

  const costPerUnit = formData.quantity > 0 ? formData.batch_cost / formData.quantity : 0
  const totalApiaryInvestment = (apiaryData.number_of_hives * apiaryData.cost_per_hive) + 
                                apiaryData.apiary_construction_cost + 
                                apiaryData.other_equipment_cost

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" || name === "price" || name === "batch_cost" ? Number(value) : value,
    }))
  }

  const handleApiaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setApiaryData((prev) => ({
      ...prev,
      [name]: name.includes("cost") || name === "number_of_hives" ? Number(value) : value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async () => {
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase and set up tables to enable adding honey products",
        variant: "destructive",
      })
      return
    }

    if (!formData.product_name || formData.quantity <= 0 || formData.price <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in product name, quantity, and price",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const finalFormData = { ...formData }
      if (!finalFormData.sku) {
        const prefix = "HON"
        const randomNum = Math.floor(1000 + Math.random() * 9000)
        finalFormData.sku = `${prefix}${randomNum}`
      }

      // Calculate production cost from tasks and apiary investment
      let totalProductionCost = totalApiaryInvestment;

      // If no apiary data provided, set minimal batch cost
      if (totalProductionCost === 0) {
        totalProductionCost = finalFormData.quantity * 50; // Default cost estimation
      }

      const calculatedCostPerUnit = finalFormData.quantity > 0 ? totalProductionCost / finalFormData.quantity : 0

      // Insert honey product into inventory
      const insertData = {
        plant_name: finalFormData.product_name.trim(),
        scientific_name: finalFormData.honey_type,
        category: "Organic Honey",
        quantity: Number(finalFormData.quantity),
        opening_quantity: Number(finalFormData.quantity),
        unit: finalFormData.unit,
        age: finalFormData.packaging_size,
        date_planted: finalFormData.harvest_date || null,
        status: finalFormData.ready_for_sale ? "Ready" : "Processing",
        price: Number(finalFormData.price),
        batch_cost: Number(totalProductionCost),
        cost_per_seedling: calculatedCostPerUnit,
        sku: finalFormData.sku,
        section: finalFormData.packaging_type,
        row: finalFormData.source_hives,
        source: "Apiary Production",
        item_type: "Honey",
        ready_for_sale: finalFormData.ready_for_sale,
        description: finalFormData.description || `Premium ${finalFormData.honey_type} - ${finalFormData.packaging_size}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("inventory").insert([insertData]).select()

      if (error) {
        console.error("Insert error:", error)
        throw error
      }

      // If apiary data is provided, insert into tasks table for tracking
      if (apiaryData.number_of_hives > 0) {
        const apiaryTaskData = {
          task_name: "Apiary Setup & Hive Investment",
          description: `Initial setup: ${apiaryData.number_of_hives} hives at ${apiaryData.cost_per_hive} each. Construction: ${apiaryData.apiary_construction_cost}. Equipment: ${apiaryData.other_equipment_cost}`,
          batch_sku: finalFormData.sku,
          task_date: apiaryData.purchase_date || new Date().toISOString().split('T')[0],
          total_cost: totalApiaryInvestment,
          status: "Completed",
          category: "Infrastructure",
        }

        await supabase.from("tasks").insert([apiaryTaskData] as any)
      }

      toast({
        title: "Success",
        description: `Honey product added successfully! Production cost per ${finalFormData.unit}: Ksh ${calculatedCostPerUnit.toFixed(2)}. ${finalFormData.ready_for_sale ? 'Listed on website.' : 'Not listed on website.'}`,
      })

      // Reset form
      setFormData({
        product_name: "",
        honey_type: "Raw Honey",
        quantity: 0,
        unit: "kg",
        price: 0,
        batch_cost: 0,
        sku: "",
        packaging_type: "Glass Jar",
        packaging_size: "500g",
        source_hives: "",
        harvest_date: "",
        expiry_date: "",
        description: "",
        ready_for_sale: false,
      })

      setApiaryData({
        number_of_hives: 0,
        cost_per_hive: 0,
        purchase_date: "",
        apiary_construction_cost: 0,
        other_equipment_cost: 0,
      })

      onSuccess()
      if (onClose) onClose()

    } catch (error: any) {
      console.error("Error adding honey product:", error)
      toast({
        title: "Error adding honey product",
        description: error.message || "Failed to add honey product to inventory",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isMobile = useIsMobile()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="ml-auto">Add New Product</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Honey Product</DialogTitle>
          <DialogDescription>Add a new honey product to your inventory</DialogDescription>
        </DialogHeader>
        <AddHoneyForm onSuccess={onSuccess} onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}

interface InventoryItem {
  sku: string
  name: string
  quantity: number
  unit: string
  price: number
  status: string
}

function BatchStatusManager() {
  const [showForm, setShowForm] = useState(false)
  const [inventory, setInventory] = useState<InventoryItem[]>([])

  // Fetch inventory data (replace with your actual fetch logic)
  // For demonstration, we'll use a mock array
  const mockInventory: InventoryItem[] = [
    { sku: "HON1234", name: "Wildflower Honey", quantity: 100, unit: "kg", price: 1500, status: "Ready" },
    { sku: "HON5678", name: "Acacia Honey", quantity: 75, unit: "kg", price: 1800, status: "Processing" },
    { sku: "HON9101", name: "Clover Honey", quantity: 120, unit: "kg", price: 1300, status: "Ready" },
    { sku: "HON1121", name: "Manuka Honey", quantity: 50, unit: "kg", price: 3000, status: "Processing" },
  ]

  // Simulate fetching data on mount
  useEffect(() => {
    setInventory(mockInventory)
  }, [])


  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Inventory Status</h1>
        <AddHoneyForm
          onSuccess={() => console.log("Form submitted successfully!")}
          onClose={() => setShowForm(false)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-3 px-4 border-b text-left">SKU</th>
              <th className="py-3 px-4 border-b text-left">Product Name</th>
              <th className="py-3 px-4 border-b text-left">Quantity</th>
              <th className="py-3 px-4 border-b text-left">Unit</th>
              <th className="py-3 px-4 border-b text-left">Price</th>
              <th className="py-3 px-4 border-b text-left">Status</th>
              <th className="py-3 px-4 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.sku} className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b">{item.sku}</td>
                <td className="py-3 px-4 border-b">{item.name}</td>
                <td className="py-3 px-4 border-b">{item.quantity}</td>
                <td className="py-3 px-4 border-b">{item.unit}</td>
                <td className="py-3 px-4 border-b">{item.price}</td>
                <td className="py-3 px-4 border-b">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    item.status === "Ready" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="py-3 px-4 border-b">
                  <Button variant="ghost" size="sm">View Details</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}