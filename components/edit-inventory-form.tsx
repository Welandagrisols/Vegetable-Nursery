"use client"

import type React from "react"

import { useState } from "react"
import { supabase, isDemoMode } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Upload, X, ImageIcon } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { uploadImageToSupabase, uploadImageAndLinkToInventory, deleteImageFromSupabase } from "@/lib/image-upload"
import { notificationService } from "@/lib/notification-service"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface EditInventoryFormProps {
  item: any
  onSuccess: () => void
  onCancel?: () => void
}

export function EditInventoryForm({ item, onSuccess, onCancel }: EditInventoryFormProps) {
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const { toast } = useToast()

  const isConsumable =
    (item.category && item.category.startsWith("Consumable:")) ||
    (item.scientific_name && item.scientific_name.startsWith("[Consumable]"))

  // Mock handleInputChange and setFormData for demonstration purposes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const [formData, setFormData] = useState({
    plant_name: item.plant_name || "",
    scientific_name: item.scientific_name || "",
    category: item.category || "",
    quantity: item.quantity || 0,
    age: item.age || "",
    date_planted: item.date_planted ? new Date(item.date_planted).toISOString().split("T")[0] : "",
    status: item.status || (isConsumable ? "Available" : "Healthy"),
    price: item.price || 0,
    batch_cost: item.batch_cost || 0,
    sku: item.sku || "",
    section: item.section || "",
    row: item.row || "",
    source: item.source || "",
    description: item.description || "",
    image_url: item.image_url || "",
    ready_for_sale: item.ready_for_sale || false,
    // These fields are from the changes, but not present in the original item object, so they are initialized as empty
    unit: "",
    notes: "",
  })


  // Calculate cost per seedling for plants (not consumables)
  const costPerSeedling = !isConsumable && formData.quantity > 0 ? formData.batch_cost / formData.quantity : 0

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const autoFillFromExisting = async (plantName: string, scientificName: string) => {
    // Fetch data from Supabase based on plantName or scientificName
    let query = supabase.from("inventory").select("description, image_url").limit(1)

    if (plantName) {
      query = query.ilike("plant_name", plantName)
    } else if (scientificName) {
      query = query.ilike("scientific_name", scientificName)
    } else {
      return // Don't run query if both are empty
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching similar entries:", error)
      toast({
        title: "Error auto-filling data",
        description: error.message,
        variant: "destructive",
      })
      return
    }

    if (data && data.length > 0) {
      const { description, image_url } = data[0]
      setFormData((prev) => ({
        ...prev,
        description: description || "",
        image_url: image_url || "",
      }))
    } else {
      // Reset description and image URL if no matching entries are found
      setFormData((prev) => ({
        ...prev,
        description: "",
        image_url: "",
      }))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        })
        return
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        })
        return
      }

      setImageFile(file)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setFormData((prev) => ({ ...prev, image_url: "" }))
  }

  const handleImageUpload = async (file: File): Promise<string | null> => {
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase to enable image uploads",
        variant: "destructive",
      })
      return null
    }

    try {
      setUploadingImage(true)

      // Create unique filename with timestamp and random string
      const fileExt = file.name.split(".").pop()?.toLowerCase() || 'jpg'
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 8)
      const fileName = `${timestamp}-${randomString}.${fileExt}`
      const filePath = `plants/${fileName}`

      console.log('Uploading image to:', filePath)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("plant-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        })

      if (error) {
        console.error("Upload error:", error)
        throw error
      }

      console.log('Upload successful:', data)

      // Get public URL using the uploaded file path
      const { data: { publicUrl } } = supabase.storage
        .from("plant-images")
        .getPublicUrl(filePath)

      console.log('Generated public URL:', publicUrl)

      return publicUrl
    } catch (error: any) {
      console.error("Error uploading image:", error)
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      })
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase and set up tables to enable editing items",
        variant: "destructive",
      })
      return
    }

    // Validate required fields
    if (!formData.plant_name || !formData.category || formData.quantity < 0 || formData.price < 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields with valid values",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      // Calculate cost per seedling for plants
      const openingQuantity = Number(item.opening_quantity || formData.quantity || 0)
      const calculatedCostPerSeedling =
        !isConsumable && openingQuantity > 0 ? formData.batch_cost / openingQuantity : item.cost_per_seedling || 0

      // Upload image if selected and link it to the inventory item
      let imageUrl = formData.image_url
      if (imageFile) {
        const { publicUrl, error } = await uploadImageAndLinkToInventory(imageFile, item.id) as any;
        if (error) {
          console.error("Image upload and linking error:", error);
          toast({
            title: "Image Upload Failed",
            description: error.message || "Failed to upload and link image.",
            variant: "destructive",
          });
          return;
        }
        if (publicUrl) {
          imageUrl = publicUrl;
        } else {
          // If uploadImageAndLinkToInventory fails to return a URL but no error, it might be a soft failure or a case where the image wasn't needed.
          // However, for safety, we'll treat it as a failure to upload.
          toast({
            title: "Image Upload Failed",
            description: "Could not get image URL after upload.",
            variant: "destructive",
          });
          return;
        }
      } else if (formData.image_url && !item.image_url) {
        // If an image URL exists in formData but not in item.image_url (meaning it was likely removed and not replaced)
        // and no new file was selected, ensure we don't keep a stale URL if it's supposed to be empty.
        // However, the logic here should really be about handling deletion if that's a feature.
        // For now, we assume if imageFile is null, and formData.image_url matches item.image_url, it's fine.
        // If formData.image_url is empty and item.image_url was not, this implies a deliberate removal which needs explicit handling if required.
      }


      const updateData = {
        plant_name: formData.plant_name.trim(),
        scientific_name: formData.scientific_name?.trim() || null,
        category: formData.category,
        quantity: Number(formData.quantity),
        age: formData.age?.trim() || null,
        date_planted: formData.date_planted || null,
        status: formData.status,
        price: Number(formData.price),
        batch_cost: Number(formData.batch_cost),
        cost_per_seedling: calculatedCostPerSeedling,
        sku: formData.sku,
        section: formData.section?.trim() || null,
        row: formData.row?.trim() || null,
        source: formData.source?.trim() || null,
        description: formData.description?.trim() || null,
        image_url: imageUrl,
        ready_for_sale: formData.ready_for_sale,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("inventory").update(updateData).eq("id", item.id).select()

      if (error) {
        console.error("Update error:", error)
        throw error
      }

      toast({
        title: "Success",
        description: isConsumable
          ? "Consumable updated successfully"
          : `Plant updated successfully. Cost per seedling: Ksh ${calculatedCostPerSeedling.toFixed(2)}`,
      })

      // Send notification for inventory update
      await notificationService.notifyInventoryUpdate(data[0], 'updated')

      onSuccess()
    } catch (error: any) {
      console.error("Error updating item:", error)
      toast({
        title: "Error updating item",
        description: error.message || "Failed to update item",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[70vh] max-h-[600px]">
      {/* Scrollable form content */}
      <div className="flex-1 overflow-y-auto pr-2">
        <form id="edit-inventory-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="plant_name">Plant Name *</Label>
                <Input
                  id="plant_name"
                  name="plant_name"
                  value={formData.plant_name}
                  onChange={handleInputChange}
                  required
                  disabled={isDemoMode}
                  placeholder="e.g., Tomato Seedlings"
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                  disabled={isDemoMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vegetables">Vegetables</SelectItem>
                    <SelectItem value="Fruits">Fruits</SelectItem>
                    <SelectItem value="Herbs">Herbs</SelectItem>
                    <SelectItem value="Flowers">Flowers</SelectItem>
                    <SelectItem value="Trees">Trees</SelectItem>
                    <SelectItem value="Shrubs">Shrubs</SelectItem>
                    <SelectItem value="Grasses">Grasses</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                  min="0"
                  disabled={isDemoMode}
                  placeholder="Number of seedlings"
                />
              </div>

              <div>
                <Label htmlFor="price">Selling Price (Ksh) *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  disabled={isDemoMode}
                  placeholder="Price per unit"
                />
              </div>

              <div>
                <Label htmlFor="age">Age/Size</Label>
                <Input
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  disabled={isDemoMode}
                  placeholder="e.g., 3 months, 12 inches"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                  disabled={isDemoMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Low Stock">Low Stock</SelectItem>
                    <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  disabled={isDemoMode}
                  placeholder="Stock Keeping Unit"
                />
              </div>

              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  disabled={isDemoMode}
                  placeholder="e.g., per seedling, per pot"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  disabled={isDemoMode}
                  placeholder="Additional notes about this plant"
                  rows={3}
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label>Image</Label>
                <div className="flex items-center gap-4">
                  {imagePreview || formData.image_url ? (
                    <div className="relative w-24 h-24 rounded-md overflow-hidden border border-border">
                      <img
                        src={imagePreview || formData.image_url}
                        alt="Image Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white"
                        disabled={uploadingImage || loading}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-md border border-border flex items-center justify-center bg-secondary/50">
                      <ImageIcon size={32} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("imageUploadInput")?.click()}
                      disabled={uploadingImage || loading}
                    >
                      {uploadingImage ? "Uploading..." : "Choose Image"}
                    </Button>
                    <input
                      id="imageUploadInput"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={uploadingImage || loading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Sticky action buttons */}
      <div className="border-t border-border bg-white pt-4 mt-4">
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            form="edit-inventory-form"
            className="bg-primary hover:bg-primary/90 text-white"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Item"}
          </Button>
        </div>
      </div>
    </div>
  )
}