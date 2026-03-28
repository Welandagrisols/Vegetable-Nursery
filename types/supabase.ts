export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      nurseries: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      inventory: {
        Row: {
          id: string
          plant_name: string
          scientific_name: string | null
          category: string
          quantity: number
          opening_quantity: number
          age: string | null
          date_planted: string | null
          status: string
          price: number
          sku: string
          section: string | null
          row: string | null
          source: string | null
          created_at: string
          updated_at: string
          batch_cost: number | null
          cost_per_seedling: number | null
          item_type: string | null
          unit: string | null
          image_url: string | null
          description: string | null
          ready_for_sale: boolean | null
          nursery_id: string
        }
        Insert: {
          id?: string
          plant_name: string
          scientific_name?: string | null
          category: string
          quantity?: number
          opening_quantity?: number
          age?: string | null
          date_planted?: string | null
          status?: string
          price?: number
          sku: string
          section?: string | null
          row?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
          batch_cost?: number | null
          cost_per_seedling?: number | null
          item_type?: string | null
          unit?: string | null
          image_url?: string | null
          description?: string | null
          ready_for_sale?: boolean | null
          nursery_id?: string
        }
        Update: {
          id?: string
          plant_name?: string
          scientific_name?: string | null
          category?: string
          quantity?: number
          opening_quantity?: number
          age?: string | null
          date_planted?: string | null
          status?: string
          price?: number
          sku?: string
          section?: string | null
          row?: string | null
          source?: string | null
          created_at?: string
          updated_at?: string
          batch_cost?: number | null
          cost_per_seedling?: number | null
          item_type?: string | null
          unit?: string | null
          image_url?: string | null
          description?: string | null
          ready_for_sale?: boolean | null
          nursery_id?: string
        }
      }
      impact_stories: {
        Row: {
          id: string
          title: string
          text: string
          media_urls: string[] | null
          category: 'water' | 'food_security' | 'beautification'
          display_order: number
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          text: string
          media_urls?: string[] | null
          category: 'water' | 'food_security' | 'beautification'
          display_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          text?: string
          media_urls?: string[] | null
          category?: 'water' | 'food_security' | 'beautification'
          display_order?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      water_source_gallery: {
        Row: {
          id: string
          spring_name: string | null
          media_url: string
          media_type: string
          story: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          spring_name?: string | null
          media_url: string
          media_type: string
          story?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          spring_name?: string | null
          media_url?: string
          media_type?: string
          story?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      green_champions_gallery: {
        Row: {
          id: string
          school_name: string | null
          media_url: string
          story: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_name?: string | null
          media_url: string
          story?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_name?: string | null
          media_url?: string
          story?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: string
          inventory_id: string
          quantity: number
          sale_date: string
          customer_id: string | null
          total_amount: number
          user_id: string | null
          nursery_id: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inventory_id: string
          quantity: number
          sale_date?: string
          customer_id?: string | null
          total_amount: number
          user_id?: string | null
          nursery_id?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          inventory_id?: string
          quantity?: number
          sale_date?: string
          customer_id?: string | null
          total_amount?: number
          user_id?: string | null
          nursery_id?: string
          created_by?: string | null
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          contact: string
          email: string | null
          user_id: string | null
          nursery_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          contact: string
          email?: string | null
          user_id?: string | null
          nursery_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact?: string
          email?: string | null
          user_id?: string | null
          nursery_id?: string
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          task_name: string
          task_type: string
          description: string | null
          task_date: string
          due_date: string | null
          batch_sku: string | null
          labor_cost: number | null
          labor_hours: number | null
          labor_rate: number | null
          consumables_cost: number | null
          total_cost: number | null
          status: string
          assigned_to: string | null
          completed: boolean | null
          nursery_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_name: string
          task_type?: string
          description?: string | null
          task_date?: string
          due_date?: string | null
          batch_sku?: string | null
          labor_cost?: number | null
          labor_hours?: number | null
          labor_rate?: number | null
          consumables_cost?: number | null
          status?: string
          assigned_to?: string | null
          completed?: boolean | null
          nursery_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_name?: string
          task_type?: string
          description?: string | null
          task_date?: string
          due_date?: string | null
          batch_sku?: string | null
          labor_cost?: number | null
          labor_hours?: number | null
          labor_rate?: number | null
          consumables_cost?: number | null
          status?: string
          assigned_to?: string | null
          completed?: boolean | null
          nursery_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      task_consumables: {
        Row: {
          id: string
          task_id: string
          consumable_sku: string
          consumable_name: string
          quantity_used: number
          unit: string
          unit_cost: number
          total_cost: number
          nursery_id: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          consumable_sku: string
          consumable_name: string
          quantity_used: number
          unit?: string
          unit_cost?: number
          nursery_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          consumable_sku?: string
          consumable_name?: string
          quantity_used?: number
          unit?: string
          unit_cost?: number
          nursery_id?: string
          created_at?: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          inventory_id: string
          quantity: number
          price_per_unit: number
          total_price: number
          nursery_id: string
          created_at: string
        }
        Insert: {
          id?: string
          sale_id: string
          inventory_id: string
          quantity?: number
          price_per_unit?: number
          total_price?: number
          nursery_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string
          inventory_id?: string
          quantity?: number
          price_per_unit?: number
          total_price?: number
          nursery_id?: string
          created_at?: string
        }
      }
      admin_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      process_sale: {
        Args: {
          p_inventory_id: string
          p_quantity: number
          p_sale_date: string
          p_customer_id?: string | null
          p_customer_name?: string | null
          p_customer_contact?: string | null
          p_customer_email?: string | null
          p_total_amount: number
        }
        Returns: {
          success: boolean
          sale_id?: string
          remaining_quantity?: number
          message?: string
        }
      }
      delete_sale_atomic: {
        Args: {
          p_sale_id: string
        }
        Returns: {
          success: boolean
          sale_id?: string
          message?: string
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}