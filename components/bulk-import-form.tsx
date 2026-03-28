"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { supabase, isDemoMode } from "@/lib/supabase"
import { Upload, FileText, CheckCircle, Play } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface BulkImportFormProps {
  onSuccess?: () => void
}

interface ParsedPlant {
  plant_name: string
  scientific_name?: string
  category: string
  quantity: number
  price: number
  batch_cost?: number
  age?: string
  status: string
  sku?: string
  description?: string
  is_current_plant: boolean
}

export function BulkImportForm({ onSuccess }: BulkImportFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedPlant[]>([])
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState<"idle" | "parsing" | "importing" | "complete">("idle")
  const { toast } = useToast()

  // Generate unique SKU
  const generateUniqueSKU = (plantName: string, index: number): string => {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    const prefix = plantName
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, "X")
    return `${prefix}${timestamp}${index}${random}`
  }

  // Pre-defined plant data - these will be marked as CURRENT plants (most recent 9)
  const predefinedPlants: ParsedPlant[] = [
    {
      plant_name: "Nile Tulip",
      scientific_name: "Markhamia lutea",
      category: "Indigenous Trees",
      quantity: 100,
      price: 45,
      batch_cost: 2500,
      status: "Healthy",
      is_current_plant: true, // Current nursery stock
      description:
        "A fast-growing tree with trumpet-shaped yellow flowers; ideal for agroforestry and shade. Provides quick canopy cover, reduces soil erosion, and supports pollinators.",
    },
    {
      plant_name: "Waterberry",
      scientific_name: "Syzygium cordatum",
      category: "Indigenous Trees",
      quantity: 100,
      price: 45,
      batch_cost: 2500,
      status: "Healthy",
      is_current_plant: true,
      description:
        "A water-loving tree with pink flowers and edible purple fruits; attracts birds and bees. Stabilizes riparian zones, supports birdlife, and enhances local water cycles.",
    },
    {
      plant_name: "Wild Plum",
      scientific_name: "Syzygium guineense",
      category: "Indigenous Trees",
      quantity: 100,
      price: 45,
      batch_cost: 2500,
      status: "Healthy",
      is_current_plant: true,
      description:
        "Indigenous tree with dense foliage and small edible fruits; used for shade and erosion control. Provides food for wildlife and helps prevent land degradation in upland areas.",
    },
    {
      plant_name: "African Cherry",
      scientific_name: "Prunus africana",
      category: "Indigenous Trees",
      quantity: 100,
      price: 45,
      batch_cost: 2500,
      status: "Healthy",
      is_current_plant: true,
      description:
        "An endangered medicinal tree valued for its bark; supports biodiversity in highland areas. Crucial for medicinal research, provides habitat, and promotes forest health.",
    },
    {
      plant_name: "Pepper Bark Tree",
      scientific_name: "Warburgia ugandensis",
      category: "Indigenous Trees",
      quantity: 100,
      price: 45,
      batch_cost: 2500,
      status: "Healthy",
      is_current_plant: true,
      description:
        "A highly medicinal tree with peppery bark used in traditional medicine; drought-tolerant. Helps in maintaining traditional knowledge, supports biodiversity, and stabilizes degraded lands.",
    },
    {
      plant_name: "African Olive",
      scientific_name: "Olea africana",
      category: "Indigenous Trees",
      quantity: 100,
      price: 45,
      batch_cost: 2500,
      status: "Healthy",
      is_current_plant: true,
      description:
        "A hardy tree with strong timber and cultural importance; excellent for dryland restoration. Supports carbon sequestration, provides nesting for birds, and prevents desertification.",
    },
    {
      plant_name: "Meru Oak",
      scientific_name: "Vitex keniensis",
      category: "Indigenous Trees",
      quantity: 100,
      price: 45,
      batch_cost: 2500,
      status: "Healthy",
      is_current_plant: true,
      description:
        "A slow-growing but highly valued timber species; endangered and native to Kenya's highlands. Promotes indigenous forest conservation and contributes to biodiversity corridors.",
    },
    {
      plant_name: "Yellowwood",
      scientific_name: "Podocarpus latifolius",
      category: "Indigenous Trees",
      quantity: 100,
      price: 45,
      batch_cost: 2500,
      status: "Healthy",
      is_current_plant: true,
      description:
        "Evergreen indigenous conifer with wide leaves; ideal for reforestation and water catchment. Improves forest structure, protects water catchments, and stores carbon.",
    },
    {
      plant_name: "Giant Bamboo",
      scientific_name: "Bambusa bambos",
      category: "Indigenous Trees",
      quantity: 100,
      price: 45,
      batch_cost: 2500,
      status: "Healthy",
      is_current_plant: true,
      description:
        "Fast-growing grass species used for riverbank stabilization, fencing, and construction. Prevents erosion, purifies water, and provides sustainable building material.",
    },
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setParsedData([])
      setImportStatus("idle")
    }
  }

  const handleLoadPredefinedData = () => {
    setParsedData(predefinedPlants)
    setImportStatus("idle")
    toast({
      title: "Current nursery plants loaded",
      description: `Loaded ${predefinedPlants.length} plants currently in your nursery`,
    })
  }

  const handleBulkImport = async () => {
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Connect to Supabase to enable bulk import",
        variant: "destructive",
      })
      return
    }

    if (parsedData.length === 0) {
      toast({
        title: "No data to import",
        description: "Please load the plant data first",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setImportStatus("importing")
    setImportProgress(0)

    try {
      // Get existing inventory count to determine which plants should be "current"
      const { data: existingInventory } = await supabase
        .from("inventory")
        .select("id")
        .order("created_at", { ascending: false })
      const existingCount = existingInventory?.length || 0

      // Get existing SKUs to avoid duplicates
      const { data: existingSKUs } = await supabase.from("inventory").select("sku").not("sku", "is", null)
      const existingSKUSet = new Set(existingSKUs?.map((item: any) => item.sku) || [])

      const batchSize = 5
      let imported = 0
      let errors = 0

      for (let i = 0; i < parsedData.length; i += batchSize) {
        const batch = parsedData.slice(i, i + batchSize)

        // Create insert data with guaranteed unique SKUs
        const insertData = batch.map((plant, batchIndex) => {
          let uniqueSKU = generateUniqueSKU(plant.plant_name, i + batchIndex)

          // Ensure SKU is truly unique
          while (existingSKUSet.has(uniqueSKU)) {
            uniqueSKU = generateUniqueSKU(plant.plant_name, i + batchIndex + Math.floor(Math.random() * 1000))
          }

          // Add to existing set to prevent duplicates within this batch
          existingSKUSet.add(uniqueSKU)

          // Determine if this should be a current plant (most recent 9 uploads)
          const globalIndex = existingCount + i + batchIndex
          const shouldBeCurrent = globalIndex < 9 // First 9 plants uploaded are current

          return {
            plant_name: plant.plant_name,
            scientific_name: plant.scientific_name || null,
            category: plant.category,
            quantity: plant.quantity,
            opening_quantity: plant.quantity,
            price: plant.price,
            batch_cost: plant.batch_cost || 0,
            cost_per_seedling: plant.batch_cost ? plant.batch_cost / plant.quantity : 0,
            status: plant.status,
            sku: uniqueSKU,
            item_type: "Plant",
            ready_for_sale: shouldBeCurrent, // Most recent 9 are current
            source: shouldBeCurrent ? "Current Nursery Stock" : "Future Plants List",
            age: shouldBeCurrent ? "6 months" : null,
            description: plant.description || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        })

        console.log(
          `Importing batch ${Math.floor(i / batchSize) + 1}:`,
          insertData.map((item) => ({ name: item.plant_name, sku: item.sku, current: item.ready_for_sale })),
        )

        const { data, error } = await supabase.from("inventory").insert(insertData).select()

        if (error) {
          console.error("Batch import error:", error)
          errors += batch.length

          // If it's still a duplicate key error, try individual inserts
          if (error.message.includes("duplicate key") || error.message.includes("unique constraint")) {
            console.log("Trying individual inserts for this batch...")

            for (const item of insertData) {
              try {
                // Generate a new unique SKU for retry
                let retrySKU = generateUniqueSKU(item.plant_name, Date.now())
                while (existingSKUSet.has(retrySKU)) {
                  retrySKU = generateUniqueSKU(item.plant_name, Date.now() + Math.floor(Math.random() * 10000))
                }
                existingSKUSet.add(retrySKU)

                const retryItem = { ...item, sku: retrySKU }
                const { error: retryError } = await supabase.from("inventory").insert([retryItem])

                if (!retryError) {
                  imported += 1
                  errors -= 1 // Subtract from errors since this one succeeded
                }
              } catch (retryErr) {
                console.error("Individual retry failed:", retryErr)
              }
            }
          }
        } else {
          imported += batch.length
          console.log(`Successfully imported batch: ${data?.length} items`)
        }

        // Update progress
        const progress = Math.min(((i + batchSize) / parsedData.length) * 100, 100)
        setImportProgress(progress)

        // Longer delay to prevent overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      setImportStatus("complete")

      const currentPlants = Math.min(imported, 9) // First 9 are current
      const futurePlants = Math.max(0, imported - 9) // Rest are future

      toast({
        title: "Bulk import completed",
        description: `Successfully imported ${imported} plants (${currentPlants} in nursery, ${futurePlants} future plans). ${errors > 0 ? `${errors} failed.` : ""}`,
        variant: errors > 0 ? "destructive" : "default",
      })

      // Call onSuccess callback if it exists and is a function
      if (imported > 0 && typeof onSuccess === "function") {
        try {
          onSuccess()
        } catch (callbackError) {
          console.error("Error calling onSuccess callback:", callbackError)
        }
      }

      // Reset form
      setFile(null)
      setParsedData([])
      setImportProgress(0)
    } catch (error) {
      console.error("Bulk import error:", error)
      toast({
        title: "Import failed",
        description: "An error occurred during bulk import",
        variant: "destructive",
      })
      setImportStatus("idle")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="ml-auto gap-1">
              <Upload className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:inline-block">Import Plants</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Import Plants</DialogTitle>
              <DialogDescription>Import multiple plants at once using CSV or manual entry</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="document">Or Upload Future Plants Document</Label>
                <Input id="document" type="file" accept=".doc,.docx,.txt" onChange={handleFileChange} disabled={loading} />
                <p className="text-sm text-muted-foreground">
                  Upload a document containing plants you plan to grow (will be marked as "Future Plans")
                </p>
              </div>

              {file && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{file.name}</span>
                </div>
              )}

              {parsedData.length > 0 && (
                <Button
                  onClick={handleBulkImport}
                  disabled={loading || parsedData.length === 0}
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  {importStatus === "importing" ? "Importing..." : `Import ${parsedData.length} Plants`}
                </Button>
              )}

              {importStatus === "importing" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Import Progress</span>
                    <span>{Math.round(importProgress)}%</span>
                  </div>
                  <Progress value={importProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground">Importing plants... First 9 will be marked as "In Nursery"</p>
                </div>
              )}

              {parsedData.length > 0 && importStatus !== "importing" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Ready to import {parsedData.length} plants</span>
                  </div>

                  <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-muted/50">
                    <div className="text-xs font-medium mb-2">Preview - Auto Status Assignment:</div>
                    {parsedData.slice(0, 5).map((plant, index) => (
                      <div key={index} className="text-xs py-2 border-b last:border-b-0">
                        <div className="flex justify-between items-center">
                          <span>
                            <strong>{plant.plant_name}</strong>
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            🌱 Will be in Nursery
                          </span>
                        </div>
                      </div>
                    ))}
                    {parsedData.length > 5 && (
                      <div className="text-xs text-muted-foreground mt-1">...and {parsedData.length - 5} more items</div>
                    )}
                  </div>
                </div>
              )}

              {importStatus === "complete" && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Import completed successfully!</span>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-2">
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="font-medium text-blue-900 mb-1">Smart Status Assignment:</p>
                  <div className="space-y-1 text-blue-800">
                    <p>• First 9 plants uploaded → "In Nursery" (ready for sale)</p>
                    <p>• Additional plants → "Future Plans" (planning stage)</p>
                    <p>• Click the arrow buttons to move plants between statuses</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-medium text-green-900 mb-2">Import Your 9 Current Plants</h3>
            <p className="text-sm text-green-700 mb-3">
              These {predefinedPlants.length} indigenous plants will be marked as currently in your nursery:
            </p>
            <ul className="text-sm text-green-700 mb-3 space-y-1">
              <li>• 100 seedlings each at Ksh 45</li>
              <li>• Marked as "In Nursery" status</li>
              <li>• Ready for website listing</li>
              <li>• Can be moved to "Future Plans" with one click</li>
            </ul>
            <Button onClick={handleLoadPredefinedData} className="bg-green-600 hover:bg-green-700" disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              Load Current Plants ({predefinedPlants.length} plants)
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document">Or Upload Future Plants Document</Label>
            <Input id="document" type="file" accept=".doc,.docx,.txt" onChange={handleFileChange} disabled={loading} />
            <p className="text-sm text-muted-foreground">
              Upload a document containing plants you plan to grow (will be marked as "Future Plans")
            </p>
          </div>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <FileText className="h-4 w-4" />
            <span className="text-sm">{file.name}</span>
          </div>
        )}

        {parsedData.length > 0 && (
          <Button
            onClick={handleBulkImport}
            disabled={loading || parsedData.length === 0}
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
          >
            {importStatus === "importing" ? "Importing..." : `Import ${parsedData.length} Plants`}
          </Button>
        )}

        {importStatus === "importing" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Import Progress</span>
              <span>{Math.round(importProgress)}%</span>
            </div>
            <Progress value={importProgress} className="w-full" />
            <p className="text-xs text-muted-foreground">Importing plants... First 9 will be marked as "In Nursery"</p>
          </div>
        )}

        {parsedData.length > 0 && importStatus !== "importing" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Ready to import {parsedData.length} plants</span>
            </div>

            <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-muted/50">
              <div className="text-xs font-medium mb-2">Preview - Auto Status Assignment:</div>
              {parsedData.slice(0, 5).map((plant, index) => (
                <div key={index} className="text-xs py-2 border-b last:border-b-0">
                  <div className="flex justify-between items-center">
                    <span>
                      <strong>{plant.plant_name}</strong>
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      🌱 Will be in Nursery
                    </span>
                  </div>
                </div>
              ))}
              {parsedData.length > 5 && (
                <div className="text-xs text-muted-foreground mt-1">...and {parsedData.length - 5} more items</div>
              )}
            </div>
          </div>
        )}

        {importStatus === "complete" && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Import completed successfully!</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-2">
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <p className="font-medium text-blue-900 mb-1">Smart Status Assignment:</p>
            <div className="space-y-1 text-blue-800">
              <p>• First 9 plants uploaded → "In Nursery" (ready for sale)</p>
              <p>• Additional plants → "Future Plans" (planning stage)</p>
              <p>• Click the arrow buttons to move plants between statuses</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}